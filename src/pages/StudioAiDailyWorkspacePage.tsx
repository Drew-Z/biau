import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CirclePause,
  CirclePlay,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  GitMerge,
  Layers3,
  ListChecks,
  PencilLine,
  RefreshCw,
  Rss,
  Scissors,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  STUDIO_STORAGE_KEYS,
  normalizeStudioAiDailyWorkspace,
  readStoredStudioToken,
  readStudioError,
  type StudioAiDailyWorkspace,
  type StudioAiDailyWorkspaceCandidate,
  type StudioAiDailyWorkspaceFlash,
  type StudioAiDailyWorkspaceRun,
} from '../data/studio'
import {
  STUDIO_API_BASE,
  STUDIO_API_ENV_NAMES,
  explainStudioApiError,
  explainStudioClientException,
  requestStudioApi,
} from '../utils/studioApi'

type WorkspaceTab = 'runs' | 'sources' | 'candidates' | 'flash' | 'edition'

type FlashMutationKind = 'approve' | 'reject' | 'hold' | 'release' | 'withdraw' | 'correction'

type EditorialOverrideKind = 'include' | 'exclude' | 'request-evidence' | 'reorder' | 'merge' | 'split'

type EditionMutationKind = 'manual-draft' | 'correction' | 'revalidate' | 'apply' | 'discard'

type StudioEdition = NonNullable<StudioAiDailyWorkspace['edition']>

type StudioEditionRevision = StudioEdition['generatedRevisions'][number]

interface EditorialOverrideRequest {
  kind: EditorialOverrideKind
  runId: string
  actor: string
  reason?: string
  expectedUpdatedAt: string
  candidateId?: string
  clusterId?: string
  secondaryClusterId?: string
  secondaryExpectedUpdatedAt?: string
  orderedClusterIds?: string[]
  splitCandidateIds?: string[]
  splitStableIdentityKey?: string
  observedEvidenceVersion?: number
}

interface EditionMutationRequest {
  kind: EditionMutationKind
  issueId: string
  actor: string
  reason?: string
  expectedIssueUpdatedAt: string
  revisionId?: string
  expectedRevisionNumber?: number
  expectedDraftUpdatedAt?: string
  idempotencyKey?: string
  content?: StudioEditionRevision['content']
}

interface EditionCorrectionForm {
  title: string
  subtitle: string
  introduction: string
  events: Array<{ eventId: string; title: string; factSummary: string; whyItMatters: string; uncertainty: string; claimIds: string[] }>
  trends: string
  reason: string
}

interface FlashMutationRequest {
  kind: FlashMutationKind
  itemId: string
  expectedPublicRevision: number
  actor: string
  reason?: string
  revisionId?: string
  observedRevisionNumber?: number
  expectedRevisionSequence?: number
  sourceRevisionId?: string
  correction?: {
    title: string
    factSummary: string
    whyItMatters: string
    uncertainty: string
    editor: string
  }
}

interface FlashCorrectionForm {
  title: string
  factSummary: string
  whyItMatters: string
  uncertainty: string
  reason: string
}

const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof Activity }> = [
  { id: 'runs', label: 'Runs', icon: Activity },
  { id: 'sources', label: 'Sources', icon: Rss },
  { id: 'candidates', label: 'Candidates / Events', icon: Layers3 },
  { id: 'flash', label: 'Flash Review', icon: ListChecks },
  { id: 'edition', label: 'Edition', icon: FileText },
]

function formatDateTime(value: string | null | undefined) {
  if (!value) return '未记录'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

function formatStatus(value: string | null | undefined) {
  if (!value) return '未记录'
  return value
    .split('-')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
}

function statusClass(value: string | null | undefined) {
  if (!value) return 'is-muted'
  if (/(failed|error|rejected|withdrawn|expired|blocked)/iu.test(value)) return 'is-danger'
  if (/(review|pending|queued|running|candidate|unknown|hold)/iu.test(value)) return 'is-warning'
  if (/(completed|approved|active|succeeded|ready|healthy|applied)/iu.test(value)) return 'is-success'
  return 'is-muted'
}

function latestRun(workspace: StudioAiDailyWorkspace | null): StudioAiDailyWorkspaceRun | null {
  return workspace?.runs[0] ?? null
}

function candidateCount(run: StudioAiDailyWorkspaceRun | null) {
  return run?.candidates.length ?? 0
}

function selectedCandidate(run: StudioAiDailyWorkspaceRun | null) {
  return [...(run?.candidates ?? [])]
    .sort((a, b) => (b.scoreTotal ?? -Infinity) - (a.scoreTotal ?? -Infinity))
    .slice(0, 40)
}

function isWorkspaceUiCheck(searchParams: URLSearchParams) {
  return (
    searchParams.get('ui-check') === 'ai-daily-workspace' &&
    typeof window !== 'undefined' &&
    ['127.0.0.1', 'localhost'].includes(window.location.hostname)
  )
}

function createWorkspaceUiFixturePayload() {
  const issue = {
    id: 'ui-check-ai-daily-issue',
    date: '2026-07-19',
    editionDate: '2026-07-19T00:00:00.000Z',
    title: 'AI Daily 工作区 UI Check',
    status: 'review-needed',
    workflowState: 'review-needed',
    sourceIds: ['ui-check-source'],
    briefJson: null,
    brief: {
      summary: '验证运行、来源、候选证据、闪报和 Edition 五个工作区视图。',
      publicAngle: '仅使用本地 fixture 检查界面，不访问生产 Studio。',
      keySignals: ['官方来源已抽取', '生成修订等待人工审核'],
      toVerify: ['复核发布日期', '确认引用与原文一致'],
    },
    selectionVersion: 2,
    selectedEvidenceVersion: 3,
    generatedRevisionSequence: 2,
    latestGeneratedRevisionId: 'ui-check-pending-revision',
    newEvidenceAvailable: true,
    deployedPublicAt: null,
    draftId: 'ui-check-ai-daily-draft',
    createdAt: '2026-07-19T07:00:00.000Z',
    updatedAt: '2026-07-19T08:00:00.000Z',
  }
  const candidate = {
    id: 'ui-check-candidate',
    clusterId: 'ui-check-cluster',
    sourceFeedId: 'ui-check-feed',
    providerKind: 'official-rss',
    providerRole: 'stable',
    title: '官方模型平台更新',
    publisher: 'Official AI Platform',
    publisherDomain: 'example.com',
    canonicalUrl: 'https://example.com/official-update',
    publishedAt: '2026-07-19T02:00:00.000Z',
    observedAt: '2026-07-19T03:00:00.000Z',
    sourceTier: 'official-primary',
    fetchStatus: 'fetched',
    evidenceStatus: 'ready',
    selectionState: 'candidate',
    scoreTotal: 0.94,
    lastErrorCategory: null,
    evidenceExcerpt: '官方发布说明包含可核验的发布日期、能力变化与开发者影响。',
    evidenceVersion: 3,
    currentEvidence: {
      id: 'ui-check-evidence',
      version: 3,
      status: 'verified',
      excerpt: '官方发布说明包含可核验的发布日期、能力变化与开发者影响。',
      fetchedAt: '2026-07-19T03:10:00.000Z',
      expiresAt: '2026-07-20T03:10:00.000Z',
      originalUrl: 'https://example.com/official-update',
      canonicalUrl: 'https://example.com/official-update',
      title: '官方模型平台更新',
      publisher: 'Official AI Platform',
    },
    updatedAt: '2026-07-19T03:10:00.000Z',
  }
  const run = {
    id: 'ui-check-run',
    issueId: issue.id,
    editionDate: issue.date,
    profile: 'fixture',
    trigger: 'manual',
    attemptNumber: 1,
    eventSequence: 3,
    status: 'completed-with-gaps',
    currentStage: 'draft',
    configVersion: 'ui-check-v1',
    startedAt: '2026-07-19T03:00:00.000Z',
    finishedAt: '2026-07-19T03:30:00.000Z',
    newestPublishedAt: '2026-07-19T02:00:00.000Z',
    lastCollectedAt: '2026-07-19T03:05:00.000Z',
    lastFetchedAt: '2026-07-19T03:10:00.000Z',
    pipelineFreshnessAt: '2026-07-19T03:10:00.000Z',
    endToEndLagMs: 4_200_000,
    counters: { discovered: 8, selected: 1 },
    finalErrorCategory: 'optional-social-signal-unavailable',
    createdAt: '2026-07-19T03:00:00.000Z',
    updatedAt: '2026-07-19T03:30:00.000Z',
    events: [
      { id: 'ui-event-3', sequence: 3, stage: 'draft', kind: 'generation-completed', outcome: 'success', providerRole: 'composer', attemptNumber: 1, errorCategory: null, durationMs: 1600, createdAt: '2026-07-19T03:30:00.000Z' },
      { id: 'ui-event-2', sequence: 2, stage: 'fetch', kind: 'source-gap', outcome: 'degraded', providerRole: 'optional-social', attemptNumber: 1, errorCategory: 'optional-social-signal-unavailable', durationMs: 800, createdAt: '2026-07-19T03:12:00.000Z' },
      { id: 'ui-event-1', sequence: 1, stage: 'collect', kind: 'run-started', outcome: 'success', providerRole: null, attemptNumber: 1, errorCategory: null, durationMs: null, createdAt: '2026-07-19T03:00:00.000Z' },
    ],
    workItems: [],
    candidates: [candidate],
    clusters: [
      { id: 'ui-check-cluster', candidateIds: ['ui-check-candidate'], stableIdentityKey: 'official-model-update', groupingReason: 'canonical URL and title fingerprint match', topic: 'model-platform', corroborationCount: 2, scoreTotal: 0.94, rank: 1, selectedAt: '2026-07-19T03:20:00.000Z', editorState: 'auto', editorReason: null, updatedAt: '2026-07-19T03:20:00.000Z' },
    ],
    overrides: [],
  }
  return {
    generatedAt: '2026-07-19T08:00:00.000Z',
    selectedIssue: issue,
    issues: [issue],
    sourceFeeds: [
      { id: 'ui-check-feed', name: 'Official AI Platform RSS', kind: 'rss', url: 'https://example.com/feed.xml', canonicalKey: 'official-ai-platform', locale: 'zh', tier: 'official-primary', enabled: true, intervalMinutes: 60, nextCollectAt: '2026-07-19T09:00:00.000Z', lastAttemptedAt: '2026-07-19T03:05:00.000Z', lastSuccessfulAt: '2026-07-19T03:05:00.000Z', consecutiveFailures: 0, healthStatus: 'healthy', lastLagMs: 1200, lastErrorCategory: null, updatedAt: '2026-07-19T03:05:00.000Z' },
    ],
    runs: [run],
    flashItems: [
      {
        id: 'ui-check-flash',
        publicId: 'flash-ui-check',
        stableEventKey: 'official-model-update',
        sourceClusterIdentity: 'official-model-update',
        lifecycleState: 'active',
        currentApprovedRevisionId: null,
        revisionSequence: 1,
        publicRevision: 0,
        lastApprovedAt: null,
        withdrawnAt: null,
        projectionUpdatedAt: null,
        createdAt: '2026-07-19T03:25:00.000Z',
        revisions: [
          { id: 'ui-check-flash-revision', revisionNumber: 1, selectionVersion: 2, evidenceVersion: 3, title: '官方模型平台发布更新', factSummary: '官方页面确认了新的开发者能力与发布时间。', whyItMatters: '影响模型接入、工具调用和现有应用升级判断。', uncertainty: '区域可用性仍需逐项核查。', correctionState: 'none', status: 'draft', editor: 'ui-check', approvedAt: null, createdAt: '2026-07-19T03:25:00.000Z', citationCount: 1 },
        ],
        approvalActions: [{ id: 'ui-check-action', action: 'submitted', actor: 'ui-check', reason: null, observedRevisionNumber: 1, createdAt: '2026-07-19T03:25:00.000Z' }],
      },
      {
        id: 'ui-check-flash-approved',
        publicId: 'flash-ui-approved',
        stableEventKey: 'verified-model-update',
        sourceClusterIdentity: 'verified-model-update',
        lifecycleState: 'active',
        currentApprovedRevisionId: 'ui-check-approved-revision',
        revisionSequence: 2,
        publicRevision: 4,
        lastApprovedAt: '2026-07-19T03:28:00.000Z',
        withdrawnAt: null,
        projectionUpdatedAt: '2026-07-19T03:28:00.000Z',
        createdAt: '2026-07-19T03:25:00.000Z',
        revisions: [
          { id: 'ui-check-approved-revision', revisionNumber: 2, selectionVersion: 2, evidenceVersion: 3, title: '已核准的模型平台更新', factSummary: '这条 fixture 用于检查修正草稿和生命周期操作。', whyItMatters: '审核员可以在不覆盖公开版本的情况下提交修正。', uncertainty: '仅用于本地 UI 检查。', correctionState: 'none', status: 'approved', editor: 'ui-check', approvedAt: '2026-07-19T03:28:00.000Z', createdAt: '2026-07-19T03:26:00.000Z', citationCount: 1 },
        ],
        approvalActions: [{ id: 'ui-check-approved-action', action: 'approved', actor: 'ui-check', reason: null, observedRevisionNumber: 2, createdAt: '2026-07-19T03:28:00.000Z' }],
      },
    ],
    edition: {
      issue,
      draft: { id: issue.draftId ?? '', slug: 'ai-daily-2026-07-19', title: issue.title, status: 'review-needed', visibility: 'hidden', updatedAt: issue.updatedAt, latestReview: { status: 'pending', reviewedBy: 'ui-check', reviewedAt: issue.updatedAt, checklist: { sourceChecked: true, safetyChecked: true, publicReady: false }, notes: '等待最终公开就绪确认。' } },
      generatedRevisions: [
        {
          id: 'ui-check-pending-revision', revisionNumber: 2, revisionKind: 'generated', sourceRevisionId: null,
          selectionVersion: 2, evidenceVersion: 3, promptVersion: 'ui-check-v2', schemaVersion: '1', modelRole: 'composer', modelIdentifier: 'fixture-model-with-a-deliberately-long-identifier',
          applyState: 'pending', validationStatus: 'valid', validationFindingCount: 0, validationFindings: [], projectionDraftId: issue.draftId,
          createdBy: 'ui-check', createdAt: '2026-07-19T03:35:00.000Z', appliedAt: null, observedDraftUpdatedAt: issue.updatedAt,
          revalidatedAt: '2026-07-19T03:36:00.000Z', validatedBy: 'ui-check', discardedAt: null, discardedBy: null, discardReason: null,
          contentBlockCount: 6, citationCount: 1,
          content: {
            title: 'AI Daily 工作区 UI Check 待应用修订', subtitle: '基于本地 fixture 的可编辑摘要。',
            introduction: { text: '本期 fixture 用于检查 Edition 编辑、验证、应用和丢弃闭环。', claimIds: ['claim-ui-1'] },
            events: [{ eventId: 'event-ui-1', title: '官方模型平台更新', factSummary: { text: '官方来源记录了一项能力变化。', claimIds: ['claim-ui-1'] }, whyItMatters: { text: '编辑可以在保留引用的情况下修订表述。', claimIds: ['claim-ui-1'] }, uncertainty: 'medium', claimIds: ['claim-ui-1'] }],
            trends: [{ text: '证据绑定优先于发布速度。', claimIds: ['claim-ui-1'] }],
          },
        },
        {
          id: 'ui-check-generated-revision', revisionNumber: 1, revisionKind: 'generated', sourceRevisionId: null,
          selectionVersion: 2, evidenceVersion: 3, promptVersion: 'ui-check-v1', schemaVersion: '1', modelRole: 'composer', modelIdentifier: 'fixture-model',
          applyState: 'applied', validationStatus: 'valid', validationFindingCount: 0, validationFindings: [], projectionDraftId: issue.draftId,
          createdBy: 'ui-check', createdAt: '2026-07-19T03:30:00.000Z', appliedAt: '2026-07-19T03:31:00.000Z', observedDraftUpdatedAt: issue.updatedAt,
          revalidatedAt: '2026-07-19T03:31:00.000Z', validatedBy: 'ui-check', discardedAt: null, discardedBy: null, discardReason: null,
          contentBlockCount: 6, citationCount: 1,
          content: {
            title: 'AI Daily 工作区 UI Check', subtitle: '已经应用到草稿的历史修订。',
            introduction: { text: '已应用 revision 保留为只读历史，不会被修正版覆盖。', claimIds: ['claim-ui-1'] },
            events: [{ eventId: 'event-ui-1', title: '官方模型平台更新', factSummary: { text: '官方来源记录了一项能力变化。', claimIds: ['claim-ui-1'] }, whyItMatters: { text: '编辑可以追溯已经应用的内容。', claimIds: ['claim-ui-1'] }, uncertainty: 'medium', claimIds: ['claim-ui-1'] }],
            trends: [{ text: '已应用历史保持不可变。', claimIds: ['claim-ui-1'] }],
          },
        },
      ],
    },
  }
}

function applyWorkspaceFlashFixtureMutation(
  workspace: StudioAiDailyWorkspace,
  request: FlashMutationRequest,
): StudioAiDailyWorkspace {
  const now = new Date().toISOString()
  return {
    ...workspace,
    generatedAt: now,
    flashItems: workspace.flashItems.map((item) => {
      if (item.id !== request.itemId) return item
      const targetRevision = request.revisionId
        ? item.revisions.find((revision) => revision.id === request.revisionId)
        : undefined
      let revisions = item.revisions
      let lifecycleState = item.lifecycleState
      let currentApprovedRevisionId = item.currentApprovedRevisionId
      let revisionSequence = item.revisionSequence
      let publicRevision = item.publicRevision
      let lastApprovedAt = item.lastApprovedAt
      let withdrawnAt = item.withdrawnAt
      let action: string = request.kind
      if (request.kind === 'approve' && targetRevision) {
        revisions = revisions.map((revision) => {
          if (revision.id === currentApprovedRevisionId) return { ...revision, status: 'superseded' }
          return revision.id === targetRevision.id ? { ...revision, status: 'approved', approvedAt: now } : revision
        })
        currentApprovedRevisionId = targetRevision.id
        publicRevision += 1
        lastApprovedAt = now
        withdrawnAt = null
      } else if (request.kind === 'reject' && targetRevision) {
        revisions = revisions.map((revision) => (revision.id === targetRevision.id ? { ...revision, status: 'rejected' } : revision))
      } else if (request.kind === 'correction' && request.correction && targetRevision) {
        revisionSequence += 1
        revisions = [
          {
            id: `ui-check-correction-${revisionSequence}`,
            revisionNumber: revisionSequence,
            selectionVersion: targetRevision.selectionVersion,
            evidenceVersion: targetRevision.evidenceVersion,
            title: request.correction.title,
            factSummary: request.correction.factSummary,
            whyItMatters: request.correction.whyItMatters,
            uncertainty: request.correction.uncertainty || null,
            correctionState: 'correction-draft',
            status: 'draft',
            editor: request.correction.editor || null,
            approvedAt: null,
            createdAt: now,
            citationCount: targetRevision.citationCount,
          },
          ...revisions,
        ]
      } else if (request.kind === 'hold' || request.kind === 'release' || request.kind === 'withdraw') {
        lifecycleState = request.kind === 'hold' ? 'held' : request.kind === 'release' ? 'active' : 'withdrawn'
        publicRevision += 1
        withdrawnAt = request.kind === 'withdraw' ? now : null
      }
      if (request.kind === 'approve' || request.kind === 'reject' || request.kind === 'correction') {
        action = request.kind === 'correction' ? 'submitted' : request.kind
      } else if (request.kind === 'release') {
        action = 'released'
      }
      return {
        ...item,
        lifecycleState,
        currentApprovedRevisionId,
        revisionSequence,
        publicRevision,
        lastApprovedAt,
        withdrawnAt,
        projectionUpdatedAt: now,
        revisions,
        approvalActions: [
          {
            id: `ui-check-action-${Date.now()}`,
            action,
            actor: request.actor,
            reason: request.reason ?? null,
            observedRevisionNumber: request.observedRevisionNumber ?? targetRevision?.revisionNumber ?? null,
            createdAt: now,
          },
          ...item.approvalActions,
        ],
      }
    }),
  }
}

function validateWorkspaceFlashFixtureMutation(
  item: StudioAiDailyWorkspaceFlash | undefined,
  request: FlashMutationRequest,
) {
  if (!item) return 'fixture-flash-item-not-found'
  if (item.publicRevision !== request.expectedPublicRevision) return 'fixture-flash-item-conflict'
  const targetRevision = request.revisionId
    ? item.revisions.find((revision) => revision.id === request.revisionId)
    : undefined
  if (request.kind === 'approve' || request.kind === 'reject') {
    if (!targetRevision || targetRevision.status !== 'draft') return 'fixture-invalid-revision-transition'
    if (targetRevision.revisionNumber !== request.observedRevisionNumber) return 'fixture-flash-revision-conflict'
  }
  if (request.kind === 'hold' && item.lifecycleState !== 'active') return 'fixture-invalid-lifecycle-transition'
  if (request.kind === 'release' && item.lifecycleState !== 'held') return 'fixture-invalid-lifecycle-transition'
  if (request.kind === 'withdraw' && !['active', 'held'].includes(item.lifecycleState)) {
    return 'fixture-invalid-lifecycle-transition'
  }
  if (request.kind === 'correction') {
    if (
      item.lifecycleState === 'withdrawn' ||
      item.currentApprovedRevisionId !== request.sourceRevisionId ||
      item.revisionSequence !== request.expectedRevisionSequence ||
      !item.revisions.some((revision) => revision.id === request.sourceRevisionId && revision.status === 'approved')
    ) {
      return 'fixture-invalid-correction-source'
    }
  }
  return null
}

function validateWorkspaceEditorialFixtureMutation(
  workspace: StudioAiDailyWorkspace,
  request: EditorialOverrideRequest,
) {
  const run = workspace.runs.find((item) => item.id === request.runId)
  if (!run) return 'fixture-run-not-found'
  if (request.kind === 'include' || request.kind === 'exclude' || request.kind === 'request-evidence') {
    const candidate = run.candidates.find((item) => item.id === request.candidateId)
    if (!candidate) return 'fixture-candidate-not-found'
    if (candidate.updatedAt !== request.expectedUpdatedAt) return 'fixture-editorial-conflict'
    if (request.kind === 'include' && candidate.evidenceStatus !== 'ready') return 'fixture-evidence-not-ready'
    if (
      request.kind === 'request-evidence' &&
      request.observedEvidenceVersion !== undefined &&
      candidate.evidenceVersion !== request.observedEvidenceVersion
    ) {
      return 'fixture-editorial-conflict'
    }
    return null
  }
  if (request.kind === 'reorder') {
    if (run.updatedAt !== request.expectedUpdatedAt) return 'fixture-editorial-conflict'
    const orderedIds = request.orderedClusterIds ?? []
    if (orderedIds.length !== run.clusters.length || new Set(orderedIds).size !== run.clusters.length) {
      return 'fixture-invalid-cluster-order'
    }
    if (orderedIds.some((id) => !run.clusters.some((cluster) => cluster.id === id))) {
      return 'fixture-invalid-cluster-order'
    }
  }
  if (request.kind === 'merge') {
    const primary = run.clusters.find((cluster) => cluster.id === request.clusterId)
    const secondary = run.clusters.find((cluster) => cluster.id === request.secondaryClusterId)
    if (!primary || !secondary || primary.id === secondary.id) return 'fixture-invalid-cluster-merge'
    if (primary.updatedAt !== request.expectedUpdatedAt) return 'fixture-editorial-conflict'
    if (secondary.updatedAt !== request.secondaryExpectedUpdatedAt) return 'fixture-editorial-conflict'
  }
  if (request.kind === 'split') {
    const source = run.clusters.find((cluster) => cluster.id === request.clusterId)
    const candidateIds = request.splitCandidateIds ?? []
    if (!source || !request.splitStableIdentityKey || candidateIds.length === 0) return 'fixture-invalid-cluster-split'
    if (source.updatedAt !== request.expectedUpdatedAt) return 'fixture-editorial-conflict'
    if (candidateIds.some((id) => !source.candidateIds.includes(id))) return 'fixture-invalid-cluster-split'
  }
  return null
}

function applyWorkspaceEditorialFixtureMutation(
  workspace: StudioAiDailyWorkspace,
  request: EditorialOverrideRequest,
): StudioAiDailyWorkspace {
  const now = new Date().toISOString()
  return {
    ...workspace,
    generatedAt: now,
    runs: workspace.runs.map((run) => {
      if (run.id !== request.runId) return run
      let candidates = run.candidates
      let clusters = run.clusters
      if (request.kind === 'include' || request.kind === 'exclude' || request.kind === 'request-evidence') {
        candidates = candidates.map((candidate) => {
          if (candidate.id !== request.candidateId) return candidate
          return {
            ...candidate,
            selectionState:
              request.kind === 'include'
                ? 'selected'
                : request.kind === 'exclude'
                  ? 'rejected'
                  : candidate.selectionState,
            updatedAt: now,
          }
        })
      } else if (request.kind === 'reorder') {
        const rankById = new Map((request.orderedClusterIds ?? []).map((id, index) => [id, index + 1]))
        clusters = clusters
          .map((cluster) => ({
            ...cluster,
            rank: rankById.get(cluster.id) ?? cluster.rank,
            editorState: rankById.has(cluster.id) ? 'accepted' : cluster.editorState,
            editorReason: rankById.has(cluster.id) ? request.reason ?? null : cluster.editorReason,
            updatedAt: rankById.has(cluster.id) ? now : cluster.updatedAt,
          }))
          .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
      } else if (request.kind === 'merge' && request.clusterId && request.secondaryClusterId) {
        const secondaryCandidateIds = clusters.find((cluster) => cluster.id === request.secondaryClusterId)?.candidateIds ?? []
        candidates = candidates.map((candidate) =>
          secondaryCandidateIds.includes(candidate.id)
            ? { ...candidate, clusterId: request.clusterId ?? null, updatedAt: now }
            : candidate,
        )
        clusters = clusters.map((cluster) => {
          if (cluster.id === request.clusterId) {
            const candidateIds = Array.from(new Set([...cluster.candidateIds, ...secondaryCandidateIds]))
            return {
              ...cluster,
              candidateIds,
              corroborationCount: candidateIds.length,
              editorState: 'accepted',
              editorReason: request.reason ?? null,
              updatedAt: now,
            }
          }
          if (cluster.id === request.secondaryClusterId) {
            return {
              ...cluster,
              candidateIds: [],
              corroborationCount: 0,
              editorState: 'rejected',
              editorReason: request.reason ?? null,
              updatedAt: now,
            }
          }
          return cluster
        })
      } else if (request.kind === 'split' && request.clusterId && request.splitStableIdentityKey) {
        const splitCandidateIds = request.splitCandidateIds ?? []
        const newClusterId = `ui-check-split-${request.splitStableIdentityKey}`
        candidates = candidates.map((candidate) =>
          splitCandidateIds.includes(candidate.id)
            ? { ...candidate, clusterId: newClusterId, updatedAt: now }
            : candidate,
        )
        const source = clusters.find((cluster) => cluster.id === request.clusterId)
        clusters = [
          ...clusters.map((cluster) => {
            if (cluster.id !== request.clusterId) return cluster
            const candidateIds = cluster.candidateIds.filter((id) => !splitCandidateIds.includes(id))
            return {
              ...cluster,
              candidateIds,
              corroborationCount: candidateIds.length,
              editorState: 'proposed',
              editorReason: request.reason ?? null,
              updatedAt: now,
            }
          }),
          {
            id: newClusterId,
            candidateIds: splitCandidateIds,
            stableIdentityKey: request.splitStableIdentityKey,
            groupingReason: 'manual-split',
            topic: source?.topic ?? 'manual',
            corroborationCount: splitCandidateIds.length,
            scoreTotal: null,
            rank: clusters.length + 1,
            selectedAt: null,
            editorState: 'proposed',
            editorReason: request.reason ?? null,
            updatedAt: now,
          },
        ]
      }
      return {
        ...run,
        updatedAt: now,
        candidates,
        clusters,
        overrides: [
          {
            id: `ui-check-override-${Date.now()}`,
            runId: run.id,
            candidateId: request.candidateId ?? null,
            clusterId: request.clusterId ?? null,
            action: request.kind,
            actor: request.actor,
            reason: request.reason ?? null,
            expectedUpdatedAt: request.expectedUpdatedAt,
            observedVersion: request.observedEvidenceVersion ?? null,
            createdAt: now,
          },
          ...run.overrides,
        ],
      }
    }),
  }
}

function validateWorkspaceEditionFixtureMutation(workspace: StudioAiDailyWorkspace, request: EditionMutationRequest) {
  const edition = workspace.edition
  if (!edition || edition.issue.id !== request.issueId) return 'fixture-issue-not-found'
  if (edition.issue.updatedAt !== request.expectedIssueUpdatedAt) return 'fixture-edition-conflict'
  if (request.kind === 'manual-draft') return edition.draft ? 'fixture-draft-already-exists' : null
  const revision = edition.generatedRevisions.find((item) => item.id === request.revisionId)
  if (!revision || revision.revisionNumber !== request.expectedRevisionNumber) return 'fixture-revision-conflict'
  if (request.kind === 'correction') {
    if (!request.content || !['pending', 'blocked'].includes(revision.applyState)) return 'fixture-invalid-correction'
    return null
  }
  if (request.kind === 'revalidate') {
    if (revision.applyState === 'applied' || revision.applyState === 'discarded') return 'fixture-invalid-revision-transition'
    return null
  }
  if (request.kind === 'apply' && revision.validationStatus !== 'valid') return 'fixture-revision-not-valid'
  if (request.kind === 'discard' && !['pending', 'blocked'].includes(revision.applyState)) return 'fixture-invalid-revision-transition'
  return null
}

function applyWorkspaceEditionFixtureMutation(workspace: StudioAiDailyWorkspace, request: EditionMutationRequest): StudioAiDailyWorkspace {
  const now = new Date().toISOString()
  const edition = workspace.edition
  if (!edition || edition.issue.id !== request.issueId) return workspace
  let nextIssue = { ...edition.issue, updatedAt: now }
  let nextDraft = edition.draft
  let generatedRevisions = edition.generatedRevisions
  if (request.kind === 'manual-draft') {
    nextDraft = {
      id: 'ui-check-manual-draft', slug: `ai-daily-${edition.issue.date}`, title: edition.issue.title, status: 'review-needed', visibility: 'hidden', updatedAt: now,
      latestReview: { status: 'pending', reviewedBy: request.actor, reviewedAt: now, checklist: { sourceChecked: false, safetyChecked: false, publicReady: false }, notes: '人工草稿已创建，等待审核。' },
    }
    nextIssue = { ...nextIssue, draftId: nextDraft.id }
  } else if (request.revisionId) {
    const sourceRevision = generatedRevisions.find((revision) => revision.id === request.revisionId)
    if (request.kind === 'correction' && request.content && sourceRevision) {
      const revisionNumber = Math.max(...generatedRevisions.map((item) => item.revisionNumber)) + 1
      const correctionRevision: StudioEditionRevision = {
        ...sourceRevision,
        revisionNumber,
        id: `ui-check-correction-${Date.now()}`,
        revisionKind: 'editor-correction',
        sourceRevisionId: sourceRevision.id,
        applyState: 'pending',
        validationStatus: 'needs-editor-review',
        validationFindingCount: 1,
        validationFindings: [{ severity: 'review', code: 'editor-correction-requires-revalidation' }],
        content: request.content,
        createdBy: request.actor,
        createdAt: now,
        appliedAt: null,
        revalidatedAt: null,
        validatedBy: null,
        discardedAt: null,
        discardedBy: null,
        discardReason: null,
      }
      generatedRevisions = [correctionRevision, ...generatedRevisions]
      nextIssue = { ...nextIssue, generatedRevisionSequence: revisionNumber, latestGeneratedRevisionId: correctionRevision.id, newEvidenceAvailable: true }
    } else {
      generatedRevisions = generatedRevisions.map((revision) => {
        if (revision.id !== request.revisionId) return revision
        if (request.kind === 'revalidate') return { ...revision, validationStatus: revision.content ? 'valid' : 'rejected', validationFindingCount: revision.content ? 0 : 1, validationFindings: revision.content ? [] : [{ severity: 'critical', code: 'content-structure-invalid' }], revalidatedAt: now, validatedBy: request.actor }
        if (request.kind === 'apply') return { ...revision, applyState: 'applied', appliedAt: now, projectionDraftId: nextDraft?.id ?? 'ui-check-applied-draft' }
        if (request.kind === 'discard') return { ...revision, applyState: 'discarded', discardedAt: now, discardedBy: request.actor, discardReason: request.reason ?? 'editor-discarded' }
        return revision
      })
      if (request.kind === 'apply') {
        nextDraft = nextDraft
          ? { ...nextDraft, status: 'review-needed', visibility: 'hidden', updatedAt: now, latestReview: { status: 'pending', reviewedBy: request.actor, reviewedAt: now, checklist: { sourceChecked: false, safetyChecked: false, publicReady: false }, notes: '辅助草稿已应用，审核必须重新开始。' } }
          : { id: 'ui-check-applied-draft', slug: `ai-daily-${edition.issue.date}`, title: edition.issue.title, status: 'review-needed', visibility: 'hidden', updatedAt: now, latestReview: { status: 'pending', reviewedBy: request.actor, reviewedAt: now, checklist: { sourceChecked: false, safetyChecked: false, publicReady: false }, notes: '辅助草稿已应用，等待审核。' } }
        nextIssue = { ...nextIssue, draftId: nextDraft.id }
      }
      nextIssue = { ...nextIssue, newEvidenceAvailable: generatedRevisions.some((revision) => ['pending', 'blocked'].includes(revision.applyState)) }
    }
  }
  const updateIssue = (issue: StudioAiDailyWorkspace['issues'][number]) => issue.id === request.issueId ? nextIssue : issue
  return {
    ...workspace,
    generatedAt: now,
    selectedIssue: workspace.selectedIssue?.id === request.issueId ? nextIssue : workspace.selectedIssue,
    issues: workspace.issues.map(updateIssue),
    edition: { ...edition, issue: nextIssue, draft: nextDraft, generatedRevisions },
  }
}

function CandidateCard({
  candidate,
  runId,
  actor,
  reason,
  pending,
  onMutate,
}: {
  candidate: StudioAiDailyWorkspaceCandidate
  runId: string
  actor: string
  reason: string
  pending: boolean
  onMutate: (request: EditorialOverrideRequest) => Promise<boolean>
}) {
  const submit = (kind: 'include' | 'exclude' | 'request-evidence') => {
    void onMutate({
      kind,
      runId,
      candidateId: candidate.id,
      actor,
      reason: reason || undefined,
      expectedUpdatedAt: candidate.updatedAt,
      observedEvidenceVersion: candidate.evidenceVersion,
    })
  }
  const canInclude = candidate.evidenceStatus === 'ready'
  return (
    <article className="studio-ai-daily-item">
      <div className="studio-ai-daily-item__header">
        <strong>{candidate.title || '未命名候选'}</strong>
        <span className={`studio-status-pill ${statusClass(candidate.evidenceStatus)}`}>{formatStatus(candidate.evidenceStatus)}</span>
      </div>
      <p>
        {candidate.publisher || candidate.publisherDomain || '未知发布者'} · {formatStatus(candidate.sourceTier)} · score{' '}
        {candidate.scoreTotal === null ? '未评分' : candidate.scoreTotal.toFixed(2)}
      </p>
      <p>{candidate.evidenceExcerpt || '尚未绑定原文证据，不能进入公开稿件。'}</p>
      <div className="studio-ai-daily-item__meta">
        <span>fetch: {formatStatus(candidate.fetchStatus)}</span>
        <span>selection: {formatStatus(candidate.selectionState)}</span>
        <span>cluster: {candidate.clusterId || '未分组'}</span>
        {candidate.lastErrorCategory && <span className="is-danger">error: {candidate.lastErrorCategory}</span>}
      </div>
      <div className="studio-ai-daily-candidate-actions" aria-label={`${candidate.title || '候选'} 编辑动作`}>
        {candidate.selectionState !== 'selected' && (
          <button type="button" className="studio-primary-button" disabled={!actor || pending || !canInclude} onClick={() => submit('include')}>
            <CheckCircle2 size={15} aria-hidden="true" />纳入
          </button>
        )}
        {candidate.selectionState !== 'rejected' && (
          <button type="button" className="studio-secondary-button" disabled={!actor || pending} onClick={() => submit('exclude')}>
            <XCircle size={15} aria-hidden="true" />排除
          </button>
        )}
        <button type="button" className="studio-secondary-button" disabled={!actor || pending} onClick={() => submit('request-evidence')}>
          <RefreshCw size={15} aria-hidden="true" />请求证据
        </button>
      </div>
      {!canInclude && <small className="studio-ai-daily-muted">证据状态达到 Ready 后才能纳入。</small>}
      {candidate.canonicalUrl && (
        <a href={candidate.canonicalUrl} target="_blank" rel="noreferrer" className="studio-inline-link">
          打开原文
        </a>
      )}
    </article>
  )
}

export function StudioAiDailyWorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const useUiCheckFixture = isWorkspaceUiCheck(searchParams)
  const [draftToken, setDraftToken] = useState(() => readStoredStudioToken())
  const [adminToken, setAdminToken] = useState(() => readStoredStudioToken())
  const [workspace, setWorkspace] = useState<StudioAiDailyWorkspace | null>(null)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => {
    const value = searchParams.get('view')
    return tabs.some((tab) => tab.id === value) ? (value as WorkspaceTab) : 'runs'
  })
  const [selectedIssueId, setSelectedIssueId] = useState(() => searchParams.get('issueId') ?? '')
  const [statusText, setStatusText] = useState('')
  const [flashMutationKey, setFlashMutationKey] = useState('')
  const [flashMutationStatus, setFlashMutationStatus] = useState('')
  const [editorialMutationKey, setEditorialMutationKey] = useState('')
  const [editorialMutationStatus, setEditorialMutationStatus] = useState('')
  const [editionMutationKey, setEditionMutationKey] = useState('')
  const [editionMutationStatus, setEditionMutationStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const requestSequence = useRef(0)
  const flashMutationSequence = useRef(0)
  const editorialMutationSequence = useRef(0)
  const editionMutationSequence = useRef(0)
  const selectedIssueIdRef = useRef(selectedIssueId)

  const selectedIssue = workspace?.selectedIssue ?? null
  const run = latestRun(workspace)
  const topCandidates = useMemo(() => selectedCandidate(run), [run])
  const editorialWriteEnabled = Boolean(
    (workspace?.flashItems.length || run?.candidates.length) && (adminToken || useUiCheckFixture),
  )

  const loadWorkspace = useCallback(
    async (token: string, issueId = '') => {
      const requestId = requestSequence.current + 1
      requestSequence.current = requestId
      setIsLoading(true)
      if (useUiCheckFixture) {
        const fixture = normalizeStudioAiDailyWorkspace(createWorkspaceUiFixturePayload())
        if (requestSequence.current !== requestId) return
        if (!fixture) {
          setIsLoading(false)
          setStatusText('AI Daily workspace UI check fixture 格式不完整。')
          return
        }
        setWorkspace(fixture)
        const fixtureIssueId = fixture.selectedIssue?.id ?? ''
        selectedIssueIdRef.current = fixtureIssueId
        setSelectedIssueId(fixtureIssueId)
        setIsLoading(false)
        setStatusText('AI Daily workspace UI check fixture 已加载。')
        return
      }
      if (!STUDIO_API_BASE) {
        if (requestSequence.current !== requestId) return
        setIsLoading(false)
        setStatusText(`当前没有配置 ${STUDIO_API_ENV_NAMES.studio} 或 ${STUDIO_API_ENV_NAMES.legacy}。`)
        return
      }
      if (!token) {
        if (requestSequence.current !== requestId) return
        setIsLoading(false)
        setStatusText('请先保存 Studio token。')
        return
      }
      setStatusText('')
      try {
        const query = issueId ? `?issueId=${encodeURIComponent(issueId)}` : ''
        const result = await requestStudioApi(`/ai-daily/workspace${query}`, token)
        if (!result.ok) {
          if (requestSequence.current !== requestId) return
          setStatusText(explainStudioApiError(result.status, readStudioError(result.payload)))
          return
        }
        const nextWorkspace = normalizeStudioAiDailyWorkspace(result.payload)
        if (!nextWorkspace) {
          if (requestSequence.current !== requestId) return
          setStatusText('AI Daily workspace 返回格式不完整。')
          return
        }
        if (requestSequence.current !== requestId) return
        setWorkspace(nextWorkspace)
        if (!issueId && nextWorkspace.selectedIssue) {
          selectedIssueIdRef.current = nextWorkspace.selectedIssue.id
          setSelectedIssueId(nextWorkspace.selectedIssue.id)
          setSearchParams((current) => {
            current.set('issueId', nextWorkspace.selectedIssue?.id ?? '')
            return current
          }, { replace: true })
        }
        setStatusText(`已刷新审核工作区 · ${formatDateTime(nextWorkspace.generatedAt)}`)
      } catch (error) {
        if (requestSequence.current !== requestId) return
        setStatusText(explainStudioClientException(error, '加载 AI Daily 工作区'))
      } finally {
        if (requestSequence.current === requestId) setIsLoading(false)
      }
    },
    [setSearchParams, useUiCheckFixture],
  )

  useEffect(() => {
    if (!adminToken) return
    const handle = window.setTimeout(() => void loadWorkspace(adminToken, selectedIssueIdRef.current), 0)
    return () => window.clearTimeout(handle)
  }, [adminToken, loadWorkspace])

  const saveToken = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = draftToken.trim()
    setAdminToken(token)
    if (token) {
      window.localStorage.setItem(STUDIO_STORAGE_KEYS.adminToken, token)
      setStatusText('Studio token 已保存在当前浏览器。')
      if (token === adminToken) void loadWorkspace(token, selectedIssueIdRef.current)
    } else {
      requestSequence.current += 1
      flashMutationSequence.current += 1
      editorialMutationSequence.current += 1
      editionMutationSequence.current += 1
      setIsLoading(false)
      setFlashMutationKey('')
      setEditorialMutationKey('')
      setEditionMutationKey('')
      window.localStorage.removeItem(STUDIO_STORAGE_KEYS.adminToken)
      setWorkspace(null)
      setStatusText('Studio token 已清除。')
    }
  }

  const changeIssue = (issueId: string) => {
    selectedIssueIdRef.current = issueId
    setSelectedIssueId(issueId)
    setSearchParams((current) => {
      if (issueId) current.set('issueId', issueId)
      else current.delete('issueId')
      return current
    }, { replace: true })
    if (adminToken) void loadWorkspace(adminToken, issueId)
  }

  const changeTab = (tab: WorkspaceTab) => {
    setActiveTab(tab)
    setSearchParams((current) => {
      current.set('view', tab)
      return current
    }, { replace: true })
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const offset = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : event.key === 'Home' ? -index : event.key === 'End' ? tabs.length - 1 - index : 1
    const nextIndex = (index + offset + tabs.length) % tabs.length
    const nextTab = tabs[nextIndex]
    changeTab(nextTab.id)
    window.requestAnimationFrame(() => document.getElementById(`ai-daily-tab-${nextTab.id}`)?.focus())
  }

  const clearToken = () => {
    requestSequence.current += 1
    flashMutationSequence.current += 1
    editorialMutationSequence.current += 1
    editionMutationSequence.current += 1
    selectedIssueIdRef.current = ''
    setIsLoading(false)
    setFlashMutationKey('')
    setEditorialMutationKey('')
    setEditionMutationKey('')
    setDraftToken('')
    setAdminToken('')
    setWorkspace(null)
    window.localStorage.removeItem(STUDIO_STORAGE_KEYS.adminToken)
    setStatusText('Studio token 已清除。')
  }

  const mutateFlash = useCallback(
    async (request: FlashMutationRequest) => {
      const mutationKey = `${request.itemId}:${request.kind}`
      const mutationId = flashMutationSequence.current + 1
      flashMutationSequence.current = mutationId
      setFlashMutationKey(mutationKey)
      setFlashMutationStatus('')
      const publishMutationMessage = (message: string) => {
        if (flashMutationSequence.current !== mutationId) return false
        setFlashMutationStatus(message)
        setStatusText(message)
        return true
      }
      const actionLabels: Record<FlashMutationKind, string> = {
        approve: '批准',
        reject: '驳回',
        hold: '暂挂',
        release: '恢复',
        withdraw: '撤回',
        correction: '提交修正草稿',
      }
      const label = actionLabels[request.kind]
      try {
        if (useUiCheckFixture) {
          const fixtureError = validateWorkspaceFlashFixtureMutation(
            workspace?.flashItems.find((item) => item.id === request.itemId),
            request,
          )
          if (fixtureError) {
            publishMutationMessage(`Fixture 拒绝操作：${fixtureError}。`)
            return false
          }
          setWorkspace((current) => (current ? applyWorkspaceFlashFixtureMutation(current, request) : current))
          const message = `Fixture 已执行：${label}。`
          publishMutationMessage(message)
          return true
        }
        if (!adminToken) {
          const message = '请先保存 Studio token，再执行 Flash 审核动作。'
          publishMutationMessage(message)
          return false
        }
        let path: string
        let body: Record<string, unknown>
        const common = {
          actor: request.actor,
          ...(request.reason ? { reason: request.reason } : {}),
          expectedPublicRevision: request.expectedPublicRevision,
        }
        if (request.kind === 'approve' || request.kind === 'reject') {
          if (!request.revisionId || request.observedRevisionNumber === undefined) return false
          path = `/ai-daily/flash-revisions/${encodeURIComponent(request.revisionId)}/${request.kind}`
          body = { ...common, observedRevisionNumber: request.observedRevisionNumber }
        } else if (request.kind === 'correction') {
          if (!request.sourceRevisionId || request.expectedRevisionSequence === undefined || !request.correction) return false
          path = `/ai-daily/flash-items/${encodeURIComponent(request.itemId)}/corrections`
          body = {
            ...common,
            sourceRevisionId: request.sourceRevisionId,
            expectedRevisionSequence: request.expectedRevisionSequence,
            ...request.correction,
          }
        } else {
          path = `/ai-daily/flash-items/${encodeURIComponent(request.itemId)}/${request.kind}`
          body = common
        }
        const result = await requestStudioApi(path, adminToken, { method: 'POST', body: JSON.stringify(body) })
        if (!result.ok) {
          const errorCode = readStudioError(result.payload)
          const baseMessage = explainStudioApiError(result.status, errorCode)
          const message = result.status === 409 ? `${baseMessage} 请先刷新工作区，确认当前版本后再操作。` : baseMessage
          publishMutationMessage(message)
          return false
        }
        await loadWorkspace(adminToken, selectedIssueIdRef.current)
        if (flashMutationSequence.current !== mutationId) return false
        const message = `${label}成功，工作区已刷新。`
        publishMutationMessage(message)
        return true
      } catch (error) {
        const message = explainStudioClientException(error, `执行 Flash ${label}`)
        publishMutationMessage(message)
        return false
      } finally {
        if (flashMutationSequence.current === mutationId) setFlashMutationKey('')
      }
    },
    [adminToken, loadWorkspace, useUiCheckFixture, workspace],
  )

  const mutateEditorial = useCallback(
    async (request: EditorialOverrideRequest) => {
      const mutationId = editorialMutationSequence.current + 1
      editorialMutationSequence.current = mutationId
      const mutationKey = `${request.runId}:${request.kind}:${request.candidateId ?? request.clusterId ?? 'run'}`
      setEditorialMutationKey(mutationKey)
      setEditorialMutationStatus('')
      const labels: Record<EditorialOverrideKind, string> = {
        include: '纳入候选',
        exclude: '排除候选',
        'request-evidence': '请求证据',
        reorder: '更新排序',
        merge: '合并 cluster',
        split: '拆分 cluster',
      }
      const label = labels[request.kind]
      const publish = (message: string) => {
        if (editorialMutationSequence.current !== mutationId) return false
        setEditorialMutationStatus(message)
        setStatusText(message)
        return true
      }
      try {
        if (useUiCheckFixture) {
          if (!workspace) {
            publish('Fixture 工作区尚未加载。')
            return false
          }
          const fixtureError = validateWorkspaceEditorialFixtureMutation(workspace, request)
          if (fixtureError) {
            publish(`Fixture 拒绝操作：${fixtureError}。`)
            return false
          }
          setWorkspace((current) => (current ? applyWorkspaceEditorialFixtureMutation(current, request) : current))
          publish(`Fixture 已执行：${label}。`)
          return true
        }
        if (!adminToken) {
          publish('请先保存 Studio token，再执行候选编辑动作。')
          return false
        }
        const body = {
          action: request.kind.replace('-', '_').toUpperCase(),
          runId: request.runId,
          actor: request.actor,
          ...(request.reason ? { reason: request.reason } : {}),
          expectedUpdatedAt: request.expectedUpdatedAt,
          ...(request.candidateId ? { candidateId: request.candidateId } : {}),
          ...(request.clusterId ? { clusterId: request.clusterId } : {}),
          ...(request.secondaryClusterId ? { secondaryClusterId: request.secondaryClusterId } : {}),
          ...(request.secondaryExpectedUpdatedAt ? { secondaryExpectedUpdatedAt: request.secondaryExpectedUpdatedAt } : {}),
          ...(request.orderedClusterIds ? { orderedClusterIds: request.orderedClusterIds } : {}),
          ...(request.splitCandidateIds ? { splitCandidateIds: request.splitCandidateIds } : {}),
          ...(request.splitStableIdentityKey ? { splitStableIdentityKey: request.splitStableIdentityKey } : {}),
          ...(request.observedEvidenceVersion !== undefined ? { observedEvidenceVersion: request.observedEvidenceVersion } : {}),
        }
        const result = await requestStudioApi('/ai-daily/editorial-overrides', adminToken, {
          method: 'POST',
          body: JSON.stringify(body),
        })
        if (!result.ok) {
          const errorCode = readStudioError(result.payload)
          const baseMessage = explainStudioApiError(result.status, errorCode)
          publish(result.status === 409 ? `${baseMessage} 请先刷新工作区。` : baseMessage)
          return false
        }
        await loadWorkspace(adminToken, selectedIssueIdRef.current)
        if (editorialMutationSequence.current !== mutationId) return false
        publish(`${label}成功，工作区已刷新。`)
        return true
      } catch (error) {
        const message = explainStudioClientException(error, `执行${label}`)
        publish(message)
        return false
      } finally {
        if (editorialMutationSequence.current === mutationId) setEditorialMutationKey('')
      }
    },
    [adminToken, loadWorkspace, useUiCheckFixture, workspace],
  )

  const mutateEdition = useCallback(
    async (request: EditionMutationRequest) => {
      const mutationId = editionMutationSequence.current + 1
      editionMutationSequence.current = mutationId
      const key = `${request.issueId}:${request.kind}:${request.revisionId ?? 'draft'}`
      setEditionMutationKey(key)
      setEditionMutationStatus('')
      const labels: Record<EditionMutationKind, string> = {
        'manual-draft': '创建人工草稿',
        correction: '创建修正版',
        revalidate: '重新验证',
        apply: '应用辅助草稿',
        discard: '丢弃修订',
      }
      const label = labels[request.kind]
      const publish = (message: string) => {
        if (editionMutationSequence.current !== mutationId) return false
        setEditionMutationStatus(message)
        setStatusText(message)
        return true
      }
      try {
        if (useUiCheckFixture) {
          if (!workspace) {
            publish('Fixture 工作区尚未加载。')
            return false
          }
          const fixtureError = validateWorkspaceEditionFixtureMutation(workspace, request)
          if (fixtureError) {
            publish(`Fixture 拒绝操作：${fixtureError}。`)
            return false
          }
          setWorkspace((current) => current ? applyWorkspaceEditionFixtureMutation(current, request) : current)
          publish(`Fixture 已执行：${label}。`)
          return true
        }
        if (!adminToken) {
          publish('请先保存 Studio token，再执行 Edition 操作。')
          return false
        }
        let path: string
        let body: Record<string, unknown>
        if (request.kind === 'manual-draft') {
          path = `/ai-daily/issues/${encodeURIComponent(request.issueId)}/content-draft`
          body = { editorName: request.actor, expectedIssueUpdatedAt: request.expectedIssueUpdatedAt }
        } else {
          if (!request.revisionId || request.expectedRevisionNumber === undefined) return false
          path = `/ai-daily/issues/${encodeURIComponent(request.issueId)}/generated-revisions/${encodeURIComponent(request.revisionId)}/${request.kind === 'correction' ? 'corrections' : request.kind}`
          body = {
            actor: request.actor,
            expectedRevisionNumber: request.expectedRevisionNumber,
            expectedIssueUpdatedAt: request.expectedIssueUpdatedAt,
            ...(request.reason ? { reason: request.reason } : {}),
            ...(request.expectedDraftUpdatedAt ? { expectedDraftUpdatedAt: request.expectedDraftUpdatedAt } : {}),
            ...(request.idempotencyKey ? { idempotencyKey: request.idempotencyKey } : {}),
            ...(request.content ? { content: request.content } : {}),
          }
        }
        const result = await requestStudioApi(path, adminToken, { method: 'POST', body: JSON.stringify(body) })
        if (!result.ok) {
          const errorCode = readStudioError(result.payload)
          const baseMessage = explainStudioApiError(result.status, errorCode)
          publish(result.status === 409 ? `${baseMessage} 请刷新 Edition 后再操作。` : baseMessage)
          return false
        }
        await loadWorkspace(adminToken, selectedIssueIdRef.current)
        if (editionMutationSequence.current !== mutationId) return false
        publish(`${label}成功，工作区已刷新。`)
        return true
      } catch (error) {
        publish(explainStudioClientException(error, `执行${label}`))
        return false
      } finally {
        if (editionMutationSequence.current === mutationId) setEditionMutationKey('')
      }
    },
    [adminToken, loadWorkspace, useUiCheckFixture, workspace],
  )

  return (
    <main className="page-stack studio-page studio-ai-daily-workspace-page">
      <header className="page-hero">
        <div>
          <span className="section-subtitle">BIAU CONTENT STUDIO / AI DAILY OPERATIONS</span>
          <h1 className="section-title">AI Daily 工作区</h1>
          <p className="section-description">从来源健康、运行事件、原文证据到闪报修订和 Edition 审核，集中查看当前需要处理的动作。</p>
        </div>
        <div className="studio-ai-daily-hero-actions">
          <span className={`studio-status-pill ${editorialWriteEnabled ? 'is-warning' : 'is-muted'}`}>
            {editorialWriteEnabled ? '编辑操作已启用' : '只读预览'}
          </span>
          <Link className="studio-secondary-button" to="/studio">返回 Studio</Link>
          {selectedIssue && <Link className="studio-secondary-button" to={`/studio/ai-daily/${selectedIssue.id}`}>编辑当前 Issue</Link>}
        </div>
      </header>

      <section className="studio-card studio-ai-daily-token-card">
        <form className="studio-token-form" onSubmit={saveToken}>
          <label className="assistant-field">
            <span>Studio token</span>
            <input
              type="password"
              value={draftToken}
              onChange={(event) => setDraftToken(event.target.value)}
              placeholder="仅保存在当前浏览器"
              autoComplete="off"
            />
          </label>
          <div className="studio-actions">
            <button type="submit" className="studio-primary-button" disabled={isLoading}>
              <ShieldAlert size={16} aria-hidden="true" />
              保存并连接
            </button>
            <button type="button" className="studio-secondary-button" onClick={() => adminToken && void loadWorkspace(adminToken, selectedIssueIdRef.current)} disabled={!adminToken || isLoading}>
              <RefreshCw size={16} aria-hidden="true" />
              刷新
            </button>
            <button type="button" className="studio-secondary-button" onClick={clearToken} disabled={!adminToken && !draftToken}>
              清除
            </button>
          </div>
        </form>
        {statusText && <p className="assistant-status-text" role="status" aria-live="polite">{statusText}</p>}
      </section>

      {workspace && (
        <>
          <section className="studio-ai-daily-toolbar">
            <label className="assistant-field studio-ai-daily-issue-picker">
              <span>当前 Edition</span>
              <select value={selectedIssueId || selectedIssue?.id || ''} onChange={(event) => changeIssue(event.target.value)}>
                <option value="">最新一期</option>
                {workspace.issues.map((issue) => (
                  <option key={issue.id} value={issue.id}>{issue.date} · {issue.title}</option>
                ))}
              </select>
            </label>
            <div className="studio-ai-daily-summary" aria-label="AI Daily summary">
              <span><strong>{workspace.runs.length}</strong> runs</span>
              <span><strong>{workspace.sourceFeeds.length}</strong> feeds</span>
              <span><strong>{candidateCount(run)}</strong> candidates</span>
              <span><strong>{workspace.flashItems.length}</strong> flash items</span>
            </div>
          </section>

          <nav className="studio-ai-daily-tabs" aria-label="AI Daily 工作区视图" role="tablist">
             {tabs.map(({ id, label, icon: Icon }, index) => (
               <button
                key={id}
                id={`ai-daily-tab-${id}`}
                type="button"
                role="tab"
                aria-controls={`ai-daily-panel-${id}`}
                aria-selected={activeTab === id}
                 tabIndex={activeTab === id ? 0 : -1}
                 className={activeTab === id ? 'is-active' : ''}
                 onClick={() => changeTab(id)}
                 onKeyDown={(event) => handleTabKeyDown(event, index)}
               >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          {tabs.map(({ id }) => (
            <div
              key={id}
              id={`ai-daily-panel-${id}`}
              role="tabpanel"
              aria-labelledby={`ai-daily-tab-${id}`}
              hidden={activeTab !== id}
              tabIndex={0}
            >
              {id === 'runs' && <RunsView workspace={workspace} />}
              {id === 'sources' && <SourcesView workspace={workspace} />}
              {id === 'candidates' && (
                <CandidatesView
                  run={run}
                  topCandidates={topCandidates}
                  pendingKey={editorialMutationKey}
                  statusText={editorialMutationStatus}
                  onMutate={mutateEditorial}
                />
              )}
               {id === 'flash' && <FlashView workspace={workspace} pendingKey={flashMutationKey} statusText={flashMutationStatus} onMutate={mutateFlash} />}
              {id === 'edition' && (
                <EditionView
                  workspace={workspace}
                  pendingKey={editionMutationKey}
                  statusText={editionMutationStatus}
                  onMutate={mutateEdition}
                />
              )}
            </div>
          ))}
        </>
      )}

      {!workspace && !isLoading && <section className="studio-card studio-ai-daily-empty"><AlertTriangle size={20} aria-hidden="true" /><p>连接 Studio 后，这里会显示运行、来源、候选证据和审核动作。</p></section>}
    </main>
  )
}

function RunsView({ workspace }: { workspace: StudioAiDailyWorkspace }) {
  if (workspace.runs.length === 0) return <EmptyPanel title="暂无运行记录" detail="当前 Edition 还没有生成 run；先在生产操作任务中创建一次受控运行。" />
  return (
    <section className="studio-ai-daily-grid">
      {workspace.runs.map((run) => (
        <article className="studio-card studio-ai-daily-run-card" key={run.id}>
          <div className="studio-card__header">
            <div>
              <span className="section-subtitle">RUN {run.attemptNumber} · {run.editionDate}</span>
              <h2>{formatStatus(run.status)}</h2>
            </div>
            <span className={`studio-status-pill ${statusClass(run.status)}`}>{formatStatus(run.currentStage || run.status)}</span>
          </div>
          <dl className="studio-ai-daily-facts">
            <div><dt>profile</dt><dd>{run.profile}</dd></div>
            <div><dt>trigger</dt><dd>{run.trigger}</dd></div>
            <div><dt>events</dt><dd>{run.eventSequence}</dd></div>
            <div><dt>freshness</dt><dd>{formatDateTime(run.pipelineFreshnessAt)}</dd></div>
          </dl>
          {run.finalErrorCategory && <p className="studio-ai-daily-error"><AlertTriangle size={15} aria-hidden="true" />{run.finalErrorCategory}</p>}
          <div className="studio-ai-daily-event-list">
            {run.events.slice(0, 6).map((event) => <div key={event.id}><span>{event.sequence} · {formatStatus(event.kind)}</span><strong className={statusClass(event.outcome)}>{formatStatus(event.outcome)}</strong></div>)}
          </div>
        </article>
      ))}
    </section>
  )
}

function SourcesView({ workspace }: { workspace: StudioAiDailyWorkspace }) {
  if (workspace.sourceFeeds.length === 0) return <EmptyPanel title="暂无来源注册表" detail="来源注册表为空；先配置稳定来源，再让 discovery 进入受控运行。" />
  return (
    <section className="studio-ai-daily-grid">
      {workspace.sourceFeeds.map((feed) => (
        <article className="studio-card studio-ai-daily-source-card" key={feed.id}>
          <div className="studio-card__header"><div><h2>{feed.name}</h2><span>{feed.kind} · {feed.tier} · {feed.locale}</span></div><span className={`studio-status-pill ${statusClass(feed.healthStatus)}`}>{formatStatus(feed.healthStatus)}</span></div>
          <p className="studio-ai-daily-url">{feed.url}</p>
          <dl className="studio-ai-daily-facts"><div><dt>enabled</dt><dd>{feed.enabled ? '是' : '否'}</dd></div><div><dt>failures</dt><dd>{feed.consecutiveFailures}</dd></div><div><dt>last success</dt><dd>{formatDateTime(feed.lastSuccessfulAt)}</dd></div><div><dt>lag</dt><dd>{feed.lastLagMs === null ? '未记录' : `${feed.lastLagMs} ms`}</dd></div></dl>
          {feed.lastErrorCategory && <p className="studio-ai-daily-error"><AlertTriangle size={15} aria-hidden="true" />{feed.lastErrorCategory}</p>}
        </article>
      ))}
    </section>
  )
}

function CandidatesView({
  run,
  topCandidates,
  pendingKey,
  statusText,
  onMutate,
}: {
  run: StudioAiDailyWorkspaceRun | null
  topCandidates: StudioAiDailyWorkspaceCandidate[]
  pendingKey: string
  statusText: string
  onMutate: (request: EditorialOverrideRequest) => Promise<boolean>
}) {
  const [actor, setActor] = useState('站长')
  const [reason, setReason] = useState('')
  if (!run || topCandidates.length === 0) return <EmptyPanel title="暂无候选证据" detail="当前运行还没有候选或原文证据；不要把搜索摘要直接当作公开事实。" />
  return (
    <>
      <section className="studio-card studio-ai-daily-editorial-console">
        <div className="studio-ai-daily-editorial-fields">
          <label className="assistant-field">
            <span>编辑操作人</span>
            <input value={actor} maxLength={80} onChange={(event) => setActor(event.target.value)} autoComplete="name" />
          </label>
          <label className="assistant-field">
            <span>操作理由（可选）</span>
            <input value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} />
          </label>
        </div>
        <p className="assistant-status-text" role="status" aria-live="polite">{statusText || '选择候选或 cluster 后执行编辑覆盖。'}</p>
      </section>
      <section className="studio-ai-daily-two-column">
        <div className="studio-card">
          <div className="studio-card__header">
            <div><span className="section-subtitle">CANDIDATES</span><h2>候选证据</h2></div>
            <Filter size={18} aria-hidden="true" />
          </div>
          <div className="studio-ai-daily-item-list">
            {topCandidates.map((candidate) => (
              <CandidateCard
                candidate={candidate}
                runId={run.id}
                actor={actor.trim()}
                reason={reason.trim()}
                pending={pendingKey.includes(candidate.id)}
                onMutate={onMutate}
                key={candidate.id}
              />
            ))}
          </div>
        </div>
        <div className="studio-ai-daily-editorial-side">
          <ClusterBoard key={`${run.id}:${run.updatedAt}`} run={run} actor={actor.trim()} reason={reason.trim()} pendingKey={pendingKey} onMutate={onMutate} />
          <section className="studio-card">
            <div className="studio-card__header"><div><span className="section-subtitle">EVENTS</span><h2>运行事件</h2></div><Activity size={18} aria-hidden="true" /></div>
            <div className="studio-ai-daily-event-list studio-ai-daily-event-list--large">{run.events.map((event) => <div key={event.id}><span>{formatDateTime(event.createdAt)} · {formatStatus(event.stage || 'pipeline')}</span><strong className={statusClass(event.outcome)}>{formatStatus(event.outcome)}</strong>{event.errorCategory && <small>{event.errorCategory}</small>}</div>)}</div>
          </section>
          {run.overrides.length > 0 && (
            <section className="studio-card">
              <div className="studio-card__header"><div><span className="section-subtitle">AUDIT</span><h2>最近覆盖</h2></div><ShieldAlert size={18} aria-hidden="true" /></div>
              <div className="studio-ai-daily-event-list">{run.overrides.slice(0, 8).map((override) => <div key={override.id}><span>{formatDateTime(override.createdAt)} · {formatStatus(override.action)}</span><strong>{override.actor}</strong>{override.reason && <small>{override.reason}</small>}</div>)}</div>
            </section>
          )}
        </div>
      </section>
    </>
  )
}

function ClusterBoard({
  run,
  actor,
  reason,
  pendingKey,
  onMutate,
}: {
  run: StudioAiDailyWorkspaceRun
  actor: string
  reason: string
  pendingKey: string
  onMutate: (request: EditorialOverrideRequest) => Promise<boolean>
}) {
  const orderedClusters = useMemo(
    () => [...run.clusters].sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)),
    [run.clusters],
  )
  const [orderedIds, setOrderedIds] = useState(() => orderedClusters.map((cluster) => cluster.id))
  const [primaryId, setPrimaryId] = useState(orderedClusters[0]?.id ?? '')
  const [secondaryId, setSecondaryId] = useState(orderedClusters[1]?.id ?? '')
  const [splitClusterId, setSplitClusterId] = useState(orderedClusters[0]?.id ?? '')
  const [splitCandidateIds, setSplitCandidateIds] = useState<string[]>([])
  const [splitStableIdentityKey, setSplitStableIdentityKey] = useState('')

  const byId = new Map(run.clusters.map((cluster) => [cluster.id, cluster]))
  const splitCluster = byId.get(splitClusterId)
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= orderedIds.length) return
    const next = [...orderedIds]
    const [item] = next.splice(index, 1)
    if (!item) return
    next.splice(target, 0, item)
    setOrderedIds(next)
  }
  const submitOrder = () => {
    if (!actor || pendingKey) return
    void onMutate({ kind: 'reorder', runId: run.id, actor, reason: reason || undefined, expectedUpdatedAt: run.updatedAt, orderedClusterIds: orderedIds })
  }
  const submitMerge = () => {
    const primary = byId.get(primaryId)
    const secondary = byId.get(secondaryId)
    if (!primary || !secondary || primary.id === secondary.id || !actor || pendingKey) return
    void onMutate({ kind: 'merge', runId: run.id, actor, reason: reason || undefined, expectedUpdatedAt: primary.updatedAt, clusterId: primary.id, secondaryClusterId: secondary.id, secondaryExpectedUpdatedAt: secondary.updatedAt })
  }
  const submitSplit = () => {
    if (!splitCluster || !actor || !splitStableIdentityKey.trim() || splitCandidateIds.length === 0 || pendingKey) return
    void onMutate({ kind: 'split', runId: run.id, actor, reason: reason || undefined, expectedUpdatedAt: splitCluster.updatedAt, clusterId: splitCluster.id, splitCandidateIds, splitStableIdentityKey: splitStableIdentityKey.trim() })
  }
  return (
    <section className="studio-card studio-ai-daily-cluster-board">
      <div className="studio-card__header"><div><span className="section-subtitle">CLUSTERS</span><h2>事件聚类</h2></div><Layers3 size={18} aria-hidden="true" /></div>
      {orderedClusters.length === 0 ? <p className="studio-ai-daily-muted">当前运行还没有 cluster。</p> : (
        <>
          <div className="studio-ai-daily-cluster-list">
            {orderedIds.map((id, index) => {
              const cluster = byId.get(id)
              if (!cluster) return null
              return <div className="studio-ai-daily-cluster-row" key={cluster.id}>
                <div className="studio-ai-daily-cluster-rank">{index + 1}</div>
                <div className="studio-ai-daily-cluster-main"><strong>{cluster.topic || cluster.stableIdentityKey}</strong><span>{cluster.candidateIds.length} candidates · {formatStatus(cluster.editorState)}</span></div>
                <div className="studio-ai-daily-cluster-move" aria-label={`${cluster.stableIdentityKey} 排序`}>
                  <button type="button" className="studio-icon-button" aria-label="上移 cluster" disabled={index === 0 || Boolean(pendingKey)} onClick={() => move(index, -1)}><ChevronUp size={16} aria-hidden="true" /></button>
                  <button type="button" className="studio-icon-button" aria-label="下移 cluster" disabled={index === orderedIds.length - 1 || Boolean(pendingKey)} onClick={() => move(index, 1)}><ChevronDown size={16} aria-hidden="true" /></button>
                </div>
              </div>
            })}
          </div>
          <button type="button" className="studio-secondary-button" disabled={!actor || Boolean(pendingKey) || orderedIds.every((id, index) => id === orderedClusters[index]?.id)} onClick={submitOrder}><CheckCircle2 size={15} aria-hidden="true" />保存排序</button>
          <div className="studio-ai-daily-cluster-tool">
            <label className="assistant-field"><span>主 cluster</span><select value={primaryId} onChange={(event) => setPrimaryId(event.target.value)}>{orderedClusters.map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.topic || cluster.stableIdentityKey}</option>)}</select></label>
            <label className="assistant-field"><span>合并来源</span><select value={secondaryId} onChange={(event) => setSecondaryId(event.target.value)}>{orderedClusters.map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.topic || cluster.stableIdentityKey}</option>)}</select></label>
            <button type="button" className="studio-secondary-button" disabled={!actor || Boolean(pendingKey) || !primaryId || !secondaryId || primaryId === secondaryId} onClick={submitMerge}><GitMerge size={15} aria-hidden="true" />合并</button>
          </div>
          <div className="studio-ai-daily-cluster-tool">
            <label className="assistant-field"><span>拆分 cluster</span><select value={splitClusterId} onChange={(event) => { setSplitClusterId(event.target.value); setSplitCandidateIds([]) }}>{orderedClusters.map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.topic || cluster.stableIdentityKey}</option>)}</select></label>
            <label className="assistant-field"><span>新 identity key</span><input value={splitStableIdentityKey} maxLength={160} placeholder="topic:variant" onChange={(event) => setSplitStableIdentityKey(event.target.value)} /></label>
            <div className="studio-ai-daily-split-candidates">{(splitCluster?.candidateIds ?? []).map((candidateId) => <label key={candidateId}><input type="checkbox" checked={splitCandidateIds.includes(candidateId)} onChange={(event) => setSplitCandidateIds((current) => event.target.checked ? [...current, candidateId] : current.filter((id) => id !== candidateId))} />{candidateId}</label>)}</div>
            <button type="button" className="studio-secondary-button" disabled={!actor || Boolean(pendingKey) || !splitStableIdentityKey.trim() || splitCandidateIds.length === 0} onClick={submitSplit}><Scissors size={15} aria-hidden="true" />拆分</button>
          </div>
        </>
      )}
    </section>
  )
}

function correctionFormFromRevision(
  revision: StudioAiDailyWorkspaceFlash['revisions'][number],
): FlashCorrectionForm {
  return {
    title: revision.title,
    factSummary: revision.factSummary,
    whyItMatters: revision.whyItMatters,
    uncertainty: revision.uncertainty ?? '',
    reason: '',
  }
}

function FlashView({
  workspace,
  pendingKey,
  statusText,
  onMutate,
}: {
  workspace: StudioAiDailyWorkspace
  pendingKey: string
  statusText: string
  onMutate: (request: FlashMutationRequest) => Promise<boolean>
}) {
  const [actor, setActor] = useState('站长')
  if (workspace.flashItems.length === 0) return <EmptyPanel title="暂无 Flash 修订" detail="闪报会在候选经过证据绑定和编辑提交后进入这里。" />
  return (
    <>
      <section className="studio-card studio-ai-daily-flash-console">
        <label className="assistant-field">
          <span>审核操作人</span>
          <input value={actor} maxLength={80} onChange={(event) => setActor(event.target.value)} autoComplete="name" />
        </label>
        <p>批准、暂挂、恢复和撤回都会写入审计记录；修正会创建新的 Draft revision，不覆盖已批准内容。</p>
        <p className="assistant-status-text" aria-live="polite">{statusText}</p>
      </section>
      <section className="studio-ai-daily-grid">
        {workspace.flashItems.map((item) => (
          <FlashCard
            key={item.id}
            item={item}
            actor={actor.trim()}
            pending={pendingKey.startsWith(`${item.id}:`)}
            onMutate={onMutate}
            issueId={workspace.selectedIssue?.id ?? null}
          />
        ))}
      </section>
    </>
  )
}

function FlashCard({
  item,
  actor,
  pending,
  onMutate,
  issueId,
}: {
  item: StudioAiDailyWorkspaceFlash
  actor: string
  pending: boolean
  onMutate: (request: FlashMutationRequest) => Promise<boolean>
  issueId: string | null
}) {
  const draftRevision = item.revisions.find((revision) => revision.status === 'draft') ?? null
  const approvedRevision = item.currentApprovedRevisionId
    ? item.revisions.find((revision) => revision.id === item.currentApprovedRevisionId && revision.status === 'approved') ?? null
    : null
  const revision = draftRevision ?? approvedRevision ?? item.revisions[0] ?? null
  const [reason, setReason] = useState('')
  const [showCorrection, setShowCorrection] = useState(false)
  const [correction, setCorrection] = useState<FlashCorrectionForm | null>(null)
  const canAct = Boolean(actor) && !pending
  const openCorrection = () => {
    if (!approvedRevision) return
    setCorrection(correctionFormFromRevision(approvedRevision))
    setShowCorrection(true)
  }
  const submitRevisionAction = (kind: 'approve' | 'reject') => {
    if (!draftRevision) return
    void onMutate({
      kind,
      itemId: item.id,
      revisionId: draftRevision.id,
      observedRevisionNumber: draftRevision.revisionNumber,
      expectedPublicRevision: item.publicRevision,
      actor,
      reason: reason.trim() || undefined,
    })
  }
  const submitLifecycleAction = (kind: 'hold' | 'release' | 'withdraw') => {
    if (kind === 'withdraw' && !window.confirm('确认撤回这条 Flash？撤回后不能恢复。')) return
    void onMutate({
      kind,
      itemId: item.id,
      expectedPublicRevision: item.publicRevision,
      actor,
      reason: reason.trim() || undefined,
    })
  }
  const submitCorrection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!approvedRevision || !correction) return
    const ok = await onMutate({
      kind: 'correction',
      itemId: item.id,
      expectedPublicRevision: item.publicRevision,
      expectedRevisionSequence: item.revisionSequence,
      sourceRevisionId: approvedRevision.id,
      actor,
      reason: correction.reason.trim() || undefined,
      correction: {
        title: correction.title.trim(),
        factSummary: correction.factSummary.trim(),
        whyItMatters: correction.whyItMatters.trim(),
        uncertainty: correction.uncertainty.trim(),
        editor: actor,
      },
    })
    if (ok) setShowCorrection(false)
  }
  const updateCorrection = (field: keyof FlashCorrectionForm, value: string) => {
    setCorrection((current) => (current ? { ...current, [field]: value } : current))
  }
  const correctionReady = Boolean(
    correction?.title.trim() && correction.factSummary.trim() && correction.whyItMatters.trim(),
  )
  return (
    <article className="studio-card studio-ai-daily-flash-card">
      <div className="studio-card__header">
        <div>
          <span className="section-subtitle">{item.publicId} · PUBLIC REV {item.publicRevision}</span>
          <h2>{revision?.title || '未提交修订'}</h2>
        </div>
        <span className={`studio-status-pill ${statusClass(item.lifecycleState)}`}>{formatStatus(item.lifecycleState)}</span>
      </div>
      {revision ? (
        <>
          <p>{revision.factSummary}</p>
          <p className="studio-ai-daily-muted">为什么重要：{revision.whyItMatters}</p>
          {revision.uncertainty && <p className="studio-ai-daily-muted">不确定性：{revision.uncertainty}</p>}
          <div className="studio-ai-daily-item__meta">
            <span>revision {revision.revisionNumber}</span>
            <span>citations {revision.citationCount}</span>
            <span>{formatStatus(revision.status)}</span>
          </div>
        </>
      ) : (
        <p>当前没有可供审核的 revision。</p>
      )}
      <label className="assistant-field studio-ai-daily-flash-reason">
        <span>操作理由{item.lifecycleState === 'withdrawn' ? '' : '（驳回或撤回时必填）'}</span>
        <textarea value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} rows={2} />
      </label>
      <div className="studio-ai-daily-flash-actions" aria-label={`${item.publicId} 审核动作`}>
        {draftRevision && (
          <>
            <button type="button" className="studio-primary-button" disabled={!canAct} onClick={() => submitRevisionAction('approve')}>
              <CheckCircle2 size={16} aria-hidden="true" />批准 Revision {draftRevision.revisionNumber}
            </button>
            <button type="button" className="studio-secondary-button" disabled={!canAct || !reason.trim()} onClick={() => submitRevisionAction('reject')}>
              <XCircle size={16} aria-hidden="true" />驳回 Revision {draftRevision.revisionNumber}
            </button>
          </>
        )}
        {item.lifecycleState === 'active' && (
          <button type="button" className="studio-secondary-button" disabled={!canAct} onClick={() => submitLifecycleAction('hold')}>
            <CirclePause size={16} aria-hidden="true" />暂挂 Flash
          </button>
        )}
        {item.lifecycleState === 'held' && (
          <button type="button" className="studio-secondary-button" disabled={!canAct} onClick={() => submitLifecycleAction('release')}>
            <CirclePlay size={16} aria-hidden="true" />恢复 Flash
          </button>
        )}
        {item.lifecycleState !== 'withdrawn' && (
          <button type="button" className="studio-secondary-button studio-ai-daily-danger-button" disabled={!canAct || !reason.trim()} onClick={() => submitLifecycleAction('withdraw')}>
            <Trash2 size={16} aria-hidden="true" />撤回 Flash
          </button>
        )}
        {approvedRevision && item.lifecycleState !== 'withdrawn' && (
          <button type="button" className="studio-secondary-button" disabled={!canAct} onClick={openCorrection}>
            <PencilLine size={16} aria-hidden="true" />创建修正
          </button>
        )}
      </div>
      {pending && <p className="studio-ai-daily-muted" role="status">正在提交 Flash 操作…</p>}
      {showCorrection && correction && approvedRevision && (
        <form className="studio-ai-daily-correction-form" onSubmit={submitCorrection}>
          <div className="studio-card__header">
            <div><span className="section-subtitle">CORRECTION DRAFT</span><h3>基于 Revision {approvedRevision.revisionNumber} 创建修正</h3></div>
            <button type="button" className="studio-icon-button" aria-label="关闭修正表单" onClick={() => setShowCorrection(false)}><XCircle size={17} aria-hidden="true" /></button>
          </div>
          <label className="assistant-field"><span>标题</span><input value={correction.title} maxLength={240} onChange={(event) => updateCorrection('title', event.target.value)} /></label>
          <label className="assistant-field"><span>事实摘要</span><textarea value={correction.factSummary} maxLength={6000} rows={4} onChange={(event) => updateCorrection('factSummary', event.target.value)} /></label>
          <label className="assistant-field"><span>为什么重要</span><textarea value={correction.whyItMatters} maxLength={6000} rows={4} onChange={(event) => updateCorrection('whyItMatters', event.target.value)} /></label>
          <label className="assistant-field"><span>不确定性</span><textarea value={correction.uncertainty} maxLength={2000} rows={3} onChange={(event) => updateCorrection('uncertainty', event.target.value)} /></label>
          <label className="assistant-field"><span>修正理由</span><textarea value={correction.reason} maxLength={1000} rows={2} onChange={(event) => updateCorrection('reason', event.target.value)} /></label>
          <button type="submit" className="studio-primary-button" disabled={!canAct || !correctionReady}>提交修正草稿</button>
        </form>
      )}
      <div className="studio-ai-daily-flash-history" aria-label="最近审计记录">
        {item.approvalActions.slice(0, 3).map((action) => (
          <span key={action.id}>{formatStatus(action.action)} · {action.actor} · {formatDateTime(action.createdAt)}</span>
        ))}
      </div>
      <Link className="studio-inline-link" to={issueId ? `/studio/ai-daily/${issueId}` : '/studio/ai-daily'}>进入 Issue 审核</Link>
    </article>
  )
}

function editionCorrectionFormFromRevision(revision: StudioEditionRevision): EditionCorrectionForm | null {
  if (!revision.content) return null
  return {
    title: revision.content.title,
    subtitle: revision.content.subtitle,
    introduction: revision.content.introduction.text,
    events: revision.content.events.map((event) => ({
      eventId: event.eventId,
      title: event.title,
      factSummary: event.factSummary.text,
      whyItMatters: event.whyItMatters.text,
      uncertainty: event.uncertainty,
      claimIds: event.claimIds,
    })),
    trends: revision.content.trends.map((trend) => trend.text).join('\n'),
    reason: '',
  }
}

function EditionView({
  workspace,
  pendingKey,
  statusText,
  onMutate,
}: {
  workspace: StudioAiDailyWorkspace
  pendingKey: string
  statusText: string
  onMutate: (request: EditionMutationRequest) => Promise<boolean>
}) {
  const edition = workspace.edition
  const [actor, setActor] = useState('站长')
  if (!edition) return <EmptyPanel title="暂无 Edition" detail="先创建一期 AI Daily issue，并绑定来源和 brief。" />
  const canWrite = Boolean(actor.trim()) && !pendingKey
  const submitManualDraft = () => {
    void onMutate({ kind: 'manual-draft', issueId: edition.issue.id, actor: actor.trim(), expectedIssueUpdatedAt: edition.issue.updatedAt })
  }
  return (
    <>
      <section className="studio-card studio-ai-daily-editorial-console">
        <div className="studio-ai-daily-editorial-fields">
          <label className="assistant-field"><span>Edition 操作人</span><input value={actor} maxLength={80} onChange={(event) => setActor(event.target.value)} autoComplete="name" /></label>
          <div className="studio-ai-daily-edition-actions">
            {!edition.draft && <button type="button" className="studio-primary-button" disabled={!canWrite} onClick={submitManualDraft}><FileText size={15} aria-hidden="true" />创建人工草稿</button>}
            <Link className="studio-secondary-button" to={`/studio/ai-daily/${edition.issue.id}`}>打开 Issue 编辑</Link>
          </div>
        </div>
        <p className="assistant-status-text" role="status" aria-live="polite">{statusText || '人工草稿与辅助草稿都必须经过 Content Studio 审核。'}</p>
      </section>
      <section className="studio-ai-daily-two-column">
        <article className="studio-card">
          <div className="studio-card__header"><div><span className="section-subtitle">EDITION {edition.issue.date}</span><h2>{edition.issue.title}</h2></div><span className={`studio-status-pill ${statusClass(edition.issue.workflowState)}`}>{formatStatus(edition.issue.workflowState)}</span></div>
          <dl className="studio-ai-daily-facts"><div><dt>selection</dt><dd>v{edition.issue.selectionVersion}</dd></div><div><dt>evidence</dt><dd>v{edition.issue.selectedEvidenceVersion}</dd></div><div><dt>generated</dt><dd>{edition.issue.generatedRevisionSequence}</dd></div><div><dt>public</dt><dd>{edition.issue.deployedPublicAt ? formatDateTime(edition.issue.deployedPublicAt) : '未发布'}</dd></div></dl>
          {edition.draft ? <div className="studio-ai-daily-review-box"><strong>{edition.draft.title}</strong><span>{formatStatus(edition.draft.status)} · {formatStatus(edition.draft.visibility)}</span>{edition.draft.latestReview && <p>最新审核：{formatStatus(edition.draft.latestReview.status)} · {edition.draft.latestReview.notes || '无备注'}</p>}<Link className="studio-inline-link" to={`/studio?draft=${edition.draft.id}`}>打开草稿审核</Link></div> : <p className="studio-ai-daily-muted">还没有进入 ContentDraft 审核流程。</p>}
        </article>
        <article className="studio-card">
          <div className="studio-card__header"><div><span className="section-subtitle">GENERATED REVISIONS</span><h2>生成与验证</h2></div><CheckCircle2 size={18} aria-hidden="true" /></div>
          {edition.generatedRevisions.length === 0 ? <p className="studio-ai-daily-muted">暂无生成修订。</p> : <div className="studio-ai-daily-revision-list">{edition.generatedRevisions.map((revision) => <GeneratedRevisionCard key={revision.id} issue={edition.issue} draft={edition.draft} revision={revision} actor={actor.trim()} canWrite={canWrite} pendingKey={pendingKey} onMutate={onMutate} />)}</div>}
        </article>
      </section>
    </>
  )
}

function GeneratedRevisionCard({
  issue,
  draft,
  revision,
  actor,
  canWrite,
  pendingKey,
  onMutate,
}: {
  issue: StudioEdition['issue']
  draft: StudioEdition['draft']
  revision: StudioEditionRevision
  actor: string
  canWrite: boolean
  pendingKey: string
  onMutate: (request: EditionMutationRequest) => Promise<boolean>
}) {
  const [showCorrection, setShowCorrection] = useState(false)
  const [correction, setCorrection] = useState<EditionCorrectionForm | null>(null)
  const [correctionIdempotencyKey, setCorrectionIdempotencyKey] = useState('')
  const [discardReason, setDiscardReason] = useState('')
  const openCorrection = () => {
    const next = editionCorrectionFormFromRevision(revision)
    if (next) {
      setCorrection(next)
      setCorrectionIdempotencyKey(`edition:${issue.id}:${revision.id}:${Date.now()}`.slice(0, 120))
      setShowCorrection(true)
    }
  }
  const updateCorrection = (field: keyof EditionCorrectionForm, value: string) => {
    setCorrection((current) => current ? { ...current, [field]: value } : current)
  }
  const updateEvent = (index: number, field: 'title' | 'factSummary' | 'whyItMatters' | 'uncertainty', value: string) => {
    setCorrection((current) => current ? { ...current, events: current.events.map((event, eventIndex) => eventIndex === index ? { ...event, [field]: value } : event) } : current)
  }
  const submitCorrection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!correction || !actor) return
    const content = {
      title: correction.title.trim(), subtitle: correction.subtitle.trim(), introduction: { text: correction.introduction.trim(), claimIds: revision.content?.introduction.claimIds ?? [] },
      events: correction.events.map((item) => ({ ...item, title: item.title.trim(), factSummary: { text: item.factSummary.trim(), claimIds: item.claimIds }, whyItMatters: { text: item.whyItMatters.trim(), claimIds: item.claimIds } })),
      trends: correction.trends.split('\n').map((text) => text.trim()).filter(Boolean).map((text, index) => ({ text, claimIds: revision.content?.trends[index]?.claimIds ?? revision.content?.introduction.claimIds ?? [] })),
    }
    const succeeded = await onMutate({ kind: 'correction', issueId: issue.id, revisionId: revision.id, expectedRevisionNumber: revision.revisionNumber, expectedIssueUpdatedAt: issue.updatedAt, actor, reason: correction.reason.trim() || undefined, idempotencyKey: correctionIdempotencyKey, content })
    if (succeeded) setShowCorrection(false)
  }
  const submitAction = (kind: 'revalidate' | 'apply' | 'discard') => {
    const reason = discardReason.trim()
    if (kind === 'discard' && !reason) return
    if (kind === 'discard' && !window.confirm('确认丢弃这条 generated revision？')) return
    void onMutate({ kind, issueId: issue.id, revisionId: revision.id, expectedRevisionNumber: revision.revisionNumber, expectedIssueUpdatedAt: issue.updatedAt, expectedDraftUpdatedAt: draft?.updatedAt ?? revision.observedDraftUpdatedAt ?? undefined, actor, reason: kind === 'discard' ? reason : undefined })
  }
  const pending = pendingKey.includes(revision.id)
  const canCorrect = Boolean(revision.content) && !['applied', 'discarded'].includes(revision.applyState)
  const canRevalidate = ['pending', 'blocked'].includes(revision.applyState)
  const canApply = revision.validationStatus === 'valid' && canRevalidate
  return (
    <div className="studio-ai-daily-revision-card">
      <div className="studio-ai-daily-revision-card__header"><div><strong>Revision {revision.revisionNumber}</strong><span>{formatStatus(revision.revisionKind)} · {formatStatus(revision.validationStatus)} · {formatStatus(revision.applyState)}</span></div><small>{revision.modelRole} / {revision.modelIdentifier}</small></div>
      {revision.content && <div className="studio-ai-daily-revision-preview"><strong>{revision.content.title}</strong><p>{revision.content.introduction.text}</p><span>{revision.content.events.length} events · {revision.content.trends.length} trends · {revision.citationCount} citations</span></div>}
      {revision.validationFindings.length > 0 && <div className="studio-ai-daily-findings">{revision.validationFindings.map((finding, index) => <span className={statusClass(finding.severity)} key={`${finding.code}-${index}`}>{finding.code}</span>)}</div>}
      <div className="studio-ai-daily-revision-actions">
        {canCorrect && <button type="button" className="studio-secondary-button" disabled={!canWrite || pending} onClick={openCorrection}><PencilLine size={15} aria-hidden="true" />编辑修正</button>}
        {canRevalidate && <button type="button" className="studio-secondary-button" disabled={!canWrite || pending} onClick={() => submitAction('revalidate')}><RefreshCw size={15} aria-hidden="true" />重新验证</button>}
        {canApply && <button type="button" className="studio-primary-button" disabled={!canWrite || pending} onClick={() => submitAction('apply')}><CheckCircle2 size={15} aria-hidden="true" />应用到草稿</button>}
        {canRevalidate && <button type="button" className="studio-secondary-button studio-ai-daily-danger-button" disabled={!canWrite || pending || !discardReason.trim()} onClick={() => submitAction('discard')}><Trash2 size={15} aria-hidden="true" />丢弃</button>}
      </div>
      {canRevalidate && <label className="assistant-field studio-ai-daily-revision-discard"><span>丢弃理由</span><input value={discardReason} maxLength={1000} onChange={(event) => setDiscardReason(event.target.value)} placeholder="必填，写入审计记录" /></label>}
      <small className="studio-ai-daily-revision-meta">{revision.validationFindingCount} findings · {formatDateTime(revision.revalidatedAt ?? revision.createdAt)}{revision.validatedBy ? ` · ${revision.validatedBy}` : ''}</small>
      {pending && <span className="studio-ai-daily-muted" role="status">正在提交 Edition 操作…</span>}
      {showCorrection && correction && (
        <form className="studio-ai-daily-correction-form" onSubmit={submitCorrection}>
          <div className="studio-card__header"><div><span className="section-subtitle">EDITION CORRECTION</span><h3>基于 Revision {revision.revisionNumber} 创建修正版</h3></div><button type="button" className="studio-icon-button" aria-label="关闭 Edition 修正表单" onClick={() => setShowCorrection(false)}><XCircle size={17} aria-hidden="true" /></button></div>
          <label className="assistant-field"><span>标题</span><input value={correction.title} maxLength={240} onChange={(event) => updateCorrection('title', event.target.value)} /></label>
          <label className="assistant-field"><span>副标题</span><input value={correction.subtitle} maxLength={600} onChange={(event) => updateCorrection('subtitle', event.target.value)} /></label>
          <label className="assistant-field"><span>导语</span><textarea value={correction.introduction} maxLength={1200} rows={3} onChange={(event) => updateCorrection('introduction', event.target.value)} /></label>
          {correction.events.map((item, index) => <fieldset className="studio-ai-daily-event-edit" key={item.eventId}><legend>{item.eventId}</legend><label className="assistant-field"><span>事件标题</span><input value={item.title} maxLength={240} onChange={(event) => updateEvent(index, 'title', event.target.value)} /></label><label className="assistant-field"><span>事实摘要</span><textarea value={item.factSummary} maxLength={1200} rows={3} onChange={(event) => updateEvent(index, 'factSummary', event.target.value)} /></label><label className="assistant-field"><span>影响判断</span><textarea value={item.whyItMatters} maxLength={1200} rows={3} onChange={(event) => updateEvent(index, 'whyItMatters', event.target.value)} /></label><label className="assistant-field"><span>不确定性</span><input value={item.uncertainty} maxLength={40} onChange={(event) => updateEvent(index, 'uncertainty', event.target.value)} /></label></fieldset>)}
          <label className="assistant-field"><span>趋势（每行一条）</span><textarea value={correction.trends} maxLength={2400} rows={3} onChange={(event) => updateCorrection('trends', event.target.value)} /></label>
          <label className="assistant-field"><span>修正理由</span><textarea value={correction.reason} maxLength={1000} rows={2} onChange={(event) => updateCorrection('reason', event.target.value)} /></label>
          <button type="submit" className="studio-primary-button" disabled={!canWrite || pending || !correction.title.trim() || !correction.introduction.trim() || correction.events.some((item) => !item.title.trim() || !item.factSummary.trim() || !item.whyItMatters.trim())}>提交修正版</button>
        </form>
      )}
    </div>
  )
}

function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return <section className="studio-card studio-ai-daily-empty"><AlertTriangle size={20} aria-hidden="true" /><div><h2>{title}</h2><p>{detail}</p></div></section>
}
