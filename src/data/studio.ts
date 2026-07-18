export const STUDIO_STORAGE_KEYS = {
  adminToken: 'biau-studio-admin-token',
} as const

export type StudioDraftStatus = 'draft' | 'review-needed' | 'approved' | 'published' | 'rejected' | 'archived'
export type StudioReviewStatus = 'pending' | 'approved' | 'needs-changes' | 'rejected'
export type StudioVisibility = 'hidden' | 'featured' | 'archive'
export type StudioAiDailyIssueStatus =
  | 'source-collected'
  | 'extracted'
  | 'summarized'
  | 'synthesized'
  | 'review-needed'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'needs-more-evidence'
export type StudioSourceTier =
  | 'official-primary'
  | 'official-secondary'
  | 'trusted-aggregator'
  | 'community-generated'
  | 'manual-candidate'

export interface StudioHealth {
  ok: boolean
  service: string
  database: boolean
  auth: string
  publishMode: string
}

export interface StudioContentBlock {
  type: 'paragraph' | 'heading' | 'list' | 'image' | 'flow' | 'source-card'
  text?: string
  level?: number
  items?: string[]
  src?: string
  alt?: string
  caption?: string
  mermaid?: string
  sourceItemId?: string
  citationSnapshot?: StudioCitationSnapshotV2
}

export interface StudioCitationSnapshotV2 {
  version: 2
  sourceItemId: string | null
  evidenceId: string | null
  title: string
  publisher: string
  originalUrl: string
  canonicalUrl: string
  publishedAt: string | null
  retrievedAt: string
  excerpt: string
  locator?: {
    heading?: string
    startChar?: number
    endChar?: number
  }
  contentHash?: string
}

export interface StudioContentBody {
  blocks: StudioContentBlock[]
}

export interface StudioReview {
  id: string
  draftId: string
  status: StudioReviewStatus
  checklist: {
    sourceChecked: boolean
    safetyChecked: boolean
    publicReady: boolean
    pageKind?: string
    pageExportTarget?: string
    pageChecks?: string[]
  }
  notes: string
  reviewedBy: string | null
  reviewedAt: string
}

export interface StudioDraft {
  id: string
  slug: string
  title: string
  column: string
  tag: string
  detail: string
  readTime: string
  bodyJson: StudioContentBody
  knowledgePoints: string[]
  projectIds: string[]
  status: StudioDraftStatus
  visibility: StudioVisibility
  aiAssistance: string
  createdBy: string | null
  updatedBy: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  latestReview: StudioReview | null
}

export interface StudioSourceItem {
  id: string
  title: string
  url: string
  sourceName: string
  sourceTier: StudioSourceTier
  language: string
  publishedAt: string | null
  capturedAt: string
  rawExcerpt: string | null
  summary: string
  tags: string[]
  riskFlags: string[]
  createdAt: string
  updatedAt: string
}

export interface StudioAiDailyIssue {
  id: string
  date: string
  title: string
  status: StudioAiDailyIssueStatus
  sourceIds: string[]
  briefJson: unknown
  draftId: string | null
  createdAt: string
  updatedAt: string
}

export interface StudioAiDailyIssueDetail {
  issue: StudioAiDailyIssue
  sources: StudioSourceItem[]
  draft: StudioDraft | null
}

export interface StudioAiDailyWorkspaceIssue extends StudioAiDailyIssue {
  editionDate: string | null
  workflowState: string
  brief: {
    summary: string
    publicAngle: string
    keySignals: string[]
    toVerify: string[]
  } | null
  selectionVersion: number
  selectedEvidenceVersion: number
  generatedRevisionSequence: number
  latestGeneratedRevisionId: string | null
  newEvidenceAvailable: boolean
  deployedPublicAt: string | null
}

export interface StudioAiDailyWorkspaceRunEvent {
  id: string
  sequence: number
  stage: string | null
  kind: string
  outcome: string
  providerRole: string | null
  attemptNumber: number | null
  errorCategory: string | null
  durationMs: number | null
  createdAt: string
}

export interface StudioAiDailyWorkspaceCandidate {
  id: string
  clusterId: string | null
  sourceFeedId: string | null
  providerKind: string
  providerRole: string
  title: string
  publisher: string
  publisherDomain: string
  canonicalUrl: string
  publishedAt: string | null
  observedAt: string
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
    fetchedAt: string
    expiresAt: string
    originalUrl: string
    canonicalUrl: string
    title: string
    publisher: string
  } | null
  updatedAt: string
}

export interface StudioAiDailyWorkspaceRun {
  id: string
  issueId: string | null
  editionDate: string
  profile: string
  trigger: string
  attemptNumber: number
  eventSequence: number
  status: string
  currentStage: string | null
  configVersion: string
  startedAt: string | null
  finishedAt: string | null
  newestPublishedAt: string | null
  lastCollectedAt: string | null
  lastFetchedAt: string | null
  pipelineFreshnessAt: string | null
  endToEndLagMs: number | null
  counters: unknown
  finalErrorCategory: string | null
  createdAt: string
  updatedAt: string
  events: StudioAiDailyWorkspaceRunEvent[]
  workItems: Array<{
    id: string
    kind: string
    sourceFeedId: string | null
    sourceFeedName: string | null
    priority: number
    status: string
    attemptCount: number
    maxAttempts: number
    lastErrorCategory: string | null
    completedAt: string | null
    updatedAt: string
  }>
  candidates: StudioAiDailyWorkspaceCandidate[]
  clusters: Array<{
    id: string
    candidateIds: string[]
    stableIdentityKey: string
    groupingReason: string
    topic: string
    corroborationCount: number
    scoreTotal: number | null
    rank: number | null
    selectedAt: string | null
    editorState: string
    editorReason: string | null
    updatedAt: string
  }>
  overrides: Array<{
    id: string
    runId: string
    candidateId: string | null
    clusterId: string | null
    action: string
    actor: string
    reason: string | null
    expectedUpdatedAt: string | null
    observedVersion: number | null
    createdAt: string
  }>
}

export interface StudioAiDailyWorkspaceFeed {
  id: string
  name: string
  kind: string
  url: string
  canonicalKey: string
  locale: string
  tier: string
  enabled: boolean
  intervalMinutes: number
  nextCollectAt: string | null
  lastAttemptedAt: string | null
  lastSuccessfulAt: string | null
  consecutiveFailures: number
  healthStatus: string
  lastLagMs: number | null
  lastErrorCategory: string | null
  updatedAt: string
}

export interface StudioAiDailyWorkspaceFlash {
  id: string
  publicId: string
  stableEventKey: string
  sourceClusterIdentity: string
  lifecycleState: string
  currentApprovedRevisionId: string | null
  revisionSequence: number
  publicRevision: number
  lastApprovedAt: string | null
  withdrawnAt: string | null
  projectionUpdatedAt: string | null
  createdAt: string
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
    approvedAt: string | null
    createdAt: string
    citationCount: number
  }>
  approvalActions: Array<{
    id: string
    action: string
    actor: string
    reason: string | null
    observedRevisionNumber: number | null
    createdAt: string
  }>
}

export interface StudioAiDailyWorkspaceRevision {
  id: string
  revisionNumber: number
  revisionKind: string
  sourceRevisionId: string | null
  selectionVersion: number
  evidenceVersion: number
  promptVersion: string
  schemaVersion: string
  modelRole: string
  modelIdentifier: string
  applyState: string
  validationStatus: string
  validationFindingCount: number
  projectionDraftId: string | null
  createdBy: string
  createdAt: string
  appliedAt: string | null
  observedDraftUpdatedAt: string | null
  revalidatedAt: string | null
  validatedBy: string | null
  discardedAt: string | null
  discardedBy: string | null
  discardReason: string | null
  contentBlockCount: number
  citationCount: number
  validationFindings: Array<{ severity: string; code: string }>
  content: {
    title: string
    subtitle: string
    introduction: { text: string; claimIds: string[] }
    events: Array<{
      eventId: string
      title: string
      factSummary: { text: string; claimIds: string[] }
      whyItMatters: { text: string; claimIds: string[] }
      uncertainty: string
      claimIds: string[]
    }>
    trends: Array<{ text: string; claimIds: string[] }>
  } | null
}

export interface StudioAiDailyWorkspace {
  generatedAt: string
  selectedIssue: StudioAiDailyWorkspaceIssue | null
  issues: StudioAiDailyWorkspaceIssue[]
  sourceFeeds: StudioAiDailyWorkspaceFeed[]
  runs: StudioAiDailyWorkspaceRun[]
  flashItems: StudioAiDailyWorkspaceFlash[]
  edition: {
    issue: StudioAiDailyWorkspaceIssue
    draft: {
      id: string
      slug: string
      title: string
      status: string
      visibility: string
      updatedAt: string
      latestReview: {
        status: string
        reviewedBy: string | null
        reviewedAt: string
        checklist: {
          sourceChecked: boolean
          safetyChecked: boolean
          publicReady: boolean
        }
        notes: string
      } | null
    } | null
    generatedRevisions: StudioAiDailyWorkspaceRevision[]
  } | null
}

export interface StudioPublishExportDraftSummary {
  id: string
  slug: string
  title: string
  status: StudioDraftStatus
}

export interface StudioPublishExport {
  id: string
  draftId: string
  reviewId: string | null
  draftUpdatedAt: string | null
  target: string
  exportedFiles: string[]
  checks: unknown
  exportedBy: string | null
  createdAt: string
  updatedAt: string
  draft: StudioPublishExportDraftSummary | null
}

export const studioDraftStatuses: Record<StudioDraftStatus, string> = {
  draft: '草稿',
  'review-needed': '待审核',
  approved: '已批准',
  published: '已发布',
  rejected: '已拒绝',
  archived: '已归档',
}

export const studioVisibilityLabels: Record<StudioVisibility, string> = {
  hidden: '暂不公开',
  featured: '精选公开',
  archive: '归档公开',
}

export const studioAiDailyIssueStatusLabels: Record<StudioAiDailyIssueStatus, string> = {
  'source-collected': '来源已收集',
  extracted: '已抽取',
  summarized: '已摘要',
  synthesized: '已合成',
  'review-needed': '待审核',
  approved: '已批准',
  published: '已发布',
  rejected: '已拒绝',
  'needs-more-evidence': '需补充证据',
}

export const studioSourceTierLabels: Record<StudioSourceTier, string> = {
  'official-primary': '官方主来源',
  'official-secondary': '官方辅助来源',
  'trusted-aggregator': '可信聚合',
  'community-generated': '社区候选',
  'manual-candidate': '手动候选',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function readNullableString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readNullableNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().slice(0, 200))
        .filter(Boolean)
        .slice(0, 80)
    : []
}

function isDraftStatus(value: unknown): value is StudioDraftStatus {
  return (
    value === 'draft' ||
    value === 'review-needed' ||
    value === 'approved' ||
    value === 'published' ||
    value === 'rejected' ||
    value === 'archived'
  )
}

function isReviewStatus(value: unknown): value is StudioReviewStatus {
  return value === 'pending' || value === 'approved' || value === 'needs-changes' || value === 'rejected'
}

function isVisibility(value: unknown): value is StudioVisibility {
  return value === 'hidden' || value === 'featured' || value === 'archive'
}

function isSourceTier(value: unknown): value is StudioSourceTier {
  return Object.prototype.hasOwnProperty.call(studioSourceTierLabels, String(value))
}

function isAiDailyIssueStatus(value: unknown): value is StudioAiDailyIssueStatus {
  return Object.prototype.hasOwnProperty.call(studioAiDailyIssueStatusLabels, String(value))
}

export function readStoredStudioToken() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(STUDIO_STORAGE_KEYS.adminToken) ?? ''
}

export function normalizeStudioBody(value: unknown): StudioContentBody {
  if (!isRecord(value) || !Array.isArray(value.blocks)) return { blocks: [] }
  return {
    blocks: value.blocks
      .filter(isRecord)
      .map((block): StudioContentBlock => ({
        type: readBlockType(block.type),
        text: readString(block.text),
        level: typeof block.level === 'number' ? block.level : undefined,
        items: readStringArray(block.items),
        src: readString(block.src) || undefined,
        alt: readString(block.alt) || undefined,
        caption: readString(block.caption) || undefined,
        mermaid: readString(block.mermaid) || undefined,
        sourceItemId: readString(block.sourceItemId) || undefined,
        citationSnapshot: normalizeStudioCitationSnapshotV2(block.citationSnapshot),
      })),
  }
}

function normalizeStudioCitationSnapshotV2(value: unknown): StudioCitationSnapshotV2 | undefined {
  if (!isRecord(value) || value.version !== 2) return undefined
  const title = readString(value.title)
  const publisher = readString(value.publisher)
  const originalUrl = readString(value.originalUrl)
  const canonicalUrl = readString(value.canonicalUrl)
  const retrievedAt = readString(value.retrievedAt)
  const excerpt = readString(value.excerpt)
  if (!title || !publisher || !originalUrl || !canonicalUrl || !retrievedAt || !excerpt) return undefined
  const locator = isRecord(value.locator)
    ? {
        heading: readString(value.locator.heading) || undefined,
        startChar: typeof value.locator.startChar === 'number' ? value.locator.startChar : undefined,
        endChar: typeof value.locator.endChar === 'number' ? value.locator.endChar : undefined,
      }
    : undefined
  return {
    version: 2,
    sourceItemId: readNullableString(value.sourceItemId),
    evidenceId: readNullableString(value.evidenceId),
    title,
    publisher,
    originalUrl,
    canonicalUrl,
    publishedAt: readNullableString(value.publishedAt),
    retrievedAt,
    excerpt,
    ...(locator ? { locator } : {}),
    ...(readString(value.contentHash) ? { contentHash: readString(value.contentHash) } : {}),
  }
}

function readBlockType(value: unknown): StudioContentBlock['type'] {
  if (value === 'heading' || value === 'list' || value === 'image' || value === 'flow' || value === 'source-card') {
    return value
  }
  return 'paragraph'
}

export function normalizeStudioHealth(value: unknown): StudioHealth | null {
  if (!isRecord(value)) return null
  if (value.ok !== true || typeof value.service !== 'string') return null
  return {
    ok: true,
    service: value.service,
    database: value.database === true,
    auth: readString(value.auth),
    publishMode: readString(value.publishMode),
  }
}

export function normalizeStudioReview(value: unknown): StudioReview | null {
  if (!isRecord(value)) return null
  const checklist = isRecord(value.checklist) ? value.checklist : {}
  const status = isReviewStatus(value.status) ? value.status : null
  if (!status || typeof value.id !== 'string' || typeof value.draftId !== 'string') return null
  return {
    id: value.id,
    draftId: value.draftId,
    status,
    checklist: {
      sourceChecked: checklist.sourceChecked === true,
      safetyChecked: checklist.safetyChecked === true,
      publicReady: checklist.publicReady === true,
      pageKind: readString(checklist.pageKind) || undefined,
      pageExportTarget: readString(checklist.pageExportTarget) || undefined,
      pageChecks: readStringArray(checklist.pageChecks),
    },
    notes: readString(value.notes),
    reviewedBy: readNullableString(value.reviewedBy),
    reviewedAt: readString(value.reviewedAt),
  }
}

export function normalizeStudioDraft(value: unknown): StudioDraft | null {
  if (!isRecord(value)) return null
  const status = isDraftStatus(value.status) ? value.status : null
  const visibility = isVisibility(value.visibility) ? value.visibility : null
  if (!status || !visibility || typeof value.id !== 'string' || typeof value.slug !== 'string') return null
  return {
    id: value.id,
    slug: value.slug,
    title: readString(value.title),
    column: readString(value.column),
    tag: readString(value.tag),
    detail: readString(value.detail),
    readTime: readString(value.readTime),
    bodyJson: normalizeStudioBody(value.bodyJson),
    knowledgePoints: readStringArray(value.knowledgePoints),
    projectIds: readStringArray(value.projectIds),
    status,
    visibility,
    aiAssistance: readString(value.aiAssistance),
    createdBy: readNullableString(value.createdBy),
    updatedBy: readNullableString(value.updatedBy),
    publishedAt: readNullableString(value.publishedAt),
    createdAt: readString(value.createdAt),
    updatedAt: readString(value.updatedAt),
    latestReview: normalizeStudioReview(value.latestReview),
  }
}

export function normalizeStudioDrafts(value: unknown): StudioDraft[] {
  if (!isRecord(value) || !Array.isArray(value.drafts)) return []
  return value.drafts.map((item) => normalizeStudioDraft(item)).filter((item): item is StudioDraft => item !== null)
}

export function normalizeStudioSource(value: unknown): StudioSourceItem | null {
  if (!isRecord(value)) return null
  const sourceTier = isSourceTier(value.sourceTier) ? value.sourceTier : null
  if (!sourceTier || typeof value.id !== 'string' || typeof value.url !== 'string') return null
  return {
    id: value.id,
    title: readString(value.title),
    url: value.url,
    sourceName: readString(value.sourceName),
    sourceTier,
    language: readString(value.language),
    publishedAt: readNullableString(value.publishedAt),
    capturedAt: readString(value.capturedAt),
    rawExcerpt: readNullableString(value.rawExcerpt),
    summary: readString(value.summary),
    tags: readStringArray(value.tags),
    riskFlags: readStringArray(value.riskFlags),
    createdAt: readString(value.createdAt),
    updatedAt: readString(value.updatedAt),
  }
}

export function normalizeStudioSources(value: unknown): StudioSourceItem[] {
  if (!isRecord(value) || !Array.isArray(value.sources)) return []
  return value.sources.map((item) => normalizeStudioSource(item)).filter((item): item is StudioSourceItem => item !== null)
}

export function normalizeStudioIssue(value: unknown): StudioAiDailyIssue | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  const status = isAiDailyIssueStatus(value.status) ? value.status : 'source-collected'
  return {
    id: value.id,
    date: readString(value.date),
    title: readString(value.title),
    status,
    sourceIds: readStringArray(value.sourceIds),
    briefJson: value.briefJson,
    draftId: readNullableString(value.draftId),
    createdAt: readString(value.createdAt),
    updatedAt: readString(value.updatedAt),
  }
}

export function normalizeStudioIssues(value: unknown): StudioAiDailyIssue[] {
  if (!isRecord(value) || !Array.isArray(value.issues)) return []
  return value.issues.map((item) => normalizeStudioIssue(item)).filter((item): item is StudioAiDailyIssue => item !== null)
}

export function normalizeStudioIssueDetail(value: unknown): StudioAiDailyIssueDetail | null {
  if (!isRecord(value)) return null
  const issue = normalizeStudioIssue(value.issue)
  if (!issue) return null
  const sources = Array.isArray(value.sources)
    ? value.sources.map((item) => normalizeStudioSource(item)).filter((item): item is StudioSourceItem => item !== null)
    : []
  return {
    issue,
    sources,
    draft: normalizeStudioDraft(value.draft),
  }
}

function normalizeWorkspaceIssue(value: unknown): StudioAiDailyWorkspaceIssue | null {
  const issue = normalizeStudioIssue(value)
  if (!isRecord(value) || !issue) return null
  const brief = isRecord(value.brief)
    ? {
        summary: readString(value.brief.summary),
        publicAngle: readString(value.brief.publicAngle),
        keySignals: readStringArray(value.brief.keySignals),
        toVerify: readStringArray(value.brief.toVerify),
      }
    : null
  return {
    ...issue,
    editionDate: readNullableString(value.editionDate),
    workflowState: readString(value.workflowState),
    brief,
    selectionVersion: readNumber(value.selectionVersion),
    selectedEvidenceVersion: readNumber(value.selectedEvidenceVersion),
    generatedRevisionSequence: readNumber(value.generatedRevisionSequence),
    latestGeneratedRevisionId: readNullableString(value.latestGeneratedRevisionId),
    newEvidenceAvailable: value.newEvidenceAvailable === true,
    deployedPublicAt: readNullableString(value.deployedPublicAt),
  }
}

function normalizeWorkspaceRunEvent(value: unknown): StudioAiDailyWorkspaceRunEvent | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  return {
    id: value.id,
    sequence: readNumber(value.sequence),
    stage: readNullableString(value.stage),
    kind: readString(value.kind),
    outcome: readString(value.outcome),
    providerRole: readNullableString(value.providerRole),
    attemptNumber: readNullableNumber(value.attemptNumber),
    errorCategory: readNullableString(value.errorCategory),
    durationMs: readNullableNumber(value.durationMs),
    createdAt: readString(value.createdAt),
  }
}

function normalizeWorkspaceCandidate(value: unknown): StudioAiDailyWorkspaceCandidate | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  const evidence = isRecord(value.currentEvidence)
    ? {
        id: readString(value.currentEvidence.id),
        version: readNumber(value.currentEvidence.version),
        status: readString(value.currentEvidence.status),
        excerpt: readString(value.currentEvidence.excerpt),
        fetchedAt: readString(value.currentEvidence.fetchedAt),
        expiresAt: readString(value.currentEvidence.expiresAt),
        originalUrl: readString(value.currentEvidence.originalUrl),
        canonicalUrl: readString(value.currentEvidence.canonicalUrl),
        title: readString(value.currentEvidence.title),
        publisher: readString(value.currentEvidence.publisher),
      }
    : null
  return {
    id: value.id,
    clusterId: readNullableString(value.clusterId),
    sourceFeedId: readNullableString(value.sourceFeedId),
    providerKind: readString(value.providerKind),
    providerRole: readString(value.providerRole),
    title: readString(value.title),
    publisher: readString(value.publisher),
    publisherDomain: readString(value.publisherDomain),
    canonicalUrl: readString(value.canonicalUrl),
    publishedAt: readNullableString(value.publishedAt),
    observedAt: readString(value.observedAt),
    sourceTier: readString(value.sourceTier),
    fetchStatus: readString(value.fetchStatus),
    evidenceStatus: readString(value.evidenceStatus),
    selectionState: readString(value.selectionState),
    scoreTotal: readNullableNumber(value.scoreTotal),
    lastErrorCategory: readNullableString(value.lastErrorCategory),
    evidenceExcerpt: readNullableString(value.evidenceExcerpt),
    evidenceVersion: readNumber(value.evidenceVersion),
    currentEvidence: evidence,
    updatedAt: readString(value.updatedAt),
  }
}

function normalizeWorkspaceRun(value: unknown): StudioAiDailyWorkspaceRun | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  const workItems = Array.isArray(value.workItems)
    ? value.workItems
        .filter(isRecord)
        .map((item) => ({
          id: readString(item.id),
          kind: readString(item.kind),
          sourceFeedId: readNullableString(item.sourceFeedId),
          sourceFeedName: readNullableString(item.sourceFeedName),
          priority: readNumber(item.priority),
          status: readString(item.status),
          attemptCount: readNumber(item.attemptCount),
          maxAttempts: readNumber(item.maxAttempts),
          lastErrorCategory: readNullableString(item.lastErrorCategory),
          completedAt: readNullableString(item.completedAt),
          updatedAt: readString(item.updatedAt),
        }))
        .filter((item) => Boolean(item.id))
    : []
  const clusters = Array.isArray(value.clusters)
    ? value.clusters
        .filter(isRecord)
        .map((cluster) => ({
          id: readString(cluster.id),
          candidateIds: Array.isArray(cluster.candidateIds)
            ? cluster.candidateIds.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 80)
            : [],
          stableIdentityKey: readString(cluster.stableIdentityKey),
          groupingReason: readString(cluster.groupingReason),
          topic: readString(cluster.topic),
          corroborationCount: readNumber(cluster.corroborationCount),
          scoreTotal: readNullableNumber(cluster.scoreTotal),
          rank: readNullableNumber(cluster.rank),
          selectedAt: readNullableString(cluster.selectedAt),
          editorState: readString(cluster.editorState),
          editorReason: readNullableString(cluster.editorReason),
          updatedAt: readString(cluster.updatedAt),
        }))
        .filter((item) => Boolean(item.id))
    : []
  const overrides = Array.isArray(value.overrides)
    ? value.overrides
        .filter(isRecord)
        .map((override) => ({
          id: readString(override.id),
          runId: readString(override.runId),
          candidateId: readNullableString(override.candidateId),
          clusterId: readNullableString(override.clusterId),
          action: readString(override.action),
          actor: readString(override.actor),
          reason: readNullableString(override.reason),
          expectedUpdatedAt: readNullableString(override.expectedUpdatedAt),
          observedVersion: readNullableNumber(override.observedVersion),
          createdAt: readString(override.createdAt),
        }))
        .filter((item) => Boolean(item.id && item.runId && item.action && item.actor && item.createdAt))
    : []
  return {
    id: value.id,
    issueId: readNullableString(value.issueId),
    editionDate: readString(value.editionDate),
    profile: readString(value.profile),
    trigger: readString(value.trigger),
    attemptNumber: readNumber(value.attemptNumber),
    eventSequence: readNumber(value.eventSequence),
    status: readString(value.status),
    currentStage: readNullableString(value.currentStage),
    configVersion: readString(value.configVersion),
    startedAt: readNullableString(value.startedAt),
    finishedAt: readNullableString(value.finishedAt),
    newestPublishedAt: readNullableString(value.newestPublishedAt),
    lastCollectedAt: readNullableString(value.lastCollectedAt),
    lastFetchedAt: readNullableString(value.lastFetchedAt),
    pipelineFreshnessAt: readNullableString(value.pipelineFreshnessAt),
    endToEndLagMs: readNullableNumber(value.endToEndLagMs),
    counters: value.counters,
    finalErrorCategory: readNullableString(value.finalErrorCategory),
    createdAt: readString(value.createdAt),
    updatedAt: readString(value.updatedAt),
    events: Array.isArray(value.events)
      ? value.events.map(normalizeWorkspaceRunEvent).filter((item): item is StudioAiDailyWorkspaceRunEvent => item !== null)
      : [],
    workItems,
    candidates: Array.isArray(value.candidates)
      ? value.candidates.map(normalizeWorkspaceCandidate).filter((item): item is StudioAiDailyWorkspaceCandidate => item !== null)
      : [],
    clusters,
    overrides,
  }
}

function normalizeWorkspaceFeed(value: unknown): StudioAiDailyWorkspaceFeed | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  return {
    id: value.id,
    name: readString(value.name),
    kind: readString(value.kind),
    url: readString(value.url),
    canonicalKey: readString(value.canonicalKey),
    locale: readString(value.locale),
    tier: readString(value.tier),
    enabled: value.enabled === true,
    intervalMinutes: readNumber(value.intervalMinutes),
    nextCollectAt: readNullableString(value.nextCollectAt),
    lastAttemptedAt: readNullableString(value.lastAttemptedAt),
    lastSuccessfulAt: readNullableString(value.lastSuccessfulAt),
    consecutiveFailures: readNumber(value.consecutiveFailures),
    healthStatus: readString(value.healthStatus),
    lastLagMs: readNullableNumber(value.lastLagMs),
    lastErrorCategory: readNullableString(value.lastErrorCategory),
    updatedAt: readString(value.updatedAt),
  }
}

function normalizeWorkspaceFlash(value: unknown): StudioAiDailyWorkspaceFlash | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  const revisions = Array.isArray(value.revisions)
    ? value.revisions
        .filter(isRecord)
        .map((revision) => ({
          id: readString(revision.id),
          revisionNumber: readNumber(revision.revisionNumber),
          selectionVersion: readNumber(revision.selectionVersion),
          evidenceVersion: readNumber(revision.evidenceVersion),
          title: readString(revision.title),
          factSummary: readString(revision.factSummary),
          whyItMatters: readString(revision.whyItMatters),
          uncertainty: readNullableString(revision.uncertainty),
          correctionState: readString(revision.correctionState),
          status: readString(revision.status),
          editor: readNullableString(revision.editor),
          approvedAt: readNullableString(revision.approvedAt),
          createdAt: readString(revision.createdAt),
          citationCount: readNumber(revision.citationCount),
        }))
        .filter((item) => Boolean(item.id))
    : []
  const approvalActions = Array.isArray(value.approvalActions)
    ? value.approvalActions
        .filter(isRecord)
        .map((action) => ({
          id: readString(action.id),
          action: readString(action.action),
          actor: readString(action.actor),
          reason: readNullableString(action.reason),
          observedRevisionNumber: readNullableNumber(action.observedRevisionNumber),
          createdAt: readString(action.createdAt),
        }))
        .filter((item) => Boolean(item.id))
    : []
  return {
    id: value.id,
    publicId: readString(value.publicId),
    stableEventKey: readString(value.stableEventKey),
    sourceClusterIdentity: readString(value.sourceClusterIdentity),
    lifecycleState: readString(value.lifecycleState),
    currentApprovedRevisionId: readNullableString(value.currentApprovedRevisionId),
    revisionSequence: readNumber(value.revisionSequence),
    publicRevision: readNumber(value.publicRevision),
    lastApprovedAt: readNullableString(value.lastApprovedAt),
    withdrawnAt: readNullableString(value.withdrawnAt),
    projectionUpdatedAt: readNullableString(value.projectionUpdatedAt),
    createdAt: readString(value.createdAt),
    revisions,
    approvalActions,
  }
}

function normalizeWorkspaceRevision(value: unknown): StudioAiDailyWorkspaceRevision | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  const content = isRecord(value.content)
    ? {
        title: readString(value.content.title),
        subtitle: readString(value.content.subtitle),
        introduction: isRecord(value.content.introduction)
          ? { text: readString(value.content.introduction.text), claimIds: readStringArray(value.content.introduction.claimIds) }
          : { text: '', claimIds: [] },
        events: Array.isArray(value.content.events)
          ? value.content.events.filter(isRecord).map((event) => ({
              eventId: readString(event.eventId),
              title: readString(event.title),
              factSummary: isRecord(event.factSummary)
                ? { text: readString(event.factSummary.text), claimIds: readStringArray(event.factSummary.claimIds) }
                : { text: '', claimIds: [] },
              whyItMatters: isRecord(event.whyItMatters)
                ? { text: readString(event.whyItMatters.text), claimIds: readStringArray(event.whyItMatters.claimIds) }
                : { text: '', claimIds: [] },
              uncertainty: readString(event.uncertainty),
              claimIds: readStringArray(event.claimIds),
            })).filter((event) => Boolean(event.eventId && event.title))
          : [],
        trends: Array.isArray(value.content.trends)
          ? value.content.trends.filter(isRecord).map((trend) => ({ text: readString(trend.text), claimIds: readStringArray(trend.claimIds) })).filter((trend) => Boolean(trend.text))
          : [],
      }
    : null
  const validationFindings = Array.isArray(value.validationFindings)
    ? value.validationFindings.filter(isRecord).map((finding) => ({ severity: readString(finding.severity), code: readString(finding.code) })).filter((finding) => Boolean(finding.code)).slice(0, 40)
    : []
  return {
    id: value.id,
    revisionNumber: readNumber(value.revisionNumber),
    revisionKind: readString(value.revisionKind),
    sourceRevisionId: readNullableString(value.sourceRevisionId),
    selectionVersion: readNumber(value.selectionVersion),
    evidenceVersion: readNumber(value.evidenceVersion),
    promptVersion: readString(value.promptVersion),
    schemaVersion: readString(value.schemaVersion),
    modelRole: readString(value.modelRole),
    modelIdentifier: readString(value.modelIdentifier),
    applyState: readString(value.applyState),
    validationStatus: readString(value.validationStatus),
    validationFindingCount: readNumber(value.validationFindingCount),
    projectionDraftId: readNullableString(value.projectionDraftId),
    createdBy: readString(value.createdBy),
    createdAt: readString(value.createdAt),
    appliedAt: readNullableString(value.appliedAt),
    observedDraftUpdatedAt: readNullableString(value.observedDraftUpdatedAt),
    revalidatedAt: readNullableString(value.revalidatedAt),
    validatedBy: readNullableString(value.validatedBy),
    discardedAt: readNullableString(value.discardedAt),
    discardedBy: readNullableString(value.discardedBy),
    discardReason: readNullableString(value.discardReason),
    contentBlockCount: readNumber(value.contentBlockCount),
    citationCount: readNumber(value.citationCount),
    validationFindings,
    content,
  }
}

export function normalizeStudioAiDailyWorkspace(value: unknown): StudioAiDailyWorkspace | null {
  if (!isRecord(value)) return null
  const selectedIssue = normalizeWorkspaceIssue(value.selectedIssue)
  const issues = Array.isArray(value.issues)
    ? value.issues.map(normalizeWorkspaceIssue).filter((item): item is StudioAiDailyWorkspaceIssue => item !== null)
    : []
  const sourceFeeds = Array.isArray(value.sourceFeeds)
    ? value.sourceFeeds.map(normalizeWorkspaceFeed).filter((item): item is StudioAiDailyWorkspaceFeed => item !== null)
    : []
  const runs = Array.isArray(value.runs)
    ? value.runs.map(normalizeWorkspaceRun).filter((item): item is StudioAiDailyWorkspaceRun => item !== null)
    : []
  const flashItems = Array.isArray(value.flashItems)
    ? value.flashItems.map(normalizeWorkspaceFlash).filter((item): item is StudioAiDailyWorkspaceFlash => item !== null)
    : []
  let edition: StudioAiDailyWorkspace['edition'] = null
  if (isRecord(value.edition)) {
    const editionIssue = normalizeWorkspaceIssue(value.edition.issue)
    if (editionIssue) {
      const draft = isRecord(value.edition.draft)
        ? {
            id: readString(value.edition.draft.id),
            slug: readString(value.edition.draft.slug),
            title: readString(value.edition.draft.title),
            status: readString(value.edition.draft.status),
            visibility: readString(value.edition.draft.visibility),
            updatedAt: readString(value.edition.draft.updatedAt),
            latestReview: isRecord(value.edition.draft.latestReview)
              ? (() => {
                  const checklist = isRecord(value.edition.draft.latestReview.checklist)
                    ? value.edition.draft.latestReview.checklist
                    : {}
                  return {
                    status: readString(value.edition.draft.latestReview.status),
                    reviewedBy: readNullableString(value.edition.draft.latestReview.reviewedBy),
                    reviewedAt: readString(value.edition.draft.latestReview.reviewedAt),
                    checklist: {
                      sourceChecked: checklist.sourceChecked === true,
                      safetyChecked: checklist.safetyChecked === true,
                      publicReady: checklist.publicReady === true,
                    },
                    notes: readString(value.edition.draft.latestReview.notes),
                  }
                })()
              : null,
          }
        : null
      edition = {
        issue: editionIssue,
        draft,
        generatedRevisions: Array.isArray(value.edition.generatedRevisions)
          ? value.edition.generatedRevisions
              .map(normalizeWorkspaceRevision)
              .filter((item): item is StudioAiDailyWorkspaceRevision => item !== null)
          : [],
      }
    }
  }
  return {
    generatedAt: readString(value.generatedAt),
    selectedIssue,
    issues,
    sourceFeeds,
    runs,
    flashItems,
    edition,
  }
}

export function normalizeStudioPublishExport(value: unknown): StudioPublishExport | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.draftId !== 'string') return null
  return {
    id: value.id,
    draftId: value.draftId,
    reviewId: readNullableString(value.reviewId),
    draftUpdatedAt: readNullableString(value.draftUpdatedAt),
    target: readString(value.target),
    exportedFiles: readStringArray(value.exportedFiles),
    checks: value.checks,
    exportedBy: readNullableString(value.exportedBy),
    createdAt: readString(value.createdAt),
    updatedAt: readString(value.updatedAt),
    draft: normalizePublishExportDraftSummary(value.draft),
  }
}

export function normalizeStudioPublishExports(value: unknown): StudioPublishExport[] {
  if (!isRecord(value) || !Array.isArray(value.publishExports)) return []
  return value.publishExports
    .map((item) => normalizeStudioPublishExport(item))
    .filter((item): item is StudioPublishExport => item !== null)
}

function normalizePublishExportDraftSummary(value: unknown): StudioPublishExportDraftSummary | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.slug !== 'string') return null
  const status = isDraftStatus(value.status) ? value.status : null
  if (!status) return null
  return {
    id: value.id,
    slug: value.slug,
    title: readString(value.title),
    status,
  }
}

export function readStudioError(value: unknown) {
  return isRecord(value) && typeof value.error === 'string' ? value.error : ''
}
