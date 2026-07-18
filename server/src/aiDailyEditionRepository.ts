import {
  Prisma,
  type AiDailyGeneratedApplyState,
  type AiDailyGeneratedValidationStatus,
  type PrismaClient,
} from '@prisma/client'
import {
  evaluateAiDailyGeneratedApplyTransition,
  evaluateAiDailyGeneratedValidationTransition,
  normalizeAiDailyCitationSnapshotV2,
} from './aiDailyDomain.js'

export interface AiDailyEditableClaimBlock {
  text: string
  claimIds: string[]
}

export interface AiDailyEditableEvent {
  eventId: string
  title: string
  factSummary: AiDailyEditableClaimBlock
  whyItMatters: AiDailyEditableClaimBlock
  uncertainty: 'low' | 'medium' | 'high'
  claimIds: string[]
}

export interface AiDailyEditableContent {
  title: string
  subtitle: string
  introduction: AiDailyEditableClaimBlock
  events: AiDailyEditableEvent[]
  trends: AiDailyEditableClaimBlock[]
}

export interface CreateAiDailyGeneratedCorrectionInput {
  issueId: string
  sourceRevisionId: string
  expectedRevisionNumber: number
  expectedIssueUpdatedAt: Date
  content: AiDailyEditableContent
  actor: string
  reason?: string
  idempotencyKey: string
  now?: Date
}

export interface RevalidateAiDailyGeneratedRevisionInput {
  issueId: string
  revisionId: string
  expectedRevisionNumber: number
  expectedIssueUpdatedAt: Date
  actor: string
  now?: Date
}

export interface ApplyAiDailyGeneratedRevisionInput {
  issueId: string
  revisionId: string
  expectedRevisionNumber: number
  expectedIssueUpdatedAt: Date
  expectedDraftUpdatedAt?: Date
  actor: string
  now?: Date
}

export interface DiscardAiDailyGeneratedRevisionInput {
  issueId: string
  revisionId: string
  expectedRevisionNumber: number
  expectedIssueUpdatedAt: Date
  actor: string
  reason?: string
  now?: Date
}

export function readAiDailyEditableContent(value: unknown): AiDailyEditableContent | null {
  if (!isRecord(value)) return null
  const title = readText(value.title, 240)
  const subtitle = readText(value.subtitle, 600)
  const introduction = readClaimBlock(value.introduction)
  const events = Array.isArray(value.events)
    ? value.events.map(readEvent).filter((item): item is AiDailyEditableEvent => item !== null).slice(0, 12)
    : []
  const trends = Array.isArray(value.trends)
    ? value.trends.map(readClaimBlock).filter((item): item is AiDailyEditableClaimBlock => item !== null).slice(0, 12)
    : []
  if (!title || !introduction || events.length === 0) return null
  return { title, subtitle, introduction, events, trends }
}

export function summarizeAiDailyEditableContent(value: Prisma.JsonValue): AiDailyEditableContent | null {
  if (!isRecord(value)) return null
  const record = value as Record<string, unknown>
  const composition = isRecord(record.composition) ? record.composition : record
  return readAiDailyEditableContent(composition)
}

export async function createAiDailyGeneratedCorrection(
  prisma: PrismaClient,
  input: CreateAiDailyGeneratedCorrectionInput,
) {
  return prisma.$transaction(async (tx) => {
    const issue = await lockIssue(tx, input.issueId)
    const generationKey = `editor-correction:${issue.id}:${input.sourceRevisionId}:${input.idempotencyKey}`
    const existing = await tx.aiDailyGeneratedRevision.findUnique({ where: { generationKey } })
    if (existing) {
      if (existing.issueId !== issue.id || existing.sourceRevisionId !== input.sourceRevisionId) {
        throw new Error('ai-daily-generated-revision-conflict')
      }
      return { revision: existing, reused: true }
    }
    assertExpectedTimestamp(issue.updatedAt, input.expectedIssueUpdatedAt)
    const source = await tx.aiDailyGeneratedRevision.findUnique({ where: { id: input.sourceRevisionId } })
    if (!source || source.issueId !== issue.id) throw new Error('ai-daily-generated-revision-not-found')
    if (source.revisionNumber !== input.expectedRevisionNumber) throw new Error('ai-daily-generated-revision-conflict')
    if (source.applyState !== 'PENDING' && source.applyState !== 'BLOCKED') {
      throw new Error('invalid-ai-daily-generated-apply-transition')
    }
    if (source.selectionVersion !== issue.selectionVersion || source.evidenceVersion !== issue.selectedEvidenceVersion) {
      throw new Error('ai-daily-generated-revision-stale-evidence')
    }
    const sourceContent = isRecord(source.contentJson) ? source.contentJson as Record<string, unknown> : {}
    const contentJson = buildContentJson(input.content, sourceContent)
    const sequence = await tx.aiDailyIssue.update({
      where: { id: issue.id },
      data: { generatedRevisionSequence: { increment: 1 } },
      select: { generatedRevisionSequence: true },
    })
    const revision = await tx.aiDailyGeneratedRevision.create({
      data: {
         generationKey,
        issueId: issue.id,
        revisionNumber: sequence.generatedRevisionSequence,
        selectionVersion: issue.selectionVersion,
        evidenceVersion: issue.selectedEvidenceVersion,
        contentJson,
        sourceBindingsJson: source.sourceBindingsJson === null ? {} : source.sourceBindingsJson as Prisma.InputJsonValue,
        citationSnapshotsJson: source.citationSnapshotsJson === null ? [] : source.citationSnapshotsJson as Prisma.InputJsonValue,
        citationSchemaVersion: source.citationSchemaVersion,
        promptVersion: 'editor-correction-v1',
        schemaVersion: source.schemaVersion,
        modelRole: 'editor',
        modelIdentifier: 'manual-editor',
        revisionKind: 'EDITOR_CORRECTION',
        sourceRevisionId: source.id,
        observedDraftUpdatedAt: issue.draftId
          ? (await tx.contentDraft.findUnique({ where: { id: issue.draftId }, select: { updatedAt: true } }))?.updatedAt ?? null
          : null,
        projectionDraftId: issue.draftId,
        applyState: 'PENDING',
        validationStatus: 'NEEDS_EDITOR_REVIEW',
        validationFindingsJson: [{ severity: 'review', code: 'editor-correction-requires-revalidation' }],
        createdBy: input.actor,
      },
    })
    await tx.aiDailyIssue.update({
      where: { id: issue.id },
      data: { latestGeneratedRevisionId: revision.id, status: 'REVIEW_NEEDED', workflowState: 'REVIEW_NEEDED', newEvidenceAvailable: true },
    })
    return { revision, reused: false }
  })
}

export async function revalidateAiDailyGeneratedRevision(
  prisma: PrismaClient,
  input: RevalidateAiDailyGeneratedRevisionInput,
) {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const issue = await lockIssue(tx, input.issueId)
    assertExpectedTimestamp(issue.updatedAt, input.expectedIssueUpdatedAt)
    const revision = await tx.aiDailyGeneratedRevision.findUnique({ where: { id: input.revisionId } })
    assertRevisionBelongs(revision, issue.id, input.expectedRevisionNumber)
    if (revision.applyState === 'APPLIED' || revision.applyState === 'DISCARDED') {
      throw new Error('invalid-ai-daily-generated-apply-transition')
    }
    const result = validateStoredRevision(revision.contentJson, revision.citationSnapshotsJson)
    const transition = evaluateAiDailyGeneratedValidationTransition(revision.validationStatus, result.status)
    if (!transition.ok) throw new Error(transition.error)
    const updated = await tx.aiDailyGeneratedRevision.update({
      where: { id: revision.id },
      data: {
        validationStatus: result.status,
        validationFindingsJson: result.findings,
        revalidatedAt: now,
        validatedBy: input.actor,
        ...(result.status === 'REJECTED'
          ? { applyState: 'DISCARDED', discardedAt: now, discardedBy: input.actor, discardReason: 'deterministic-revalidation-rejected' }
          : {}),
      },
    })
    await syncIssueAfterGeneratedRevisionMutation(tx, issue)
    return { revision: updated, findings: result.findings }
  })
}

export async function applyAiDailyGeneratedRevision(
  prisma: PrismaClient,
  input: ApplyAiDailyGeneratedRevisionInput,
) {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const issue = await lockIssue(tx, input.issueId)
    assertExpectedTimestamp(issue.updatedAt, input.expectedIssueUpdatedAt)
    const revision = await tx.aiDailyGeneratedRevision.findUnique({ where: { id: input.revisionId } })
    assertRevisionBelongs(revision, issue.id, input.expectedRevisionNumber)
    if (revision.validationStatus !== 'VALID') throw new Error('ai-daily-generated-revision-not-valid')
    if (revision.applyState !== 'PENDING' && revision.applyState !== 'BLOCKED') {
      throw new Error('invalid-ai-daily-generated-apply-transition')
    }
    const content = summarizeAiDailyEditableContent(revision.contentJson)
    if (!content) throw new Error('ai-daily-generated-revision-content-invalid')
    const snapshots = readJsonArray(revision.citationSnapshotsJson)
    let draft = issue.draftId ? await tx.contentDraft.findUnique({ where: { id: issue.draftId } }) : null
    if (draft && (draft.status === 'PUBLISHED' || draft.status === 'ARCHIVED')) throw new Error('ai-daily-generated-revision-draft-protected')
    if (draft) {
      if (!revision.observedDraftUpdatedAt || !input.expectedDraftUpdatedAt || draft.updatedAt.getTime() !== input.expectedDraftUpdatedAt.getTime() || draft.updatedAt.getTime() !== revision.observedDraftUpdatedAt.getTime()) {
        await tx.aiDailyGeneratedRevision.update({ where: { id: revision.id }, data: { applyState: 'BLOCKED' } })
        await tx.aiDailyIssue.update({ where: { id: issue.id }, data: { newEvidenceAvailable: true } })
        return { revision: await tx.aiDailyGeneratedRevision.findUniqueOrThrow({ where: { id: revision.id } }), draft, blocked: true }
      }
      const transition = evaluateAiDailyGeneratedApplyTransition(revision.applyState, 'APPLIED')
      if (!transition.ok) throw new Error(transition.error)
      draft = await tx.contentDraft.update({
        where: { id: draft.id },
        data: buildDraftUpdate(content, snapshots, input.actor),
      })
      await tx.contentReview.create({
        data: { draftId: draft.id, status: 'PENDING', checklistJson: { sourceChecked: false, safetyChecked: false, publicReady: false }, notes: 'Generated revision explicitly applied by editor; review must restart.' },
      })
    } else {
      draft = await tx.contentDraft.create({ data: buildDraftCreate(issue.date, content, snapshots, input.actor) })
      await tx.contentReview.create({
        data: { draftId: draft.id, status: 'PENDING', checklistJson: { sourceChecked: false, safetyChecked: false, publicReady: false }, notes: 'Generated revision explicitly applied by editor; review is required.' },
      })
    }
    const applied = await tx.aiDailyGeneratedRevision.update({
      where: { id: revision.id },
      data: { applyState: 'APPLIED', appliedAt: now, projectionDraftId: draft.id },
    })
    await syncIssueAfterGeneratedRevisionMutation(tx, issue, draft.id)
    return { revision: applied, draft, blocked: false }
  })
}

export async function discardAiDailyGeneratedRevision(
  prisma: PrismaClient,
  input: DiscardAiDailyGeneratedRevisionInput,
) {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const issue = await lockIssue(tx, input.issueId)
    assertExpectedTimestamp(issue.updatedAt, input.expectedIssueUpdatedAt)
    const revision = await tx.aiDailyGeneratedRevision.findUnique({ where: { id: input.revisionId } })
    assertRevisionBelongs(revision, issue.id, input.expectedRevisionNumber)
    const transition = evaluateAiDailyGeneratedApplyTransition(revision.applyState, 'DISCARDED')
    if (!transition.ok) throw new Error(transition.error)
    const discarded = await tx.aiDailyGeneratedRevision.update({
      where: { id: revision.id },
      data: { applyState: 'DISCARDED', discardedAt: now, discardedBy: input.actor, discardReason: input.reason ?? 'editor-discarded' },
    })
    await syncIssueAfterGeneratedRevisionMutation(tx, issue)
    return { revision: discarded }
  })
}

function validateStoredRevision(contentJson: Prisma.JsonValue, citationJson: Prisma.JsonValue) {
  const findings: Array<{ severity: 'critical' | 'review'; code: string }> = []
  const content = summarizeAiDailyEditableContent(contentJson)
  if (!content) findings.push({ severity: 'critical', code: 'content-structure-invalid' })
  const citations = readJsonArray(citationJson)
  if (citations.length === 0) findings.push({ severity: 'critical', code: 'citation-snapshot-required' })
  const normalizedCitations = citations.map((citation) => normalizeAiDailyCitationSnapshotV2(citation)).filter((result) => result.ok)
  if (normalizedCitations.length !== citations.length) findings.push({ severity: 'critical', code: 'citation-snapshot-invalid' })
  if (content) {
    const text = [content.title, content.subtitle, content.introduction.text, ...content.events.flatMap((event) => [event.title, event.factSummary.text, event.whyItMatters.text]), ...content.trends.map((trend) => trend.text)].join('\n')
    if (/https?:\/\//iu.test(text)) findings.push({ severity: 'critical', code: 'generated-url-forbidden' })
    if (/(史上最|绝对|彻底|颠覆一切|guaranteed|best ever|revolutionary)/iu.test(text)) findings.push({ severity: 'review', code: 'sensational-wording' })
    const source = isRecord(contentJson) ? contentJson as Record<string, unknown> : {}
    const claims = Array.isArray(source.claims) ? source.claims.filter(isRecord) : []
    const knownClaims = new Set(claims.map((claim) => readText(claim.claimId, 96)).filter(Boolean))
    const usedClaims = new Set([
      ...content.introduction.claimIds,
      ...content.events.flatMap((event) => [...event.claimIds, ...event.factSummary.claimIds, ...event.whyItMatters.claimIds]),
      ...content.trends.flatMap((trend) => trend.claimIds),
    ])
    for (const claimId of usedClaims) if (!knownClaims.has(claimId)) findings.push({ severity: 'critical', code: `claim-unknown:${claimId}` })
    if (content.events.some((event) => event.factSummary.claimIds.length === 0 || event.whyItMatters.claimIds.length === 0)) {
      findings.push({ severity: 'critical', code: 'event-claim-binding-required' })
    }
  }
  return { status: findings.some((finding) => finding.severity === 'critical') ? 'REJECTED' as const : findings.length > 0 ? 'NEEDS_EDITOR_REVIEW' as const : 'VALID' as const, findings }
}

function buildContentJson(content: AiDailyEditableContent, sourceContent: Record<string, unknown>): Prisma.InputJsonValue {
  return {
    title: content.title,
    subtitle: content.subtitle,
    composition: content,
    claims: Array.isArray(sourceContent.claims) ? sourceContent.claims : [],
    reviews: Array.isArray(sourceContent.reviews) ? sourceContent.reviews : [],
    blockReviews: Array.isArray(sourceContent.blockReviews) ? sourceContent.blockReviews : [],
  } as unknown as Prisma.InputJsonValue
}

function buildDraftCreate(date: string, content: AiDailyEditableContent, snapshots: Prisma.JsonValue[], actor: string): Prisma.ContentDraftCreateInput {
  return {
    slug: `ai-daily-${date}`,
    title: content.title,
    column: 'ai-daily',
    tag: 'AI 日报',
    detail: content.subtitle.slice(0, 600),
    readTime: '6 min',
    bodyJson: buildDraftBody(content, snapshots),
    knowledgePoints: ['AI Daily', 'editorial correction'],
    projectIds: [],
    status: 'REVIEW_NEEDED',
    visibility: 'HIDDEN',
    aiAssistance: 'draft-assisted',
    createdBy: actor,
    updatedBy: actor,
  }
}

function buildDraftUpdate(content: AiDailyEditableContent, snapshots: Prisma.JsonValue[], actor: string): Prisma.ContentDraftUpdateInput {
  return {
    title: content.title,
    detail: content.subtitle.slice(0, 600),
    bodyJson: buildDraftBody(content, snapshots),
    status: 'REVIEW_NEEDED',
    visibility: 'HIDDEN',
    aiAssistance: 'draft-assisted',
    updatedBy: actor,
  }
}

function buildDraftBody(content: AiDailyEditableContent, snapshots: Prisma.JsonValue[]): Prisma.InputJsonValue {
  const blocks: Prisma.InputJsonValue[] = [
    { type: 'heading', level: 2, text: '今日摘要 / Daily Brief' },
    { type: 'paragraph', text: content.introduction.text, claimIds: content.introduction.claimIds },
  ]
  for (const event of content.events) {
    blocks.push({ type: 'heading', level: 3, text: event.title })
    blocks.push({ type: 'paragraph', text: event.factSummary.text, claimIds: event.factSummary.claimIds })
    blocks.push({ type: 'paragraph', text: event.whyItMatters.text, claimIds: event.whyItMatters.claimIds })
  }
  if (content.trends.length > 0) {
    blocks.push({ type: 'heading', level: 2, text: '趋势观察 / Trends' })
    blocks.push({ type: 'list', items: content.trends.map((trend) => trend.text) })
  }
  blocks.push({ type: 'heading', level: 2, text: '来源 / Sources' })
  for (const snapshot of snapshots.slice(0, 40)) {
    const normalized = normalizeAiDailyCitationSnapshotV2(snapshot)
    if (normalized.ok) blocks.push({ type: 'source-card', citationSnapshot: normalized.snapshot as unknown as Prisma.InputJsonValue })
  }
  blocks.push({ type: 'heading', level: 2, text: '审核 Gate' })
  blocks.push({ type: 'list', items: ['逐条复核 citation snapshot 与原文语境。', '完成 sourceChecked、safetyChecked、publicReady 后再导出。'] })
  return { blocks }
}

async function syncIssueAfterGeneratedRevisionMutation(
  tx: Prisma.TransactionClient,
  issue: { id: string; draftId: string | null },
  draftId = issue.draftId,
) {
  const actionableRevisionCount = await tx.aiDailyGeneratedRevision.count({
    where: { issueId: issue.id, applyState: { in: ['PENDING', 'BLOCKED'] } },
  })
  const reviewNeeded = Boolean(draftId) || actionableRevisionCount > 0
  return tx.aiDailyIssue.update({
    where: { id: issue.id },
    data: {
      ...(draftId !== undefined ? { draftId } : {}),
      status: reviewNeeded ? 'REVIEW_NEEDED' : 'NEEDS_MORE_EVIDENCE',
      workflowState: reviewNeeded ? 'REVIEW_NEEDED' : 'NEEDS_MORE_EVIDENCE',
      newEvidenceAvailable: actionableRevisionCount > 0,
    },
  })
}

async function lockIssue(tx: Prisma.TransactionClient, issueId: string) {
  const [issue] = await tx.$queryRaw<Array<{ id: string; date: string; updatedAt: Date; selectionVersion: number; selectedEvidenceVersion: number; draftId: string | null; latestGeneratedRevisionId: string | null; newEvidenceAvailable: boolean }>>`
    SELECT "id", "date", "updatedAt", "selectionVersion", "selectedEvidenceVersion", "draftId", "latestGeneratedRevisionId", "newEvidenceAvailable"
    FROM "AiDailyIssue"
    WHERE "id" = ${issueId}
    FOR UPDATE
  `
  if (!issue) throw new Error('ai-daily-issue-not-found')
  return issue
}

function assertRevisionBelongs<T extends { id: string; issueId: string; revisionNumber: number; applyState: AiDailyGeneratedApplyState; validationStatus: AiDailyGeneratedValidationStatus }>(revision: T | null, issueId: string, expectedRevisionNumber: number): asserts revision is T {
  if (!revision || revision.issueId !== issueId) throw new Error('ai-daily-generated-revision-not-found')
  if (revision.revisionNumber !== expectedRevisionNumber) throw new Error('ai-daily-generated-revision-conflict')
}

function assertExpectedTimestamp(actual: Date, expected: Date) {
  if (actual.getTime() !== expected.getTime()) throw new Error('ai-daily-generated-issue-conflict')
}

function readClaimBlock(value: unknown): AiDailyEditableClaimBlock | null {
  if (!isRecord(value)) return null
  const text = readText(value.text, 1_200)
  const claimIds = readStringArray(value.claimIds, 40, 96)
  return text ? { text, claimIds } : null
}

function readEvent(value: unknown): AiDailyEditableEvent | null {
  if (!isRecord(value)) return null
  const eventId = readText(value.eventId, 120)
  const title = readText(value.title, 240)
  const factSummary = readClaimBlock(value.factSummary)
  const whyItMatters = readClaimBlock(value.whyItMatters)
  if (!eventId || !title || !factSummary || !whyItMatters) return null
  const uncertainty = value.uncertainty === 'low' || value.uncertainty === 'high' ? value.uncertainty : 'medium'
  return { eventId, title, factSummary, whyItMatters, uncertainty, claimIds: readStringArray(value.claimIds, 40, 96) }
}

function readJsonArray(value: Prisma.JsonValue): Prisma.JsonValue[] {
  return Array.isArray(value) ? value.slice(0, 40) : []
}

function readStringArray(value: unknown, limit: number, maxLength: number) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, maxLength)).filter(Boolean))).slice(0, limit)
    : []
}

function readText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
