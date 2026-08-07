import { createHash, randomUUID } from 'node:crypto'
import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { env } from './env.js'
import { recordPublicAssistantModelAttempt, recordPublicAssistantRun } from './metrics.js'
import { createPublicAssistantModel, shouldUseDirectPublicAssistantRoute } from './publicAssistantModel.js'
import {
  normalizePublicAssistantImageAttachment,
  understandPublicAssistantImage,
  type PublicAssistantImageToolResult,
} from './publicAssistantImage.js'
import { logPublicAssistantRecovery } from './publicAssistantRecoveryLog.js'
import type {
  PublicAssistantDraft,
  PublicAssistantEvidence,
  PublicAssistantModelAttemptTiming,
  PublicAssistantModel,
  PublicAssistantModelRetryRelation,
  PublicAssistantPlan,
  PublicAssistantRequest,
} from './publicAssistantRuntime.js'
import { researchPublicWeb, type PublicWebResearchResult } from './publicWebResearch.js'
import { retrievePublicAssistantContext } from './ragClient.js'
import type {
  AssistantRetrievalMeta,
  ChatPayload,
  ChatResponse,
  Citation,
  PublicAssistantHistoryTurn,
  PublicAssistantMode,
  PublicAssistantPageContext,
  RagChunkCitation,
} from './types.js'

interface SiteResearchResult {
  evidence: PublicAssistantEvidence[]
  retrieval?: AssistantRetrievalMeta
}

export interface PublicAssistantAgentDependencies {
  model: PublicAssistantModel
  retrieveSite(queries: string[]): Promise<SiteResearchResult>
  researchWeb(queries: string[], signal?: AbortSignal): Promise<PublicWebResearchResult>
  understandImage?(input: Parameters<typeof understandPublicAssistantImage>[0]): Promise<PublicAssistantImageToolResult>
  now?(): number
  sleep?(delayMs: number, signal?: AbortSignal): Promise<void>
}

const PublicAssistantAnnotation = Annotation.Root({
  request: Annotation<PublicAssistantRequest>,
  dependencies: Annotation<PublicAssistantAgentDependencies>,
  startedAt: Annotation<number>,
  inputBlocked: Annotation<boolean>,
  imageFailed: Annotation<boolean>,
  agentPlan: Annotation<PublicAssistantPlan | undefined>,
  evidence: Annotation<PublicAssistantEvidence[]>,
  retrieval: Annotation<AssistantRetrievalMeta | undefined>,
  searchAvailable: Annotation<boolean>,
  retryCount: Annotation<number>,
  shouldRetry: Annotation<boolean>,
  draft: Annotation<PublicAssistantDraft | undefined>,
  verificationPassed: Annotation<boolean>,
  response: Annotation<ChatResponse | undefined>,
})

type PublicAssistantState = typeof PublicAssistantAnnotation.State

const defaultDependencies: PublicAssistantAgentDependencies = {
  model: createPublicAssistantModel(),
  retrieveSite: retrieveSiteEvidence,
  researchWeb: researchPublicWeb,
  understandImage: understandPublicAssistantImage,
}

export async function runPublicAssistantAgent(
  request: PublicAssistantRequest,
  dependencies: PublicAssistantAgentDependencies = defaultDependencies,
): Promise<ChatResponse> {
  const finalState = await compiledPublicAssistantGraph.invoke({
    request,
    dependencies,
    startedAt: dependencies.now?.() ?? Date.now(),
    inputBlocked: false,
    imageFailed: false,
    agentPlan: undefined,
    evidence: [],
    retrieval: undefined,
    searchAvailable: true,
    retryCount: 0,
    shouldRetry: false,
    draft: undefined,
    verificationPassed: false,
    response: undefined,
  })
  const response = finalState.response ?? buildFailedResponse(finalState)
  recordPublicAssistantRun(response.meta?.research?.route ?? finalState.agentPlan?.route ?? 'direct', response.status ?? 'degraded')
  const recovery = finalState.draft?.recovery ?? response.meta?.recovery
  const failedAttempt = finalState.draft?.attempts?.findLast((attempt) => attempt.failureClass)
  logPublicAssistantRecovery({
    recovery,
    diagnostic: finalState.draft?.diagnostic,
    failureClass: failedAttempt?.failureClass === 'cancelled' || failedAttempt?.failureClass === 'policy'
      ? undefined
      : failedAttempt?.failureClass,
    durationMs: Math.max(0, (dependencies.now?.() ?? Date.now()) - finalState.startedAt),
  })
  return response
}

export function normalizePublicAssistantPayload(payload: ChatPayload): PublicAssistantRequest | null {
  const question = boundedText(payload.message, 500)
  const contractVersion = payload.contractVersion === 2 ? 2 : 1
  const requestId = readRequestId(payload.requestId) || (contractVersion === 1 ? randomUUID() : '')
  const intent = normalizeGenerationIntent(payload.intent, contractVersion)
  const attachment = payload.attachment === undefined
    ? undefined
    : normalizePublicAssistantImageAttachment(payload.attachment)
  if (!requestId || !question || !intent || (payload.attachment !== undefined && !attachment)) return null
  return {
    contractVersion,
    requestId,
    question,
    mode: readMode(payload.mode),
    sessionId: readSessionId(payload.sessionId) || `request-${requestId}`,
    pageContext: normalizePageContext(payload.pageContext),
    history: normalizeHistory(payload.history),
    intent,
    ...(attachment ? { attachment } : {}),
  }
}

async function inputGuardNode(state: PublicAssistantState) {
  emitProgress(state.request, 'planning')
  return { inputBlocked: isCredentialSeekingRequest(state.request.question) }
}

function routeAfterInputGuard(state: PublicAssistantState) {
  if (state.inputBlocked) return 'finalize'
  return state.request.attachment ? 'understand_image' : 'plan'
}

async function understandImageNode(state: PublicAssistantState) {
  const attachment = state.request.attachment
  if (!attachment) return { imageFailed: false }
  emitProgress(state.request, 'understanding_image')
  const remainingMs = Math.max(1_000, env.publicAssistantRequestTimeoutMs - (now(state) - state.startedAt) - 5_000)
  const result = state.dependencies.understandImage
    ? await state.dependencies.understandImage({
        attachment,
        question: state.request.question,
        timeoutMs: Math.min(env.publicAssistantVisionTimeoutMs, remainingMs),
        signal: state.request.signal,
      })
    : { status: 'unavailable' as const, failure: 'not_configured' as const }
  if (result.status === 'ready') {
    return {
      request: { ...state.request, imageObservation: result.observation },
      imageFailed: false,
    }
  }
  return {
    imageFailed: true,
    agentPlan: { route: 'direct', queries: [], requiresFreshness: false, planner: 'fallback' } satisfies PublicAssistantPlan,
    draft: buildImageUnavailableDraft(result),
    verificationPassed: true,
  }
}

function routeAfterImage(state: PublicAssistantState) {
  return state.imageFailed ? 'finalize' : 'plan'
}

async function planNode(state: PublicAssistantState) {
  if (state.inputBlocked) {
    return {
      agentPlan: { route: 'direct', queries: [], requiresFreshness: false, planner: 'fallback' } satisfies PublicAssistantPlan,
    }
  }
  if (shouldUseDirectPublicAssistantRoute(state.request)) {
    return {
      agentPlan: { route: 'direct', queries: [], requiresFreshness: false, planner: 'fallback' } satisfies PublicAssistantPlan,
    }
  }
  return { agentPlan: await state.dependencies.model.plan(state.request) }
}

function routeAfterPlan(state: PublicAssistantState) {
  if (state.inputBlocked) return 'finalize'
  return state.agentPlan?.route === 'direct' ? 'generate' : 'research'
}

async function researchNode(state: PublicAssistantState) {
  emitProgress(state.request, 'researching')
  const plan = state.agentPlan ?? fallbackPlan(state.request)
  const queries = plan.queries.length > 0 ? plan.queries : [state.request.question]
  const sitePromise = plan.route === 'site' || plan.route === 'combined'
    ? state.dependencies.retrieveSite(queries)
    : Promise.resolve({ evidence: [], retrieval: undefined } satisfies SiteResearchResult)
  const webPromise = plan.route === 'web' || plan.route === 'combined'
    ? state.dependencies.researchWeb(queries, state.request.signal)
    : Promise.resolve({ evidence: [], available: true } satisfies PublicWebResearchResult)
  const [site, web] = await Promise.all([sitePromise, webPromise])
  return {
    evidence: dedupeEvidence([...site.evidence, ...web.evidence]).slice(0, 12),
    retrieval: site.retrieval,
    searchAvailable: web.available,
  }
}

async function gradeEvidenceNode(state: PublicAssistantState) {
  emitProgress(state.request, 'evaluating')
  const plan = state.agentPlan ?? fallbackPlan(state.request)
  const siteCount = state.evidence.filter((item) => item.source === 'site').length
  const webCount = state.evidence.filter((item) => item.source === 'web').length
  const sufficient = plan.route === 'site'
    ? state.retrieval?.sufficient === true || siteCount >= 2
    : plan.route === 'web'
      ? webCount >= 1
      : siteCount >= 1 && webCount >= 1
  const unavailableForcedWeb = state.request.mode === 'web' && !state.searchAvailable
  return { shouldRetry: !sufficient && !unavailableForcedWeb && canRetryResearch(state) }
}

function routeAfterGrade(state: PublicAssistantState) {
  return state.shouldRetry ? 'rewrite' : 'generate'
}

async function rewriteNode(state: PublicAssistantState) {
  emitProgress(state.request, 'refining')
  const plan = state.agentPlan ?? fallbackPlan(state.request)
  const pageHint = state.request.pageContext?.title || state.request.pageContext?.path || ''
  const recovery = boundedText(`${state.request.question} ${pageHint} authoritative source current facts`, 180)
  return {
    agentPlan: {
      ...plan,
      queries: [...new Set([...plan.queries, recovery])].filter(Boolean).slice(-3),
      planner: plan.planner,
    },
    retryCount: state.retryCount + 1,
    shouldRetry: false,
  }
}

async function generateNode(state: PublicAssistantState) {
  emitProgress(state.request, 'answering')
  const plan = state.agentPlan ?? fallbackPlan(state.request)
  const attempts: PublicAssistantModelAttemptTiming[] = []
  let draft: PublicAssistantDraft | undefined
  for (let attempt = 1 as 1 | 2 | 3; attempt <= 3; attempt = (attempt + 1) as 1 | 2 | 3) {
    state.request.signal?.throwIfAborted()
    if (attempt > 1) {
      emitProgress(state.request, 'recovering')
      await sleepBeforeRetry(state, attempt as 2 | 3)
      if (!hasAttemptBudget(state)) break
    }
    const attemptStartedAt = now(state)
    let nextDraft: PublicAssistantDraft
    try {
      nextDraft = await state.dependencies.model.answer({
        request: state.request,
        plan,
        evidence: state.evidence,
        attempt,
        timeoutMs: remainingAttemptTimeoutMs(state, attempt),
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        recordPublicAssistantModelAttempt({
          outcome: 'cancelled',
          durationMs: Math.max(0, now(state) - attemptStartedAt),
        })
      }
      throw error
    }
    const reported = nextDraft.attempts?.[0]
    const failureClass = modelFailureClass(nextDraft)
    const timingFailureClass = reported?.failureClass ?? failureClass
    const timing: PublicAssistantModelAttemptTiming = {
      attempt,
      durationMs: reported?.durationMs ?? Math.max(0, now(state) - attemptStartedAt),
      ...(reported?.firstActivityMs === undefined ? {} : { firstActivityMs: reported.firstActivityMs }),
      ...(timingFailureClass ? { failureClass: timingFailureClass } : {}),
    }
    recordPublicAssistantModelAttempt({
      outcome: nextDraft.failure ? 'failure' : 'success',
      ...(failureClass ? { failureClass } : {}),
      durationMs: timing.durationMs,
      ...(timing.firstActivityMs === undefined ? {} : { firstActivityMs: timing.firstActivityMs }),
    })
    attempts.push(timing)
    draft = { ...nextDraft, attempts: [...attempts] }
    const nextRelation = state.dependencies.model.nextAttemptRelation?.(attempt, state.request) ?? 'same-channel'
    if (!isRetryableModelDraft(nextDraft, nextRelation) || attempt === 3 || !hasRetryBudget(state, attempt)) break
  }
  if (!draft) {
    draft = buildBudgetExhaustedDraft(state, plan)
  }
  const finalAttempts = Math.max(1, Math.min(3, draft.attempts?.length ?? 1)) as 1 | 2 | 3
  const failureClass = modelFailureClass(draft)
  return {
    draft: {
      ...draft,
      recovery: draft.failure
        ? { state: 'degraded', attempts: finalAttempts, ...(failureClass ? { failureClass } : {}) }
        : finalAttempts > 1
          ? { state: 'recovered', attempts: finalAttempts }
          : { state: 'none', attempts: 1 },
    },
  }
}

function isRetryableModelDraft(draft: PublicAssistantDraft, relation: PublicAssistantModelRetryRelation | null) {
  if (!relation) return false
  const reportedFailure = draft.attempts?.at(-1)?.failureClass
  if (reportedFailure === 'cancelled' || reportedFailure === 'policy') return false
  if (draft.failure === 'not_configured') return relation === 'independent'
  if (draft.failure === 'empty_response' || draft.failure === 'invalid_response') return true
  if (draft.failure !== 'provider_error') return false
  if (draft.diagnostic?.kind === 'http_status') {
    const status = draft.diagnostic.httpStatus ?? 0
    if (status === 400 || status === 422) return relation === 'same-failure-domain'
    if (status === 409 || status === 413) return false
    if (status === 401 || status === 403) return relation === 'independent'
    if (status === 404 || status === 405) return relation !== 'same-channel'
    return (status > 0 && status < 400) || status === 408 || status === 425 || status === 429 || status >= 500
  }
  if (draft.diagnostic?.kind === 'timeout' || draft.diagnostic?.kind === 'network_error') {
    return relation !== 'same-failure-domain'
  }
  return !draft.diagnostic
}

function hasRetryBudget(state: PublicAssistantState, attempt: 1 | 2 | 3) {
  if (attempt >= 3) return false
  const delayMs = retryDelayMs(attempt + 1 as 2 | 3)
  return remainingBudgetMs(state) - delayMs >= minimumAttemptBudgetMs()
}

function hasAttemptBudget(state: PublicAssistantState) {
  return remainingBudgetMs(state) >= minimumAttemptBudgetMs()
}

function remainingAttemptTimeoutMs(state: PublicAssistantState, attempt: 1 | 2 | 3) {
  const remainingMs = remainingBudgetMs(state)
  if (!state.dependencies.model.hasIndependentFallback?.(state.request)) {
    return Math.max(1, Math.min(env.publicAssistantAnswerTimeoutMs, remainingMs))
  }
  const futureAttempts = 3 - attempt
  const futureAttemptBudgetMs = futureAttempts * minimumAttemptBudgetMs()
  const futureBackoffMs = attempt === 1 ? retryDelayMs(2) + retryDelayMs(3) : attempt === 2 ? retryDelayMs(3) : 0
  return Math.max(1, Math.min(env.publicAssistantAnswerTimeoutMs, remainingMs - futureAttemptBudgetMs - futureBackoffMs))
}

function minimumAttemptBudgetMs() {
  return Math.min(5_000, env.publicAssistantAnswerTimeoutMs)
}

function remainingBudgetMs(state: PublicAssistantState) {
  return Math.max(0, state.startedAt + env.publicAssistantRequestTimeoutMs - now(state))
}

function now(state: PublicAssistantState) {
  return state.dependencies.now?.() ?? Date.now()
}

async function sleepBeforeRetry(state: PublicAssistantState, attempt: 2 | 3) {
  const delayMs = retryDelayMs(attempt)
  if (state.dependencies.sleep) return state.dependencies.sleep(delayMs, state.request.signal)
  await abortableDelay(delayMs, state.request.signal)
}

function retryDelayMs(attempt: 2 | 3) {
  return attempt === 2 ? 200 : 400
}

function abortableDelay(delayMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted()
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)
    const onAbort = () => {
      clearTimeout(timeout)
      reject(signal?.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function buildBudgetExhaustedDraft(state: PublicAssistantState, plan: PublicAssistantPlan): PublicAssistantDraft {
  return {
    answer: plan.route === 'direct'
      ? '当前模型暂时无法完成这次回答，请稍后重试。'
      : '回答服务在本次时限内未能完成，我不会补造结论。请稍后重试。',
    status: 'degraded',
    claims: [],
    suggestions: [],
    model: 'fallback',
    provider: 'local',
    failure: 'provider_error',
    attempts: [{ attempt: 1, durationMs: Math.max(0, now(state) - state.startedAt), failureClass: 'timeout' }],
  }
}

function modelFailureClass(draft: PublicAssistantDraft) {
  const reported = draft.attempts?.at(-1)?.failureClass
  if (reported && reported !== 'cancelled' && reported !== 'policy') return reported
  if (draft.failure === 'not_configured') return 'not_configured' as const
  if (draft.failure === 'empty_response') return 'empty' as const
  if (draft.failure === 'invalid_response') return 'invalid' as const
  if (draft.diagnostic?.kind === 'timeout') return 'timeout' as const
  if (draft.diagnostic?.kind === 'network_error') return 'network' as const
  if (draft.failure === 'provider_error') return 'upstream' as const
  return undefined
}

async function verifyNode(state: PublicAssistantState) {
  emitProgress(state.request, 'verifying')
  const plan = state.agentPlan ?? fallbackPlan(state.request)
  const verificationPassed = verifyDraft(state.draft, plan, state.evidence)
  return {
    verificationPassed,
    shouldRetry:
      !verificationPassed &&
      plan.route !== 'direct' &&
      canRetryResearch(state) &&
      !(state.request.mode === 'web' && !state.searchAvailable),
  }
}

function canRetryResearch(state: PublicAssistantState) {
  const elapsedMs = Math.max(0, Date.now() - state.startedAt)
  return state.retryCount < 1 && elapsedMs < Math.max(1_000, Math.floor(env.publicAssistantRequestTimeoutMs * 0.25))
}

function routeAfterVerify(state: PublicAssistantState) {
  return state.shouldRetry ? 'rewrite' : 'finalize'
}

function buildImageUnavailableDraft(
  result: Extract<PublicAssistantImageToolResult, { status: 'unavailable' }>,
): PublicAssistantDraft {
  const failureClass = result.failure === 'not_configured'
    ? 'not_configured'
    : result.failure === 'empty_response'
      ? 'empty'
      : result.failure === 'invalid_response'
        ? 'invalid'
        : result.diagnostic?.kind === 'timeout'
          ? 'timeout'
          : result.diagnostic?.kind === 'network_error'
            ? 'network'
            : 'upstream'
  return {
    answer: '这张图片暂时没有解析成功。为了避免看图猜测，我没有继续生成结论；可以保留问题并稍后重试，或移除图片后改用文字描述。',
    status: 'degraded',
    claims: [],
    suggestions: [],
    model: 'vision-tool',
    provider: 'local',
    failure: result.failure,
    ...(result.diagnostic ? { diagnostic: result.diagnostic } : {}),
    attempts: [{ attempt: 1, durationMs: 0, failureClass }],
    recovery: { state: 'degraded', attempts: 1, failureClass },
  }
}

async function finalizeNode(state: PublicAssistantState) {
  if (state.inputBlocked) {
    return { response: buildBlockedResponse(state) }
  }
  const plan = state.agentPlan ?? fallbackPlan(state.request)
  const draft = state.verificationPassed && state.draft
    ? state.draft
    : buildUncertainDraft(state)
  const citedIds = new Set(draft.claims.flatMap((claim) => claim.citationIds))
  const citations = state.evidence
    .filter((item) => citedIds.has(item.id))
    .map((item) => item.citation)
    .slice(0, 8)
  const siteEvidenceCount = state.evidence.filter((item) => item.source === 'site').length
  const webEvidenceCount = state.evidence.filter((item) => item.source === 'web').length
  const durationMs = Math.max(0, Date.now() - state.startedAt)
  return {
    response: {
      answer: draft.answer,
      status: draft.status,
      claims: draft.claims,
      citations,
      suggestions: draft.suggestions,
      meta: {
        mode: draft.failure ? 'fallback' : 'model',
        model: draft.model,
        provider: draft.provider,
        reason: mapFailureReason(draft.failure),
        diagnostic: draft.diagnostic,
        modelChannel: draft.modelChannel,
        citationCount: citations.length,
        retrieval: state.retrieval,
        research: {
          requestedMode: state.request.mode,
          route: plan.route,
          status: draft.status,
          evidenceCount: state.evidence.length,
          siteEvidenceCount,
          webEvidenceCount,
          retryCount: state.retryCount,
          searchAvailable: state.searchAvailable,
          rerankerMode: readRerankerMode(state.retrieval),
          durationMs,
        },
        ...(draft.recovery ? { recovery: draft.recovery } : {}),
      },
      ...(state.request.sessionId ? { sessionId: state.request.sessionId } : {}),
    } satisfies ChatResponse,
  }
}

const compiledPublicAssistantGraph = new StateGraph(PublicAssistantAnnotation)
  .addNode('input_guard', inputGuardNode)
  .addNode('understand_image', understandImageNode)
  .addNode('plan', planNode)
  .addNode('research', researchNode)
  .addNode('grade_evidence', gradeEvidenceNode)
  .addNode('rewrite', rewriteNode)
  .addNode('generate', generateNode)
  .addNode('verify_claims', verifyNode)
  .addNode('finalize', finalizeNode)
  .addEdge(START, 'input_guard')
  .addConditionalEdges('input_guard', routeAfterInputGuard, {
    understand_image: 'understand_image',
    plan: 'plan',
    finalize: 'finalize',
  })
  .addConditionalEdges('understand_image', routeAfterImage, {
    plan: 'plan',
    finalize: 'finalize',
  })
  .addConditionalEdges('plan', routeAfterPlan, {
    research: 'research',
    generate: 'generate',
    finalize: 'finalize',
  })
  .addEdge('research', 'grade_evidence')
  .addConditionalEdges('grade_evidence', routeAfterGrade, {
    rewrite: 'rewrite',
    generate: 'generate',
  })
  .addEdge('rewrite', 'research')
  .addEdge('generate', 'verify_claims')
  .addConditionalEdges('verify_claims', routeAfterVerify, {
    rewrite: 'rewrite',
    finalize: 'finalize',
  })
  .addEdge('finalize', END)
  .compile()

async function retrieveSiteEvidence(queries: string[]): Promise<SiteResearchResult> {
  const contexts = await Promise.all(queries.slice(0, 2).map((query) => retrievePublicAssistantContext(query)))
  const evidence: PublicAssistantEvidence[] = []
  for (const context of contexts) {
    const citations = new Map(context.citations.map((citation) => [citation.id, citation]))
    for (const chunk of context.chunks) {
      const citation = citations.get(chunk.documentId)
      if (!citation) continue
      evidence.push(siteChunkEvidence(citation, chunk))
    }
    if (context.chunks.length === 0) {
      for (const citation of context.citations) {
        evidence.push(siteCitationEvidence(citation))
      }
    }
  }
  const retrieval = contexts.map((context) => context.retrieval).sort((a, b) => Number(b.sufficient) - Number(a.sufficient))[0]
  return { evidence: dedupeEvidence(evidence), retrieval }
}

function siteChunkEvidence(citation: Citation, chunk: RagChunkCitation): PublicAssistantEvidence {
  const id = `site:${chunk.id}`
  const excerpt = boundedText(chunk.text, 900)
  return {
    id,
    source: 'site',
    title: citation.title,
    canonicalUrl: citation.href,
    section: chunk.section,
    excerpt,
    text: chunk.text,
    publishedAt: null,
    score: chunk.score,
    citation: {
      ...citation,
      id,
      source: 'site',
      canonicalUrl: citation.href,
      section: chunk.section,
      excerpt,
      publishedAt: null,
      evidenceStatus: 'verified',
      visibility: 'public',
    },
  }
}

function siteCitationEvidence(citation: Citation): PublicAssistantEvidence {
  const id = `site:${createHash('sha256').update(citation.id).digest('hex').slice(0, 20)}`
  const excerpt = boundedText(citation.summary, 900)
  return {
    id,
    source: 'site',
    title: citation.title,
    canonicalUrl: citation.href,
    section: '摘要',
    excerpt,
    text: citation.summary,
    publishedAt: null,
    score: 0.5,
    citation: {
      ...citation,
      id,
      source: 'site',
      canonicalUrl: citation.href,
      section: '摘要',
      excerpt,
      publishedAt: null,
      evidenceStatus: 'partial',
      visibility: 'public',
    },
  }
}

function verifyDraft(draft: PublicAssistantDraft | undefined, plan: PublicAssistantPlan, evidence: PublicAssistantEvidence[]) {
  if (!draft || !draft.answer.trim() || hasSensitiveOutput(draft.answer)) return false
  if (plan.route === 'direct') return draft.claims.length === 0
  if (draft.claims.length === 0) return draft.status === 'uncertain' && evidence.length === 0
  const available = new Set(evidence.map((item) => item.id))
  return draft.claims.every((claim) => claim.text.trim() && claim.citationIds.length > 0 && claim.citationIds.every((id) => available.has(id)))
}

function buildUncertainDraft(state: PublicAssistantState): PublicAssistantDraft {
  const draft = state.draft
  return {
    answer: '现有公开证据不足以可靠回答这个问题，我不会用没有来源的内容补齐结论。请缩小问题范围，或切换“本站 / 全网”模式后重试。',
    status: 'uncertain',
    claims: [],
    suggestions: ['换一个更具体的问题', '仅搜索本站', '使用全网研究'],
    model: draft?.model ?? 'fallback',
    provider: draft?.provider ?? 'local',
    modelChannel: draft?.modelChannel,
    diagnostic: draft?.diagnostic,
    failure: draft?.failure ?? 'invalid_response',
    attempts: draft?.attempts,
    recovery: draft?.recovery,
  }
}

function buildBlockedResponse(state: PublicAssistantState): ChatResponse {
  return {
    answer: '我不能帮助获取或披露密码、API key、token、数据库连接、私有地址或内部配置。可以改问公开演示入口、项目能力或部署时如何安全设置环境变量。',
    status: 'blocked',
    claims: [],
    citations: [],
    suggestions: ['查看公开项目能力', '了解安全配置原则'],
    meta: {
      mode: 'fallback',
      model: 'policy-guard',
      provider: 'local',
      reason: 'policy_blocked',
      citationCount: 0,
      research: {
        requestedMode: state.request.mode,
        route: 'direct',
        status: 'blocked',
        evidenceCount: 0,
        siteEvidenceCount: 0,
        webEvidenceCount: 0,
        retryCount: 0,
        searchAvailable: state.searchAvailable,
        durationMs: Math.max(0, Date.now() - state.startedAt),
      },
    },
  }
}

function buildFailedResponse(state: PublicAssistantState): ChatResponse {
  return {
    answer: '助手暂时无法完成这次请求，请稍后重试。',
    status: 'degraded',
    claims: [],
    citations: [],
    suggestions: [],
    meta: {
      mode: 'fallback',
      model: 'fallback',
      provider: 'local',
      reason: 'tool_error',
      citationCount: 0,
      research: {
        requestedMode: state.request.mode,
        route: state.agentPlan?.route ?? 'direct',
        status: 'degraded',
        evidenceCount: state.evidence.length,
        siteEvidenceCount: state.evidence.filter((item) => item.source === 'site').length,
        webEvidenceCount: state.evidence.filter((item) => item.source === 'web').length,
        retryCount: state.retryCount,
        searchAvailable: state.searchAvailable,
        durationMs: Math.max(0, Date.now() - state.startedAt),
      },
    },
  }
}

function fallbackPlan(request: PublicAssistantRequest): PublicAssistantPlan {
  return { route: request.mode === 'web' ? 'web' : 'site', queries: [request.question], requiresFreshness: request.mode === 'web', planner: 'fallback' }
}

function dedupeEvidence(evidence: PublicAssistantEvidence[]) {
  const byId = new Map<string, PublicAssistantEvidence>()
  for (const item of evidence) {
    const current = byId.get(item.id)
    if (!current || item.score > current.score) byId.set(item.id, item)
  }
  return [...byId.values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
}

function normalizeHistory(value: unknown): PublicAssistantHistoryTurn[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (!isRecord(item) || (item.role !== 'user' && item.role !== 'assistant')) return null
    const content = boundedText(item.content, 800)
    return content ? { role: item.role, content } : null
  }).filter((item): item is PublicAssistantHistoryTurn => item !== null).slice(-6)
}

function normalizePageContext(value: unknown): PublicAssistantPageContext | undefined {
  if (!isRecord(value)) return undefined
  const path = boundedText(value.path, 240)
  if (!path.startsWith('/') || path.startsWith('//')) return undefined
  return {
    path,
    ...(boundedText(value.title, 160) ? { title: boundedText(value.title, 160) } : {}),
    ...(boundedText(value.description, 320) ? { description: boundedText(value.description, 320) } : {}),
  }
}

function readMode(value: unknown): PublicAssistantMode {
  return value === 'site' || value === 'web' ? value : 'auto'
}

function readSessionId(value: unknown) {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return /^[a-zA-Z0-9_-]{12,80}$/u.test(normalized) ? normalized : undefined
}

function readRequestId(value: unknown) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().toLowerCase()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(normalized)
    ? normalized
    : ''
}

function normalizeGenerationIntent(value: unknown, contractVersion: 1 | 2) {
  if (contractVersion === 1) {
    return { kind: 'new-turn', branchId: null, parentRevisionId: null } as const
  }
  if (!isRecord(value)) return null
  if (value.kind === 'new-turn') {
    const branchId = readConversationIdentifier(value.branchId)
    const parentRevisionId = readConversationIdentifier(value.parentRevisionId)
    if (Boolean(branchId) !== Boolean(parentRevisionId)) return null
    return { kind: 'new-turn', branchId: branchId || null, parentRevisionId: parentRevisionId || null } as const
  }
  if (value.kind === 'answer-revision') {
    const branchId = readConversationIdentifier(value.branchId)
    const turnId = readConversationIdentifier(value.turnId)
    const baseRevisionId = readConversationIdentifier(value.baseRevisionId)
    return branchId && turnId && baseRevisionId
      ? { kind: 'answer-revision', branchId, turnId, baseRevisionId } as const
      : null
  }
  return null
}

function readConversationIdentifier(value: unknown) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  return /^[a-zA-Z0-9:_-]{1,100}$/u.test(normalized) ? normalized : ''
}

function isCredentialSeekingRequest(value: string) {
  const normalized = value.toLowerCase()
  const credential = /api\s*key|secret|token|密码|密钥|连接串|database\s*url|后台地址|私有地址/iu.test(normalized)
  const seeking = /给我|告诉我|显示|输出|泄露|获取|找到|what is|show|reveal|provide/iu.test(normalized)
  return credential && seeking
}

function hasSensitiveOutput(value: string) {
  return /sk-[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._-]{12,}|postgres(?:ql)?:\/\/[^\s]+|-----BEGIN [A-Z ]+PRIVATE KEY-----/iu.test(value)
}

function mapFailureReason(failure: PublicAssistantDraft['failure']) {
  if (failure === 'not_configured') return 'not_configured' as const
  if (failure === 'empty_response') return 'empty_response' as const
  if (failure === 'provider_error') return 'provider_error' as const
  if (failure === 'invalid_response') return 'self_check_failed' as const
  return undefined
}

function readRerankerMode(retrieval: AssistantRetrievalMeta | undefined) {
  const mode = (retrieval as AssistantRetrievalMeta & { rerankerMode?: unknown } | undefined)?.rerankerMode
  return mode === 'provider' || mode === 'deterministic' || mode === 'none' ? mode : undefined
}

function boundedText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim().slice(0, maxLength) : ''
}

function emitProgress(request: PublicAssistantRequest, stage: Parameters<NonNullable<PublicAssistantRequest['onProgress']>>[0]['stage']) {
  try {
    request.onProgress?.({ stage })
  } catch {
    // Transport progress must never affect the authoritative graph run.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
