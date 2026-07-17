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

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
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
      })),
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
