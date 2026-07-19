import type { PrismaClient } from '@prisma/client'

const runStatuses = ['QUEUED', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_GAPS', 'FAILED_CONFIG', 'FAILED', 'CANCELLED'] as const
const runStages = ['COLLECT', 'DISCOVER', 'FETCH', 'DEDUPE', 'GROUP', 'RANK', 'PROMOTE', 'EXTRACT_FACTS', 'COMPOSE', 'VERIFY', 'VALIDATE', 'DRAFT'] as const
const workStatuses = ['PENDING', 'LEASED', 'RETRY_WAIT', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const
const sourceHealthStatuses = ['UNKNOWN', 'HEALTHY', 'DEGRADED', 'FAILING'] as const
const eventOutcomes = ['persisted', 'succeeded', 'failed', 'schema-rejected', 'quality-rejected', 'other'] as const
const providerRoles = ['primary', 'fallback', 'stable', 'signal', 'manual', 'other'] as const
export const aiDailyFailureCategories = ['config', 'provider', 'evidence', 'quality', 'infrastructure', 'stale-content'] as const
const issueStatuses = [
  'SOURCE_COLLECTED',
  'EXTRACTED',
  'SUMMARIZED',
  'SYNTHESIZED',
  'REVIEW_NEEDED',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'NEEDS_MORE_EVIDENCE',
] as const

type RunStatus = (typeof runStatuses)[number]
type RunStage = (typeof runStages)[number]
type WorkStatus = (typeof workStatuses)[number]
type SourceHealthStatus = (typeof sourceHealthStatuses)[number]
type EventOutcome = (typeof eventOutcomes)[number]
type ProviderRole = (typeof providerRoles)[number]
export type AiDailyFailureCategory = (typeof aiDailyFailureCategories)[number]
type IssueStatus = (typeof issueStatuses)[number]

const failureObservationWindowHours = 24
const defaultPublicStaleMinutes = 180

export interface AiDailyOperationsSnapshot {
  capturedAt: string
  sources: {
    enabled: number
    byHealth: Record<SourceHealthStatus, number>
    maxLagMs: number | null
  }
  runs: {
    byStatus: Record<RunStatus, number>
    activeByStage: Record<RunStage, number>
    latest: {
      status: RunStatus | null
      stage: RunStage | null
      endToEndLagMs: number | null
      pipelineFreshnessAt: string | null
    }
  }
  workItems: {
    byStatus: Record<WorkStatus, number>
    readyBacklog: number
    expiredLeases: number
  }
  events: {
    byOutcome: Record<EventOutcome, number>
    byProviderRole: Record<ProviderRole, number>
  }
  failures: {
    observationWindowHours: number
    staleAfterMs: number
    byCategory: Record<AiDailyFailureCategory, number>
  }
  issues: {
    byStatus: Record<IssueStatus, number>
  }
  publicFeed: {
    activeApproved: number
    latestApprovedAt: string | null
    ageMs: number | null
  }
  retention: {
    expiredEvidence: number
    expiredFlashItems: number
  }
}

export interface AiDailyOperationsAlert {
  code:
    | 'source-failing'
    | 'lease-expired'
    | 'work-backlog'
    | 'run-failed'
    | 'quality-rejected'
    | 'retention-due'
    | `failure-${AiDailyFailureCategory}`
  severity: 'warning' | 'critical'
  count: number
}

export interface AiDailyOperationsDiagnostics extends AiDailyOperationsSnapshot {
  status: 'healthy' | 'degraded'
  alerts: AiDailyOperationsAlert[]
}

function emptyMap<const T extends readonly string[]>(values: T): Record<T[number], number> {
  return Object.fromEntries(values.map((value) => [value, 0])) as Record<T[number], number>
}

function boundedCount(value: number | undefined | null) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(Math.trunc(value as number), 2_147_483_647))
}

function boundedLag(value: number | null | undefined) {
  if (!Number.isFinite(value)) return null
  return Math.max(0, Math.min(Math.trunc(value as number), 2_147_483_647))
}

function readGroupCount(value: unknown) {
  if (!value || typeof value !== 'object') return 0
  const record = value as { _count?: { _all?: number } }
  return boundedCount(record._count?._all)
}

function safeRunStatus(value: unknown): RunStatus | null {
  return typeof value === 'string' && (runStatuses as readonly string[]).includes(value) ? (value as RunStatus) : null
}

function safeRunStage(value: unknown): RunStage | null {
  return typeof value === 'string' && (runStages as readonly string[]).includes(value) ? (value as RunStage) : null
}

function safeIssueStatus(value: unknown): IssueStatus | null {
  return typeof value === 'string' && (issueStatuses as readonly string[]).includes(value) ? (value as IssueStatus) : null
}

function safeSourceHealth(value: unknown): SourceHealthStatus {
  return typeof value === 'string' && (sourceHealthStatuses as readonly string[]).includes(value)
    ? (value as SourceHealthStatus)
    : 'UNKNOWN'
}

function safeEventOutcome(value: unknown): EventOutcome {
  if (typeof value !== 'string') return 'other'
  return (eventOutcomes as readonly string[]).includes(value) ? (value as EventOutcome) : 'other'
}

function safeProviderRole(value: unknown): ProviderRole {
  if (typeof value !== 'string') return 'other'
  return (providerRoles as readonly string[]).includes(value) ? (value as ProviderRole) : 'other'
}

function normalizedFailureCode(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase().replaceAll('_', '-') : ''
}

export function classifyAiDailyFailureCategory(value: unknown): AiDailyFailureCategory | null {
  const code = normalizedFailureCode(value)
  if (!code) return null
  if (code === 'freshness-stale' || code.includes('stale-content')) return 'stale-content'
  if (code === 'provider-quality-below-floor' || code.includes('schema') || code.includes('quality')) return 'quality'
  if (
    code === 'unsafe-url' ||
    code === 'robots-disallowed' ||
    code === 'render-required' ||
    code === 'fetch-empty' ||
    code === 'evidence-rejected' ||
    code === 'evidence-pack-empty' ||
    code.includes('needs-more-evidence')
  ) return 'evidence'
  if (
    code === 'timeout' ||
    code === 'network-error' ||
    code === 'deadline-exceeded' ||
    code === 'checkpoint-error' ||
    code === 'lease-error' ||
    code === 'lease-expired' ||
    code === 'max-attempts-exhausted' ||
    code === 'generation-runner-error' ||
    code === 'ai-daily-provider-timeout' ||
    code === 'ai-daily-provider-network-error'
  ) return 'infrastructure'
  if (code === 'config-error' || code === 'failed-config' || code.includes('not-configured') || code.includes('config-missing')) return 'config'
  if (
    code === 'auth-error' ||
    code === 'rate-limited' ||
    code === 'invalid-response' ||
    code === 'provider-error' ||
    code.startsWith('ai-daily-provider-')
  ) return 'provider'
  return null
}

function addFailureSignals(
  target: Record<AiDailyFailureCategory, number>,
  rawCategory: unknown,
  count: number,
  fallback: AiDailyFailureCategory | null = null,
) {
  const category = classifyAiDailyFailureCategory(rawCategory) ?? fallback
  if (category) target[category] = boundedCount(target[category] + boundedCount(count))
}

function failureSeverity(category: AiDailyFailureCategory): AiDailyOperationsAlert['severity'] {
  return category === 'config' || category === 'provider' || category === 'infrastructure' ? 'critical' : 'warning'
}

function iso(value: Date | null | undefined) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : null
}

export async function loadAiDailyOperationsSnapshot(
  prisma: PrismaClient,
  now = new Date(),
  publicStaleMinutes = defaultPublicStaleMinutes,
): Promise<AiDailyOperationsSnapshot> {
  const eventWindowStart = new Date(now.getTime() - failureObservationWindowHours * 60 * 60 * 1_000)
  const staleAfterMs = boundedCount(publicStaleMinutes) * 60 * 1_000 || defaultPublicStaleMinutes * 60 * 1_000
  const [
    enabledSources,
    sourceHealthGroups,
    sourceErrorGroups,
    sourceLag,
    runStatusGroups,
    recentRunFailureGroups,
    activeStageGroups,
    latestRun,
    workStatusGroups,
    recentWorkFailureGroups,
    readyBacklog,
    expiredLeases,
    eventOutcomeErrorGroups,
    eventRoleGroups,
    issueStatusGroups,
    activeApproved,
    latestApproved,
    expiredEvidence,
    expiredFlashItems,
  ] = await Promise.all([
    prisma.aiDailySourceFeed.count({ where: { enabled: true } }),
    prisma.aiDailySourceFeed.groupBy({ by: ['healthStatus'], where: { enabled: true }, _count: { _all: true } }),
    prisma.aiDailySourceFeed.groupBy({
      by: ['lastErrorCategory'],
      where: {
        enabled: true,
        lastErrorCategory: { not: null },
        OR: [
          { lastAttemptedAt: { gte: eventWindowStart } },
          { healthStatus: { in: ['DEGRADED', 'FAILING'] } },
        ],
      },
      _count: { _all: true },
    }),
    prisma.aiDailySourceFeed.aggregate({ where: { enabled: true }, _max: { lastLagMs: true } }),
    prisma.aiDailyRun.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.aiDailyRun.groupBy({
      by: ['status', 'finalErrorCategory'],
      where: { status: { in: ['FAILED_CONFIG', 'FAILED'] }, updatedAt: { gte: eventWindowStart } },
      _count: { _all: true },
    }),
    prisma.aiDailyRun.groupBy({ by: ['currentStage'], where: { status: 'RUNNING', currentStage: { not: null } }, _count: { _all: true } }),
    prisma.aiDailyRun.findFirst({
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: { status: true, currentStage: true, endToEndLagMs: true, pipelineFreshnessAt: true },
    }),
    prisma.aiDailyWorkItem.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.aiDailyWorkItem.groupBy({
      by: ['status', 'lastErrorCategory'],
      where: { status: { in: ['RETRY_WAIT', 'FAILED'] }, updatedAt: { gte: eventWindowStart } },
      _count: { _all: true },
    }),
    prisma.aiDailyWorkItem.count({ where: { status: { in: ['PENDING', 'RETRY_WAIT'] }, availableAt: { lte: now } } }),
    prisma.aiDailyWorkItem.count({ where: { status: 'LEASED', leaseExpiresAt: { lte: now } } }),
    prisma.aiDailyRunEvent.groupBy({ by: ['outcome', 'errorCategory'], where: { createdAt: { gte: eventWindowStart } }, _count: { _all: true } }),
    prisma.aiDailyRunEvent.groupBy({ by: ['providerRole'], where: { createdAt: { gte: eventWindowStart } }, _count: { _all: true } }),
    prisma.aiDailyIssue.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.aiDailyFlashItem.count({
      where: {
        lifecycleState: 'ACTIVE',
        currentApprovedRevisionId: { not: null },
        lastApprovedAt: { not: null },
        OR: [{ retentionUntil: null }, { retentionUntil: { gt: now } }],
      },
    }),
    prisma.aiDailyFlashItem.findFirst({
      where: {
        lifecycleState: 'ACTIVE',
        currentApprovedRevisionId: { not: null },
        lastApprovedAt: { not: null },
        OR: [{ retentionUntil: null }, { retentionUntil: { gt: now } }],
      },
      orderBy: [{ lastApprovedAt: 'desc' }, { id: 'desc' }],
      select: { lastApprovedAt: true },
    }),
    prisma.aiDailyEvidenceDocument.count({ where: { expiresAt: { lte: now }, currentForCandidate: null } }),
    prisma.aiDailyFlashItem.count({ where: { retentionUntil: { lte: now } } }),
  ])

  const byHealth = emptyMap(sourceHealthStatuses)
  for (const group of sourceHealthGroups) byHealth[safeSourceHealth(group.healthStatus)] += readGroupCount(group)

  const byRunStatus = emptyMap(runStatuses)
  for (const group of runStatusGroups) {
    const status = safeRunStatus(group.status)
    if (status) byRunStatus[status] += readGroupCount(group)
  }

  const activeByStage = emptyMap(runStages)
  for (const group of activeStageGroups) {
    const stage = safeRunStage(group.currentStage)
    if (stage) activeByStage[stage] += readGroupCount(group)
  }

  const byWorkStatus = emptyMap(workStatuses)
  for (const group of workStatusGroups) {
    if (typeof group.status === 'string' && (workStatuses as readonly string[]).includes(group.status)) {
      byWorkStatus[group.status as WorkStatus] += readGroupCount(group)
    }
  }

  const byOutcome = emptyMap(eventOutcomes)
  for (const group of eventOutcomeErrorGroups) byOutcome[safeEventOutcome(group.outcome)] += readGroupCount(group)

  const byProviderRole = emptyMap(providerRoles)
  for (const group of eventRoleGroups) byProviderRole[safeProviderRole(group.providerRole)] += readGroupCount(group)

  const byIssueStatus = emptyMap(issueStatuses)
  for (const group of issueStatusGroups) {
    const status = safeIssueStatus(group.status)
    if (status) byIssueStatus[status] += readGroupCount(group)
  }

  const latestApprovedAt = iso(latestApproved?.lastApprovedAt)
  const latestApprovedMs = latestApproved?.lastApprovedAt?.getTime()
  const ageMs = Number.isFinite(latestApprovedMs) ? Math.max(0, now.getTime() - (latestApprovedMs as number)) : null
  const latestRunFreshnessAgeMs = latestRun?.pipelineFreshnessAt instanceof Date
    ? Math.max(0, now.getTime() - latestRun.pipelineFreshnessAt.getTime())
    : null
  const byFailureCategory = emptyMap(aiDailyFailureCategories)
  for (const group of sourceErrorGroups) addFailureSignals(byFailureCategory, group.lastErrorCategory, readGroupCount(group))
  for (const group of recentRunFailureGroups) {
    const count = readGroupCount(group)
    if (group.status === 'FAILED_CONFIG') byFailureCategory.config = boundedCount(byFailureCategory.config + count)
    else addFailureSignals(byFailureCategory, group.finalErrorCategory, count, 'infrastructure')
  }
  for (const group of recentWorkFailureGroups) addFailureSignals(byFailureCategory, group.lastErrorCategory, readGroupCount(group), 'infrastructure')
  for (const group of eventOutcomeErrorGroups) {
    const count = readGroupCount(group)
    const fallback = group.outcome === 'quality-rejected' || group.outcome === 'schema-rejected' ? 'quality' : null
    addFailureSignals(byFailureCategory, group.errorCategory, count, fallback)
  }
  byFailureCategory.evidence = boundedCount(byFailureCategory.evidence + byIssueStatus.NEEDS_MORE_EVIDENCE)
  byFailureCategory.infrastructure = boundedCount(byFailureCategory.infrastructure + boundedCount(expiredLeases))
  if (ageMs !== null && ageMs > staleAfterMs) byFailureCategory['stale-content'] += 1
  if (latestRunFreshnessAgeMs !== null && latestRunFreshnessAgeMs > staleAfterMs) byFailureCategory['stale-content'] += 1

  return {
    capturedAt: now.toISOString(),
    sources: { enabled: boundedCount(enabledSources), byHealth, maxLagMs: boundedLag(sourceLag._max.lastLagMs) },
    runs: {
      byStatus: byRunStatus,
      activeByStage,
      latest: {
        status: safeRunStatus(latestRun?.status),
        stage: safeRunStage(latestRun?.currentStage),
        endToEndLagMs: boundedLag(latestRun?.endToEndLagMs),
        pipelineFreshnessAt: iso(latestRun?.pipelineFreshnessAt),
      },
    },
    workItems: {
      byStatus: byWorkStatus,
      readyBacklog: boundedCount(readyBacklog),
      expiredLeases: boundedCount(expiredLeases),
    },
    events: { byOutcome, byProviderRole },
    failures: { observationWindowHours: failureObservationWindowHours, staleAfterMs, byCategory: byFailureCategory },
    issues: { byStatus: byIssueStatus },
    publicFeed: { activeApproved: boundedCount(activeApproved), latestApprovedAt, ageMs },
    retention: { expiredEvidence: boundedCount(expiredEvidence), expiredFlashItems: boundedCount(expiredFlashItems) },
  }
}

export function toAiDailyOperationsDiagnostics(snapshot: AiDailyOperationsSnapshot): AiDailyOperationsDiagnostics {
  const alerts: AiDailyOperationsAlert[] = []
  if (snapshot.sources.byHealth.FAILING > 0) alerts.push({ code: 'source-failing', severity: 'critical', count: snapshot.sources.byHealth.FAILING })
  if (snapshot.workItems.expiredLeases > 0) alerts.push({ code: 'lease-expired', severity: 'critical', count: snapshot.workItems.expiredLeases })
  if (snapshot.workItems.readyBacklog > 0) alerts.push({ code: 'work-backlog', severity: 'warning', count: snapshot.workItems.readyBacklog })
  if (snapshot.runs.latest.status === 'FAILED' || snapshot.runs.latest.status === 'FAILED_CONFIG') {
    alerts.push({ code: 'run-failed', severity: 'critical', count: 1 })
  }
  const qualityRejected = snapshot.events.byOutcome['quality-rejected'] + snapshot.events.byOutcome['schema-rejected']
  if (qualityRejected > 0) alerts.push({ code: 'quality-rejected', severity: 'warning', count: qualityRejected })
  const retentionDue = snapshot.retention.expiredEvidence + snapshot.retention.expiredFlashItems
  if (retentionDue > 0) alerts.push({ code: 'retention-due', severity: 'warning', count: retentionDue })
  for (const category of aiDailyFailureCategories) {
    const count = snapshot.failures.byCategory[category]
    if (count > 0) alerts.push({ code: `failure-${category}`, severity: failureSeverity(category), count })
  }
  return { ...snapshot, status: alerts.some((alert) => alert.severity === 'critical') ? 'degraded' : alerts.length > 0 ? 'degraded' : 'healthy', alerts }
}

export function emptyAiDailyOperationsSnapshot(now = new Date()): AiDailyOperationsSnapshot {
  return {
    capturedAt: now.toISOString(),
    sources: { enabled: 0, byHealth: emptyMap(sourceHealthStatuses), maxLagMs: null },
    runs: { byStatus: emptyMap(runStatuses), activeByStage: emptyMap(runStages), latest: { status: null, stage: null, endToEndLagMs: null, pipelineFreshnessAt: null } },
    workItems: { byStatus: emptyMap(workStatuses), readyBacklog: 0, expiredLeases: 0 },
    events: { byOutcome: emptyMap(eventOutcomes), byProviderRole: emptyMap(providerRoles) },
    failures: {
      observationWindowHours: failureObservationWindowHours,
      staleAfterMs: defaultPublicStaleMinutes * 60 * 1_000,
      byCategory: emptyMap(aiDailyFailureCategories),
    },
    issues: { byStatus: emptyMap(issueStatuses) },
    publicFeed: { activeApproved: 0, latestApprovedAt: null, ageMs: null },
    retention: { expiredEvidence: 0, expiredFlashItems: 0 },
  }
}

function escapeLabel(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"')
}

function labels(values: Record<string, string>) {
  return `{${Object.entries(values)
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(',')}}`
}

function seconds(value: number | null) {
  return value === null ? 0 : Math.max(0, value / 1000)
}

function ageFromIso(capturedAt: string, observedAt: string | null) {
  if (!observedAt) return null
  const capturedMs = Date.parse(capturedAt)
  const observedMs = Date.parse(observedAt)
  if (!Number.isFinite(capturedMs) || !Number.isFinite(observedMs)) return null
  return Math.max(0, capturedMs - observedMs)
}

export function renderAiDailyOperationsPrometheus(input: AiDailyOperationsDiagnostics | null) {
  if (!input) {
    return [
      '# HELP biau_ai_daily_operations_snapshot_up Whether the AI Daily operations snapshot was available.',
      '# TYPE biau_ai_daily_operations_snapshot_up gauge',
      'biau_ai_daily_operations_snapshot_up 0',
    ].join('\n')
  }

  const latestRunFreshnessAgeMs = ageFromIso(input.capturedAt, input.runs.latest.pipelineFreshnessAt)
  const latestRunFreshnessAvailable = latestRunFreshnessAgeMs === null ? 0 : 1
  const latestRunLagAvailable = input.runs.latest.endToEndLagMs === null ? 0 : 1
  const publicFlashAvailable = input.publicFeed.ageMs === null ? 0 : 1
  const lines = [
    '# HELP biau_ai_daily_operations_snapshot_up Whether the AI Daily operations snapshot was available.',
    '# TYPE biau_ai_daily_operations_snapshot_up gauge',
    'biau_ai_daily_operations_snapshot_up 1',
    '# HELP biau_ai_daily_sources_enabled Number of enabled AI Daily source feeds.',
    '# TYPE biau_ai_daily_sources_enabled gauge',
    `biau_ai_daily_sources_enabled ${input.sources.enabled}`,
    '# HELP biau_ai_daily_sources_total Number of enabled AI Daily source feeds by safe health state.',
    '# TYPE biau_ai_daily_sources_total gauge',
  ]
  for (const status of sourceHealthStatuses) lines.push(`biau_ai_daily_sources_total${labels({ health: status.toLowerCase() })} ${input.sources.byHealth[status]}`)
  lines.push(
    '# HELP biau_ai_daily_source_last_lag_seconds Maximum observed source lag in seconds.',
    '# TYPE biau_ai_daily_source_last_lag_seconds gauge',
    `biau_ai_daily_source_last_lag_seconds ${seconds(input.sources.maxLagMs).toFixed(3)}`,
    '# HELP biau_ai_daily_runs_total Number of AI Daily runs by status.',
    '# TYPE biau_ai_daily_runs_total gauge',
  )
  for (const status of runStatuses) lines.push(`biau_ai_daily_runs_total${labels({ status: status.toLowerCase() })} ${input.runs.byStatus[status]}`)
  lines.push(
    '# HELP biau_ai_daily_active_runs_total Number of active AI Daily runs by stage.',
    '# TYPE biau_ai_daily_active_runs_total gauge',
  )
  for (const stage of runStages) lines.push(`biau_ai_daily_active_runs_total${labels({ stage: stage.toLowerCase() })} ${input.runs.activeByStage[stage]}`)
  lines.push(
    '# HELP biau_ai_daily_latest_run_end_to_end_lag_seconds End-to-end lag reported by the latest AI Daily run.',
    '# TYPE biau_ai_daily_latest_run_end_to_end_lag_seconds gauge',
    `biau_ai_daily_latest_run_end_to_end_lag_seconds ${seconds(input.runs.latest.endToEndLagMs).toFixed(3)}`,
    '# HELP biau_ai_daily_latest_run_end_to_end_lag_available Whether the latest run end-to-end lag is available.',
    '# TYPE biau_ai_daily_latest_run_end_to_end_lag_available gauge',
    `biau_ai_daily_latest_run_end_to_end_lag_available ${latestRunLagAvailable}`,
    '# HELP biau_ai_daily_latest_run_freshness_age_seconds Age of the latest run freshness checkpoint.',
    '# TYPE biau_ai_daily_latest_run_freshness_age_seconds gauge',
    `biau_ai_daily_latest_run_freshness_age_seconds ${seconds(latestRunFreshnessAgeMs).toFixed(3)}`,
    '# HELP biau_ai_daily_latest_run_freshness_available Whether the latest run freshness checkpoint is available.',
    '# TYPE biau_ai_daily_latest_run_freshness_available gauge',
    `biau_ai_daily_latest_run_freshness_available ${latestRunFreshnessAvailable}`,
    '# HELP biau_ai_daily_issues_total Number of AI Daily issues by bounded lifecycle status.',
    '# TYPE biau_ai_daily_issues_total gauge',
  )
  for (const status of issueStatuses) lines.push(`biau_ai_daily_issues_total${labels({ status: status.toLowerCase() })} ${input.issues.byStatus[status]}`)
  lines.push(
    '# HELP biau_ai_daily_work_items_total Number of AI Daily work items by status.',
    '# TYPE biau_ai_daily_work_items_total gauge',
  )
  for (const status of workStatuses) lines.push(`biau_ai_daily_work_items_total${labels({ status: status.toLowerCase() })} ${input.workItems.byStatus[status]}`)
  lines.push(
    '# HELP biau_ai_daily_work_items_ready_backlog Work items ready to run but not yet leased.',
    '# TYPE biau_ai_daily_work_items_ready_backlog gauge',
    `biau_ai_daily_work_items_ready_backlog ${input.workItems.readyBacklog}`,
    '# HELP biau_ai_daily_work_items_expired_leases Leased work items whose lease has expired.',
    '# TYPE biau_ai_daily_work_items_expired_leases gauge',
    `biau_ai_daily_work_items_expired_leases ${input.workItems.expiredLeases}`,
    '# HELP biau_ai_daily_run_events_total AI Daily run events by bounded outcome in the recent observation window.',
    '# TYPE biau_ai_daily_run_events_total gauge',
  )
  for (const outcome of eventOutcomes) lines.push(`biau_ai_daily_run_events_total${labels({ outcome })} ${input.events.byOutcome[outcome]}`)
  lines.push(
    '# HELP biau_ai_daily_provider_role_events_total AI Daily events by bounded provider role, never provider identity.',
    '# TYPE biau_ai_daily_provider_role_events_total gauge',
  )
  for (const role of providerRoles) lines.push(`biau_ai_daily_provider_role_events_total${labels({ provider_role: role })} ${input.events.byProviderRole[role]}`)
  lines.push(
    '# HELP biau_ai_daily_failure_signals Current and recent low-sensitive AI Daily failure signals by fixed category.',
    '# TYPE biau_ai_daily_failure_signals gauge',
  )
  for (const category of aiDailyFailureCategories) {
    lines.push(`biau_ai_daily_failure_signals${labels({ category })} ${input.failures.byCategory[category]}`)
  }
  lines.push(
    '# HELP biau_ai_daily_public_flash_items_active Currently public-approved flash items inside retention.',
    '# TYPE biau_ai_daily_public_flash_items_active gauge',
    `biau_ai_daily_public_flash_items_active ${input.publicFeed.activeApproved}`,
    '# HELP biau_ai_daily_public_flash_age_seconds Age of the latest approved flash item.',
    '# TYPE biau_ai_daily_public_flash_age_seconds gauge',
    `biau_ai_daily_public_flash_age_seconds ${seconds(input.publicFeed.ageMs).toFixed(3)}`,
    '# HELP biau_ai_daily_public_flash_available Whether a latest approved public flash timestamp is available.',
    '# TYPE biau_ai_daily_public_flash_available gauge',
    `biau_ai_daily_public_flash_available ${publicFlashAvailable}`,
     '# HELP biau_ai_daily_retention_due_total Records past their retention boundary and requiring review.',
    '# TYPE biau_ai_daily_retention_due_total gauge',
    `biau_ai_daily_retention_due_total${labels({ kind: 'evidence' })} ${input.retention.expiredEvidence}`,
    `biau_ai_daily_retention_due_total${labels({ kind: 'flash-item' })} ${input.retention.expiredFlashItems}`,
    '# HELP biau_ai_daily_alerts_total Current low-sensitive operational alert candidates.',
    '# TYPE biau_ai_daily_alerts_total gauge',
  )
  for (const alert of input.alerts) lines.push(`biau_ai_daily_alerts_total${labels({ code: alert.code, severity: alert.severity })} ${alert.count}`)
  return lines.join('\n')
}
