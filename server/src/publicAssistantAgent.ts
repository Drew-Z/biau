import { createHash } from 'node:crypto'
import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { env } from './env.js'
import { createPublicAssistantModel } from './publicAssistantModel.js'
import type {
  PublicAssistantDraft,
  PublicAssistantEvidence,
  PublicAssistantModel,
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
}

const PublicAssistantAnnotation = Annotation.Root({
  request: Annotation<PublicAssistantRequest>,
  dependencies: Annotation<PublicAssistantAgentDependencies>,
  startedAt: Annotation<number>,
  inputBlocked: Annotation<boolean>,
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
}

export async function runPublicAssistantAgent(
  request: PublicAssistantRequest,
  dependencies: PublicAssistantAgentDependencies = defaultDependencies,
): Promise<ChatResponse> {
  const finalState = await compiledPublicAssistantGraph.invoke({
    request,
    dependencies,
    startedAt: Date.now(),
    inputBlocked: false,
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
  return finalState.response ?? buildFailedResponse(finalState)
}

export function normalizePublicAssistantPayload(payload: ChatPayload): PublicAssistantRequest | null {
  const question = boundedText(payload.message, 500)
  if (!question) return null
  return {
    question,
    mode: readMode(payload.mode),
    sessionId: readSessionId(payload.sessionId),
    pageContext: normalizePageContext(payload.pageContext),
    history: normalizeHistory(payload.history),
  }
}

async function inputGuardNode(state: PublicAssistantState) {
  emitProgress(state.request, 'planning')
  return { inputBlocked: isCredentialSeekingRequest(state.request.question) }
}

async function planNode(state: PublicAssistantState) {
  if (state.inputBlocked) {
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
  return {
    draft: await state.dependencies.model.answer({
      request: state.request,
      plan,
      evidence: state.evidence,
    }),
  }
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
      },
      ...(state.request.sessionId ? { sessionId: state.request.sessionId } : {}),
    } satisfies ChatResponse,
  }
}

const compiledPublicAssistantGraph = new StateGraph(PublicAssistantAnnotation)
  .addNode('input_guard', inputGuardNode)
  .addNode('plan', planNode)
  .addNode('research', researchNode)
  .addNode('grade_evidence', gradeEvidenceNode)
  .addNode('rewrite', rewriteNode)
  .addNode('generate', generateNode)
  .addNode('verify_claims', verifyNode)
  .addNode('finalize', finalizeNode)
  .addEdge(START, 'input_guard')
  .addEdge('input_guard', 'plan')
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
