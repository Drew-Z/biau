import { Prisma } from '@prisma/client'
import { requireStudioDatabase } from './db.js'
import { summarizeAiDailyEditableContent } from './aiDailyEditionRepository.js'

type StudioPrisma = ReturnType<typeof requireStudioDatabase>

export interface AiDailyWorkspaceOptions {
  issueId?: string
  limit?: number
}

function iso(value: Date | null | undefined) {
  return value?.toISOString() ?? null
}

function boundedString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function safeErrorCategory(value: unknown) {
  const category = boundedString(value, 96)
  return category && /^[a-z0-9][a-z0-9._-]*$/iu.test(category) ? category : category ? 'sanitized-error' : null
}

function jsonStringArray(value: Prisma.JsonValue | null | undefined, maxItems = 12, maxLength = 120) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
}

function countJsonItems(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.length : 0
}

function summarizeCounters(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, entryValue]) => /^[a-z0-9][a-z0-9_-]{0,47}$/iu.test(key) && typeof entryValue === 'number' && Number.isFinite(entryValue))
      .slice(0, 24),
  )
}

function summarizeReviewChecklist(value: Prisma.JsonValue) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { sourceChecked: false, safetyChecked: false, publicReady: false }
  }
  return {
    sourceChecked: value.sourceChecked === true,
    safetyChecked: value.safetyChecked === true,
    publicReady: value.publicReady === true,
  }
}

function summarizeBrief(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  return {
    summary: boundedString(record.summary, 600),
    publicAngle: boundedString(record.publicAngle, 800),
    keySignals: jsonStringArray(record.keySignals as Prisma.JsonValue, 8, 220),
    toVerify: jsonStringArray(record.toVerify as Prisma.JsonValue, 8, 220),
  }
}

function toIssueSummary(issue: {
  id: string
  date: string
  editionDate: Date | null
  title: string
  status: string
  workflowState: string
  sourceIdsJson: Prisma.JsonValue
  briefJson: Prisma.JsonValue | null
  selectionVersion: number
  selectedEvidenceVersion: number
  generatedRevisionSequence: number
  latestGeneratedRevisionId: string | null
  newEvidenceAvailable: boolean
  deployedPublicAt: Date | null
  draftId: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: issue.id,
    date: issue.date,
    editionDate: iso(issue.editionDate),
    title: issue.title,
    status: issue.status.toLowerCase().replaceAll('_', '-'),
    workflowState: issue.workflowState.toLowerCase().replaceAll('_', '-'),
    sourceIds: jsonStringArray(issue.sourceIdsJson, 80, 96),
    brief: summarizeBrief(issue.briefJson),
    selectionVersion: issue.selectionVersion,
    selectedEvidenceVersion: issue.selectedEvidenceVersion,
    generatedRevisionSequence: issue.generatedRevisionSequence,
    latestGeneratedRevisionId: issue.latestGeneratedRevisionId,
    newEvidenceAvailable: issue.newEvidenceAvailable,
    deployedPublicAt: iso(issue.deployedPublicAt),
    draftId: issue.draftId,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  }
}

function toRunResponse(run: {
  id: string
  issueId: string | null
  editionDate: Date
  profile: string
  trigger: string
  attemptNumber: number
  eventSequence: number
  status: string
  currentStage: string | null
  configVersion: string
  startedAt: Date | null
  finishedAt: Date | null
  newestPublishedAt: Date | null
  lastCollectedAt: Date | null
  lastFetchedAt: Date | null
  pipelineFreshnessAt: Date | null
  endToEndLagMs: number | null
  countersJson: Prisma.JsonValue | null
  finalErrorCategory: string | null
  createdAt: Date
  updatedAt: Date
  events: Array<{
    id: string
    sequence: number
    stage: string | null
    kind: string
    outcome: string
    providerRole: string | null
    attemptNumber: number | null
    errorCategory: string | null
    durationMs: number | null
    createdAt: Date
  }>
  workItems: Array<{
    id: string
    kind: string
    sourceFeedId: string | null
    priority: number
    status: string
    attemptCount: number
    maxAttempts: number
    lastErrorCategory: string | null
    completedAt: Date | null
    updatedAt: Date
    sourceFeed: { id: string; name: string } | null
  }>
  candidates: Array<{
    id: string
    clusterId: string | null
    sourceFeedId: string | null
    providerKind: string
    providerRole: string
    title: string
    publisher: string
    publisherDomain: string
    canonicalUrl: string
    publishedAt: Date | null
    observedAt: Date
    sourceTier: string
    fetchStatus: string
    evidenceStatus: string
    selectionState: string
    scoreTotal: number | null
    lastErrorCategory: string | null
    evidenceExcerpt: string | null
    evidenceVersion: number
    currentEvidence: {
      id: string
      version: number
      status: string
      excerpt: string
      fetchedAt: Date
      expiresAt: Date
      originalUrl: string
      canonicalUrl: string
      title: string
      publisher: string
    } | null
    updatedAt: Date
  }>
  clusters: Array<{
    id: string
    stableIdentityKey: string
    groupingReason: string
    topic: string
    corroborationCount: number
    scoreTotal: number | null
    rank: number | null
    selectedAt: Date | null
    editorState: string
    editorReason: string | null
    updatedAt: Date
    candidates: Array<{ id: string }>
  }>
  overrides: Array<{
    id: string
    runId: string
    candidateId: string | null
    clusterId: string | null
    action: string
    actor: string
    reason: string | null
    expectedUpdatedAt: Date | null
    observedVersion: number | null
    createdAt: Date
  }>
}) {
  return {
    id: run.id,
    issueId: run.issueId,
    editionDate: run.editionDate.toISOString().slice(0, 10),
    profile: run.profile.toLowerCase(),
    trigger: run.trigger.toLowerCase(),
    attemptNumber: run.attemptNumber,
    eventSequence: run.eventSequence,
    status: run.status.toLowerCase().replaceAll('_', '-'),
    currentStage: run.currentStage?.toLowerCase().replaceAll('_', '-') ?? null,
    configVersion: boundedString(run.configVersion, 80),
    startedAt: iso(run.startedAt),
    finishedAt: iso(run.finishedAt),
    newestPublishedAt: iso(run.newestPublishedAt),
    lastCollectedAt: iso(run.lastCollectedAt),
    lastFetchedAt: iso(run.lastFetchedAt),
    pipelineFreshnessAt: iso(run.pipelineFreshnessAt),
    endToEndLagMs: run.endToEndLagMs,
    counters: summarizeCounters(run.countersJson),
    finalErrorCategory: safeErrorCategory(run.finalErrorCategory),
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    events: run.events.map((event) => ({
      id: event.id,
      sequence: event.sequence,
      stage: event.stage?.toLowerCase().replaceAll('_', '-') ?? null,
      kind: boundedString(event.kind, 80),
      outcome: boundedString(event.outcome, 80),
      providerRole: boundedString(event.providerRole, 80) || null,
      attemptNumber: event.attemptNumber,
      errorCategory: safeErrorCategory(event.errorCategory),
      durationMs: event.durationMs,
      createdAt: event.createdAt.toISOString(),
    })),
    workItems: run.workItems.map((item) => ({
      id: item.id,
      kind: item.kind.toLowerCase().replaceAll('_', '-'),
      sourceFeedId: item.sourceFeedId,
      sourceFeedName: item.sourceFeed?.name ?? null,
      priority: item.priority,
      status: item.status.toLowerCase().replaceAll('_', '-'),
      attemptCount: item.attemptCount,
      maxAttempts: item.maxAttempts,
      lastErrorCategory: safeErrorCategory(item.lastErrorCategory),
      completedAt: iso(item.completedAt),
      updatedAt: item.updatedAt.toISOString(),
    })),
    candidates: run.candidates.map((candidate) => ({
      id: candidate.id,
      clusterId: candidate.clusterId,
      sourceFeedId: candidate.sourceFeedId,
      providerKind: boundedString(candidate.providerKind, 80),
      providerRole: boundedString(candidate.providerRole, 80),
      title: boundedString(candidate.title, 240),
      publisher: boundedString(candidate.publisher, 120),
      publisherDomain: boundedString(candidate.publisherDomain, 120),
      canonicalUrl: boundedString(candidate.canonicalUrl, 512),
      publishedAt: iso(candidate.publishedAt),
      observedAt: candidate.observedAt.toISOString(),
      sourceTier: boundedString(candidate.sourceTier, 80),
      fetchStatus: candidate.fetchStatus.toLowerCase().replaceAll('_', '-'),
      evidenceStatus: candidate.evidenceStatus.toLowerCase().replaceAll('_', '-'),
      selectionState: candidate.selectionState.toLowerCase().replaceAll('_', '-'),
      scoreTotal: candidate.scoreTotal,
      lastErrorCategory: safeErrorCategory(candidate.lastErrorCategory),
      evidenceExcerpt: boundedString(candidate.evidenceExcerpt, 420) || null,
      evidenceVersion: candidate.evidenceVersion,
      currentEvidence: candidate.currentEvidence
        ? {
            id: candidate.currentEvidence.id,
            version: candidate.currentEvidence.version,
            status: candidate.currentEvidence.status.toLowerCase().replaceAll('_', '-'),
            excerpt: boundedString(candidate.currentEvidence.excerpt, 420),
            fetchedAt: candidate.currentEvidence.fetchedAt.toISOString(),
            expiresAt: candidate.currentEvidence.expiresAt.toISOString(),
            originalUrl: boundedString(candidate.currentEvidence.originalUrl, 512),
            canonicalUrl: boundedString(candidate.currentEvidence.canonicalUrl, 512),
            title: boundedString(candidate.currentEvidence.title, 240),
            publisher: boundedString(candidate.currentEvidence.publisher, 120),
          }
        : null,
      updatedAt: candidate.updatedAt.toISOString(),
    })),
    clusters: run.clusters.map((cluster) => ({
      id: cluster.id,
      stableIdentityKey: boundedString(cluster.stableIdentityKey, 160),
      groupingReason: boundedString(cluster.groupingReason, 420),
      topic: boundedString(cluster.topic, 160),
      corroborationCount: cluster.corroborationCount,
      scoreTotal: cluster.scoreTotal,
      rank: cluster.rank,
      selectedAt: iso(cluster.selectedAt),
      editorState: cluster.editorState.toLowerCase(),
      editorReason: boundedString(cluster.editorReason, 420) || null,
      updatedAt: cluster.updatedAt.toISOString(),
      candidateIds: cluster.candidates.map((candidate) => candidate.id).slice(0, 80),
    })),
    overrides: run.overrides.map((override) => ({
      id: override.id,
      runId: override.runId,
      candidateId: override.candidateId,
      clusterId: override.clusterId,
      action: override.action.toLowerCase(),
      actor: boundedString(override.actor, 80),
      reason: boundedString(override.reason, 420) || null,
      expectedUpdatedAt: iso(override.expectedUpdatedAt),
      observedVersion: override.observedVersion,
      createdAt: override.createdAt.toISOString(),
    })),
  }
}

function toFeedResponse(feed: {
  id: string
  name: string
  kind: string
  url: string
  canonicalKey: string
  locale: string
  tier: string
  enabled: boolean
  intervalMinutes: number
  nextCollectAt: Date | null
  lastAttemptedAt: Date | null
  lastSuccessfulAt: Date | null
  consecutiveFailures: number
  healthStatus: string
  lastLagMs: number | null
  lastErrorCategory: string | null
  updatedAt: Date
}) {
  return {
    id: feed.id,
    name: boundedString(feed.name, 160),
    kind: feed.kind.toLowerCase().replaceAll('_', '-'),
    url: boundedString(feed.url, 512),
    canonicalKey: boundedString(feed.canonicalKey, 180),
    locale: boundedString(feed.locale, 20),
    tier: boundedString(feed.tier, 80),
    enabled: feed.enabled,
    intervalMinutes: feed.intervalMinutes,
    nextCollectAt: iso(feed.nextCollectAt),
    lastAttemptedAt: iso(feed.lastAttemptedAt),
    lastSuccessfulAt: iso(feed.lastSuccessfulAt),
    consecutiveFailures: feed.consecutiveFailures,
    healthStatus: feed.healthStatus.toLowerCase().replaceAll('_', '-'),
    lastLagMs: feed.lastLagMs,
    lastErrorCategory: safeErrorCategory(feed.lastErrorCategory),
    updatedAt: feed.updatedAt.toISOString(),
  }
}

function toGeneratedRevisionResponse(revision: {
  id: string
  revisionNumber: number
  selectionVersion: number
  evidenceVersion: number
  promptVersion: string
  schemaVersion: string
  modelRole: string
  modelIdentifier: string
  revisionKind: string
  sourceRevisionId: string | null
  observedDraftUpdatedAt: Date | null
  applyState: string
  validationStatus: string
  validationFindingsJson: Prisma.JsonValue | null
  projectionDraftId: string | null
  createdBy: string
  createdAt: Date
  appliedAt: Date | null
  revalidatedAt: Date | null
  validatedBy: string | null
  discardedAt: Date | null
  discardedBy: string | null
  discardReason: string | null
  contentJson: Prisma.JsonValue
  citationSnapshotsJson: Prisma.JsonValue
}) {
  const findings = Array.isArray(revision.validationFindingsJson) ? revision.validationFindingsJson : []
  const content = summarizeAiDailyEditableContent(revision.contentJson)
  return {
    id: revision.id,
    revisionNumber: revision.revisionNumber,
    selectionVersion: revision.selectionVersion,
    evidenceVersion: revision.evidenceVersion,
    promptVersion: boundedString(revision.promptVersion, 80),
    schemaVersion: boundedString(revision.schemaVersion, 80),
    modelRole: boundedString(revision.modelRole, 80),
    modelIdentifier: boundedString(revision.modelIdentifier, 120),
    revisionKind: revision.revisionKind.toLowerCase().replaceAll('_', '-'),
    sourceRevisionId: revision.sourceRevisionId,
    observedDraftUpdatedAt: iso(revision.observedDraftUpdatedAt),
    applyState: revision.applyState.toLowerCase().replaceAll('_', '-'),
    validationStatus: revision.validationStatus.toLowerCase().replaceAll('_', '-'),
    validationFindingCount: findings.length,
    projectionDraftId: revision.projectionDraftId,
    createdBy: boundedString(revision.createdBy, 80),
    createdAt: revision.createdAt.toISOString(),
    appliedAt: iso(revision.appliedAt),
    revalidatedAt: iso(revision.revalidatedAt),
    validatedBy: boundedString(revision.validatedBy, 80) || null,
    discardedAt: iso(revision.discardedAt),
    discardedBy: boundedString(revision.discardedBy, 80) || null,
    discardReason: boundedString(revision.discardReason, 420) || null,
    contentBlockCount:
      revision.contentJson && typeof revision.contentJson === 'object' && !Array.isArray(revision.contentJson)
        ? Array.isArray((revision.contentJson as Record<string, unknown>).blocks)
          ? ((revision.contentJson as Record<string, unknown>).blocks as unknown[]).length
          : 0
        : 0,
    citationCount: countJsonItems(revision.citationSnapshotsJson),
    validationFindings: findings
      .slice(0, 40)
      .flatMap((finding) =>
        finding && typeof finding === 'object' && !Array.isArray(finding)
          ? [{ severity: boundedString((finding as Record<string, unknown>).severity, 24), code: boundedString((finding as Record<string, unknown>).code, 120) }]
          : [],
      ),
    content: content
      ? {
          title: boundedString(content.title, 240),
          subtitle: boundedString(content.subtitle, 600),
          introduction: {
            text: boundedString(content.introduction.text, 1_200),
            claimIds: content.introduction.claimIds.slice(0, 40),
          },
          events: content.events.slice(0, 12).map((event) => ({
            eventId: boundedString(event.eventId, 120),
            title: boundedString(event.title, 240),
            factSummary: { text: boundedString(event.factSummary.text, 1_200), claimIds: event.factSummary.claimIds.slice(0, 40) },
            whyItMatters: { text: boundedString(event.whyItMatters.text, 1_200), claimIds: event.whyItMatters.claimIds.slice(0, 40) },
            uncertainty: event.uncertainty,
            claimIds: event.claimIds.slice(0, 40),
          })),
          trends: content.trends.slice(0, 12).map((trend) => ({ text: boundedString(trend.text, 1_200), claimIds: trend.claimIds.slice(0, 40) })),
        }
      : null,
  }
}

function toFlashResponse(item: {
  id: string
  publicId: string
  stableEventKey: string
  sourceClusterIdentity: string
  lifecycleState: string
  currentApprovedRevisionId: string | null
  revisionSequence: number
  publicRevision: number
  lastApprovedAt: Date | null
  withdrawnAt: Date | null
  projectionUpdatedAt: Date | null
  createdAt: Date
  revisions: Array<{
    id: string
    revisionNumber: number
    selectionVersion: number
    evidenceVersion: number
    title: string
    factSummary: string
    whyItMatters: string
    uncertainty: string | null
    correctionState: string
    status: string
    editor: string | null
    approvedAt: Date | null
    createdAt: Date
    citationSnapshotsJson: Prisma.JsonValue
  }>
  approvalActions: Array<{
    id: string
    action: string
    actor: string
    reason: string | null
    observedRevisionNumber: number | null
    createdAt: Date
  }>
}) {
  return {
    id: item.id,
    publicId: boundedString(item.publicId, 120),
    stableEventKey: boundedString(item.stableEventKey, 180),
    sourceClusterIdentity: boundedString(item.sourceClusterIdentity, 180),
    lifecycleState: item.lifecycleState.toLowerCase(),
    currentApprovedRevisionId: item.currentApprovedRevisionId,
    revisionSequence: item.revisionSequence,
    publicRevision: item.publicRevision,
    lastApprovedAt: iso(item.lastApprovedAt),
    withdrawnAt: iso(item.withdrawnAt),
    projectionUpdatedAt: iso(item.projectionUpdatedAt),
    createdAt: item.createdAt.toISOString(),
    revisions: item.revisions.map((revision) => ({
      id: revision.id,
      revisionNumber: revision.revisionNumber,
      selectionVersion: revision.selectionVersion,
      evidenceVersion: revision.evidenceVersion,
      title: boundedString(revision.title, 240),
      factSummary: boundedString(revision.factSummary, 640),
      whyItMatters: boundedString(revision.whyItMatters, 640),
      uncertainty: boundedString(revision.uncertainty, 420) || null,
      correctionState: boundedString(revision.correctionState, 80),
      status: revision.status.toLowerCase(),
      editor: boundedString(revision.editor, 80) || null,
      approvedAt: iso(revision.approvedAt),
      createdAt: revision.createdAt.toISOString(),
      citationCount: countJsonItems(revision.citationSnapshotsJson),
    })),
    approvalActions: item.approvalActions.map((action) => ({
      id: action.id,
      action: action.action.toLowerCase(),
      actor: boundedString(action.actor, 80),
      reason: boundedString(action.reason, 420) || null,
      observedRevisionNumber: action.observedRevisionNumber,
      createdAt: action.createdAt.toISOString(),
    })),
  }
}

export async function loadAiDailyWorkspace(prisma: StudioPrisma, options: AiDailyWorkspaceOptions = {}) {
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 40)
  const issue = options.issueId
    ? await prisma.aiDailyIssue.findUnique({ where: { id: options.issueId } })
    : await prisma.aiDailyIssue.findFirst({ orderBy: [{ date: 'desc' }, { id: 'desc' }] })
  if (options.issueId && !issue) throw new Error('ai-daily-issue-not-found')

  const [issues, feeds, runs, flashItems, generatedRevisions, draft] = await Promise.all([
    prisma.aiDailyIssue.findMany({
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: 40,
    }),
    prisma.aiDailySourceFeed.findMany({
      orderBy: [{ enabled: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
    }),
    prisma.aiDailyRun.findMany({
      where: issue ? { issueId: issue.id } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      include: {
        events: { orderBy: [{ createdAt: 'desc' }, { sequence: 'desc' }], take: 40 },
        workItems: {
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: 30,
          include: { sourceFeed: { select: { id: true, name: true } } },
        },
        candidates: {
          orderBy: [{ scoreTotal: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }, { id: 'desc' }],
          take: 80,
          include: {
            currentEvidence: {
              select: {
                id: true,
                version: true,
                status: true,
                excerpt: true,
                fetchedAt: true,
                expiresAt: true,
                originalUrl: true,
                canonicalUrl: true,
                title: true,
                publisher: true,
              },
            },
          },
        },
        clusters: {
          orderBy: [{ rank: 'asc' }, { updatedAt: 'desc' }],
          take: 40,
          include: { candidates: { select: { id: true }, take: 80, orderBy: { id: 'asc' } } },
        },
        overrides: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 80 },
      },
    }),
    prisma.aiDailyFlashItem.findMany({
      orderBy: [{ projectionUpdatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: 40,
      include: {
        revisions: { orderBy: [{ createdAt: 'desc' }, { revisionNumber: 'desc' }], take: 8 },
        approvalActions: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 12 },
      },
    }),
    issue
      ? prisma.aiDailyGeneratedRevision.findMany({
          where: { issueId: issue.id },
          orderBy: [{ createdAt: 'desc' }, { revisionNumber: 'desc' }],
          take: 12,
        })
      : Promise.resolve([]),
    issue?.draftId
      ? prisma.contentDraft.findUnique({
          where: { id: issue.draftId },
          include: { reviews: { orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }], take: 1 } },
        })
      : Promise.resolve(null),
  ])

  return {
    generatedAt: new Date().toISOString(),
    selectedIssue: issue ? toIssueSummary(issue) : null,
    issues: issues.map(toIssueSummary),
    sourceFeeds: feeds.map(toFeedResponse),
    runs: runs.map(toRunResponse),
    flashItems: flashItems.map(toFlashResponse),
    edition: issue
      ? {
          issue: toIssueSummary(issue),
          draft: draft
            ? {
                id: draft.id,
                slug: draft.slug,
                title: draft.title,
                status: draft.status.toLowerCase().replaceAll('_', '-'),
                visibility: draft.visibility.toLowerCase(),
                updatedAt: draft.updatedAt.toISOString(),
                latestReview: draft.reviews[0]
                  ? {
                      status: draft.reviews[0].status.toLowerCase().replaceAll('_', '-'),
                      reviewedBy: draft.reviews[0].reviewedBy,
                      reviewedAt: draft.reviews[0].reviewedAt.toISOString(),
                      checklist: summarizeReviewChecklist(draft.reviews[0].checklistJson),
                      notes: boundedString(draft.reviews[0].notes, 420),
                    }
                  : null,
              }
            : null,
          generatedRevisions: generatedRevisions.map(toGeneratedRevisionResponse),
        }
      : null,
  }
}
