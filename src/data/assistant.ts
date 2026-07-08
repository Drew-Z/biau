import {
  getAssistantBlogPosts,
  getBlogAssistantTags,
} from './blogCuration'
import {
  buildPublicKnowledgeFallbackAnswer,
  buildPublicKnowledgeV2,
  searchAssistantKnowledge,
  type PublicKnowledgeV2,
} from './assistantKnowledge'
import { getProjectAssistantSummary, getProjectAssistantTags, projects } from './portfolio'

export type AssistantVisibility = 'public' | 'internal'
export type AssistantMemberRole = 'MEMBER' | 'ADMIN'
export type AssistantMemberStatus = 'ACTIVE' | 'DISABLED'

export const ASSISTANT_STORAGE_KEYS = {
  memberToken: 'biau-assistant-member-token',
  member: 'biau-assistant-member',
  sessionId: 'biau-assistant-session-id',
  adminToken: 'biau-assistant-admin-token',
} as const

export interface AssistantKnowledgeItem {
  id: string
  title: string
  summary: string
  href: string
  tags: string[]
  visibility: AssistantVisibility
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  citations?: AssistantKnowledgeItem[]
  meta?: AssistantAnswerMetaSummary | null
}

export interface AssistantRetrievalSummary {
  source: string
  retrievalMode: string
  store: string
  candidateCount: number
  citationCount: number
  sufficient: boolean
  sufficiency: 'enough' | 'weak' | 'none'
  fallbackReason?: string | null
  expandedEntityCount?: number
  modelCalls?: number
}

export type AssistantAgentPermission = 'read' | 'draft-write' | 'admin-write' | 'external-live'
export type AssistantAgentToolStatus = 'selected' | 'skipped' | 'completed' | 'failed' | 'blocked'
export type AssistantAgentStep = 'plan' | 'validate' | 'execute' | 'critique' | 'compose' | 'sanitize' | 'persist'
export type AssistantAgentToolId =
  | 'rag.retrieve'
  | 'status.query'
  | 'project.lookup'
  | 'knowledge.search'
  | 'studio.draft'
  | 'memory.search'
  | 'memory.write'
  | 'answer.direct'

export interface AssistantAgentRunSummary {
  mode: 'agentic-workspace'
  planner: 'model' | 'mock' | 'fallback'
  status: 'completed' | 'guarded' | 'degraded' | 'failed'
  steps: AssistantAgentStep[]
  toolCount: number
  durationMs: number
}

export interface AssistantAgentToolTrace {
  id: AssistantAgentToolId
  label: string
  permission: AssistantAgentPermission
  status: AssistantAgentToolStatus
  durationMs: number
  summary: string
  citationCount?: number
  itemCount?: number
  errorClass?: string
  artifacts?: AssistantAgentToolArtifact[]
}

export interface AssistantStudioDraftArtifact {
  kind: 'studio-draft'
  id: string
  slug: string
  title: string
  column: string
  status: 'review-needed'
  visibility: 'hidden'
  reviewRequired: true
  href: '/studio' | `/studio?draft=${string}`
}

export type AssistantAgentToolArtifact = AssistantStudioDraftArtifact

export interface AssistantAgentGuardrails {
  status: 'passed' | 'warned' | 'blocked'
  allowedPermissions: AssistantAgentPermission[]
  blockedPermissions: AssistantAgentPermission[]
  citationSufficiency: 'enough' | 'weak' | 'none'
  sensitiveOutputBlocked: boolean
  issues: string[]
}

export interface AssistantAnswerMetaSummary {
  mode: string
  model: string
  provider?: string
  reason?: string
  citationCount: number
  intent?: string
  grounding?: string
  modelChannel?: AssistantModelChannelSummary
  retrieval?: AssistantRetrievalSummary
  agent?: AssistantAgentRunSummary
  tools?: AssistantAgentToolTrace[]
  guardrails?: AssistantAgentGuardrails
  fallbackReason?: string
}

export interface AssistantSessionPreview {
  id: string
  title: string
  updatedAt: string
  preview: string
  archived?: boolean
  archivedAt?: string | null
  createdAt?: string
}

export interface AssistantSuggestion {
  id: string
  label: string
  prompt: string
}

export interface AssistantMemberProfile {
  id: string
  name: string
  role: AssistantMemberRole
  status?: AssistantMemberStatus
  dailyQuota: number
  modelChannelId?: string | null
  modelChannel?: AssistantModelChannelSummary
  disabledAt?: string | null
  lastSeenAt?: string | null
  createdAt?: string
}

export interface AssistantModelChannelSummary {
  id: string
  label: string
  provider: string
  model: string
  configured: boolean
  isDefault: boolean
  isActive: boolean
}

export type AssistantInviteStatus = 'OPEN' | 'EXHAUSTED' | 'EXPIRED' | 'REVOKED'
export type AssistantInternalKnowledgeStatus = 'DRAFT' | 'REVIEWED' | 'ACTIVE' | 'ARCHIVED'
export type AssistantInternalKnowledgeSyncStatus = 'STARTED' | 'COMPLETED' | 'FAILED' | 'SKIPPED'

export interface AssistantInviteSummary {
  id: string
  label: string
  role: AssistantMemberRole
  dailyQuota: number
  maxUses: number
  usedCount: number
  status: AssistantInviteStatus
  expiresAt?: string | null
  revokedAt?: string | null
  createdAt?: string
}

export interface AssistantInternalKnowledgeDocument {
  id: string
  slug: string
  title: string
  summary: string
  body: string
  tags: string[]
  status: AssistantInternalKnowledgeStatus
  sourceType: string
  safetyNotes: string
  contentHash: string
  lastSyncedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface AssistantInternalKnowledgeSyncRun {
  id: string
  status: AssistantInternalKnowledgeSyncStatus
  documentCount: number
  chunkCount: number
  issueCount: number
  startedAt: string
  finishedAt?: string | null
  diagnostic?: Record<string, string | number | boolean> | null
}

export interface AssistantRagCollectionHealth {
  name: string
  scope: 'public' | 'internal'
  pointCount: number
  vectorReady: boolean
}

export interface AssistantRagHealth {
  service: 'biau-rag-orchestrator'
  store: string
  vectorReady: boolean
  keywordReady: boolean
  rerankerReady: boolean
  lastSyncAt: string | null
  documentCount: number
  chunkCount: number
  entityCount: number
  relationCount: number
  collections?: {
    public?: AssistantRagCollectionHealth
    internal?: AssistantRagCollectionHealth
  }
}

export interface AssistantRagAdminStatus {
  configured: boolean
  syncConfigured: boolean
  health: AssistantRagHealth | null
  diagnostic?: Record<string, string | number | boolean> | null
}

export interface AssistantRagSyncResult {
  accepted: boolean
  status: AssistantInternalKnowledgeSyncStatus
  issueCount: number
  health: AssistantRagHealth | null
  diagnostic?: Record<string, string | number | boolean> | null
}

export interface AssistantKnowledgeOpsSummary {
  total: number
  draft: number
  reviewed: number
  active: number
  archived: number
  eligible: number
  syncedEligible: number
  unsyncedEligible: number
  staleEligible: number
  lastSyncStatus?: AssistantInternalKnowledgeSyncStatus
  lastSyncReason?: string
  lastSyncMode?: string
  lastSyncAccepted?: boolean
  lastSyncIssueCount?: number
}

export interface AssistantUsageSummary {
  id: string
  scope: string
  model: string
  modelChannelId?: string | null
  modelChannel?: AssistantModelChannelSummary
  tokensIn: number
  tokensOut: number
  createdAt: string
  member?: {
    id: string
    name: string
    role: AssistantMemberRole
    status?: AssistantMemberStatus
    modelChannelId?: string | null
    modelChannel?: AssistantModelChannelSummary
  } | null
}

export const publicAssistantSuggestions: AssistantSuggestion[] = [
  {
    id: 'demo-ready-projects',
    label: '哪些项目可演示',
    prompt: '现在站点里哪些项目有公开演示入口？每个项目适合看什么？',
  },
  {
    id: 'legal-rag-entry',
    label: 'Legal RAG 怎么体验',
    prompt: 'Legal RAG 法律机器人现在能展示哪些能力？我应该从哪个入口开始看？',
  },
  {
    id: 'status-overview',
    label: '查看可靠性状态',
    prompt: '项目可靠性观察页能告诉我哪些入口是否正常？',
  },
]

export const internalAssistantSuggestions: AssistantSuggestion[] = [
  {
    id: 'architecture',
    label: '做架构梳理',
    prompt: '根据当前站点公开内容，帮我整理一个新的 AI 应用项目展示页结构。',
  },
  {
    id: 'content-plan',
    label: '出内容提纲',
    prompt: '基于现有博客内容，给我生成一篇关于多模型路由策略的文章提纲。',
  },
  {
    id: 'delivery-check',
    label: '交付检查',
    prompt: '如果我要交付一个内部 AI 助手 MVP，这个站里的哪些文章最值得先读？',
  },
]

const projectKnowledge: AssistantKnowledgeItem[] = projects.map((project) => ({
  id: `project:${project.id}`,
  title: project.title,
  summary: getProjectAssistantSummary(project),
  href: `/projects/${project.id}`,
  tags: getProjectAssistantTags(project),
  visibility: 'public',
}))

const blogKnowledge: AssistantKnowledgeItem[] = getAssistantBlogPosts().map((post) => ({
  id: `blog:${post.slug}`,
  title: post.title,
  summary: post.detail,
  href: `/blog/${post.slug}`,
  tags: getBlogAssistantTags(post),
  visibility: 'public',
}))

export const publicKnowledgeBase: AssistantKnowledgeItem[] = [
  {
    id: 'site:intro',
    title: 'BIAU Port 站点简介',
    summary:
      'BIAU Port 泊岸是一个围绕 AI 应用、业务系统、互动体验、移动端案例与知识内容组织的展示站，强调可演示、可筛选、可落地的项目表达。',
    href: '/',
    tags: ['BIAU Port', '项目展示', '知识库', '公开站点'],
    visibility: 'public',
  },
  {
    id: 'site:status',
    title: '项目可靠性观察',
    summary:
      '状态页汇总主站、Legal RAG、Ozon ERP、寻球、Pet 和 BIAU Playlab 等公开入口与可靠性检查，区分 online、degraded、offline、unchecked 与 planned。当前主站会记录 ERP bootstrap 注册策略、各站点可见品牌外壳/标题/favicon/归属提示对齐、Pet APK 继续关闭等公开安全事实。',
    href: '/status',
    tags: ['状态页', '可靠性观察', '公开入口', 'health check', 'synthetic', '注册', '品牌统一'],
    visibility: 'public',
  },
  ...projectKnowledge,
  ...blogKnowledge,
]

export const publicKnowledgeV2: PublicKnowledgeV2 = buildPublicKnowledgeV2(publicKnowledgeBase, { projects })

export function searchPublicKnowledge(query: string) {
  return searchAssistantKnowledge(publicKnowledgeBase, query, { knowledge: publicKnowledgeV2 }).citations
}

export { buildPublicKnowledgeFallbackAnswer, searchAssistantKnowledge }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAssistantVisibility(value: unknown): value is AssistantVisibility {
  return value === 'public' || value === 'internal'
}

function isAssistantMemberRole(value: unknown): value is AssistantMemberRole {
  return value === 'MEMBER' || value === 'ADMIN'
}

function isAssistantMemberStatus(value: unknown): value is AssistantMemberStatus {
  return value === 'ACTIVE' || value === 'DISABLED'
}

export function normalizeAssistantKnowledgeItem(value: unknown): AssistantKnowledgeItem | null {
  if (!isRecord(value)) return null
  const { id, title, summary, href, tags, visibility } = value
  if (
    typeof id !== 'string' ||
    typeof title !== 'string' ||
    typeof summary !== 'string' ||
    typeof href !== 'string' ||
    !isAssistantVisibility(visibility)
  ) {
    return null
  }

  return {
    id,
    title,
    summary,
    href,
    tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [],
    visibility,
  }
}

export function normalizeAssistantCitations(value: unknown): AssistantKnowledgeItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeAssistantKnowledgeItem(item))
    .filter((item): item is AssistantKnowledgeItem => item !== null)
}

export function normalizeAssistantMessage(value: unknown): AssistantMessage | null {
  if (!isRecord(value)) return null
  const { id, role, content, timestamp, citations, meta } = value
  if (
    typeof id !== 'string' ||
    (role !== 'user' && role !== 'assistant') ||
    typeof content !== 'string' ||
    typeof timestamp !== 'string'
  ) {
    return null
  }

  return {
    id,
    role,
    content,
    timestamp,
    citations: normalizeAssistantCitations(citations),
    meta: normalizeAssistantAnswerMeta(meta),
  }
}

export function normalizeAssistantMessages(value: unknown): AssistantMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeAssistantMessage(item))
    .filter((item): item is AssistantMessage => item !== null)
}

export function normalizeAssistantAnswerMeta(value: unknown): AssistantAnswerMetaSummary | null {
  if (!isRecord(value)) return null
  const { mode, model, provider, reason, citationCount, intent, grounding, modelChannel, retrieval, agent, tools, guardrails, fallbackReason } = value
  if (typeof mode !== 'string' || typeof model !== 'string' || typeof citationCount !== 'number') return null
  return {
    mode,
    model,
    provider: readSafeString(provider, 80) || undefined,
    reason: readSafeString(reason, 80) || undefined,
    citationCount,
    intent: readSafeString(intent, 40) || undefined,
    grounding: readSafeString(grounding, 40) || undefined,
    modelChannel: normalizeAssistantModelChannel(modelChannel) ?? undefined,
    retrieval: normalizeAssistantRetrievalSummary(retrieval),
    agent: normalizeAssistantAgentRun(agent),
    tools: normalizeAssistantAgentToolTraces(tools),
    guardrails: normalizeAssistantAgentGuardrails(guardrails),
    fallbackReason: typeof fallbackReason === 'string' ? fallbackReason : undefined,
  }
}

function normalizeAssistantRetrievalSummary(value: unknown): AssistantRetrievalSummary | undefined {
  if (!isRecord(value)) return undefined
  const {
    source,
    retrievalMode,
    store,
    candidateCount,
    citationCount,
    sufficient,
    sufficiency,
    fallbackReason,
    expandedEntityCount,
    modelCalls,
  } = value
  if (
    typeof source !== 'string' ||
    typeof retrievalMode !== 'string' ||
    typeof store !== 'string' ||
    typeof candidateCount !== 'number' ||
    typeof citationCount !== 'number' ||
    typeof sufficient !== 'boolean' ||
    (sufficiency !== 'enough' && sufficiency !== 'weak' && sufficiency !== 'none')
  ) {
    return undefined
  }
  return {
    source,
    retrievalMode,
    store,
    candidateCount,
    citationCount,
    sufficient,
    sufficiency,
    fallbackReason: typeof fallbackReason === 'string' || fallbackReason === null ? fallbackReason : undefined,
    expandedEntityCount: typeof expandedEntityCount === 'number' ? expandedEntityCount : undefined,
    modelCalls: typeof modelCalls === 'number' ? modelCalls : undefined,
  }
}

function normalizeAssistantAgentRun(value: unknown): AssistantAgentRunSummary | undefined {
  if (!isRecord(value)) return undefined
  const { mode, planner, status, steps, toolCount, durationMs } = value
  if (
    mode !== 'agentic-workspace' ||
    (planner !== 'model' && planner !== 'mock' && planner !== 'fallback') ||
    (status !== 'completed' && status !== 'guarded' && status !== 'degraded' && status !== 'failed') ||
    typeof toolCount !== 'number' ||
    typeof durationMs !== 'number'
  ) {
    return undefined
  }

  return {
    mode,
    planner,
    status,
    steps: Array.isArray(steps) ? steps.filter(isAgentStep) : [],
    toolCount,
    durationMs,
  }
}

function normalizeAssistantAgentToolTraces(value: unknown): AssistantAgentToolTrace[] | undefined {
  if (!Array.isArray(value)) return undefined
  const traces = value.map(normalizeAssistantAgentToolTrace).filter((trace): trace is AssistantAgentToolTrace => trace !== null)
  return traces.length > 0 ? traces : undefined
}

function normalizeAssistantAgentToolTrace(value: unknown): AssistantAgentToolTrace | null {
  if (!isRecord(value)) return null
  const { id, label, permission, status, durationMs, summary, citationCount, itemCount, errorClass, artifacts } = value
  const safeId = isAgentToolId(id) ? id : null
  const safeLabel = readSafeString(label, 80)
  const safeSummary = readSafeString(summary, 240)
  if (
    !safeId ||
    !safeLabel ||
    !isAgentPermission(permission) ||
    !isAgentToolStatus(status) ||
    typeof durationMs !== 'number' ||
    !safeSummary
  ) {
    return null
  }

  return {
    id: safeId,
    label: safeLabel,
    permission,
    status,
    durationMs,
    summary: safeSummary,
    citationCount: typeof citationCount === 'number' ? citationCount : undefined,
    itemCount: typeof itemCount === 'number' ? itemCount : undefined,
    errorClass: isAgentToolErrorClass(errorClass) ? errorClass : undefined,
    artifacts: normalizeAssistantAgentToolArtifacts(artifacts),
  }
}

function normalizeAssistantAgentToolArtifacts(value: unknown): AssistantAgentToolArtifact[] | undefined {
  if (!Array.isArray(value)) return undefined
  const artifacts = value
    .map((item) => normalizeAssistantAgentToolArtifact(item))
    .filter((item): item is AssistantAgentToolArtifact => item !== null)
  return artifacts.length > 0 ? artifacts : undefined
}

function normalizeAssistantAgentToolArtifact(value: unknown): AssistantAgentToolArtifact | null {
  if (!isRecord(value)) return null
  const { kind, id, slug, title, column, status, visibility, reviewRequired, href } = value
  const safeId = readSafeString(id, 120)
  const safeSlug = readSafeString(slug, 96)
  const safeTitle = readSafeString(title, 120)
  const safeColumn = readSafeString(column, 40)
  const safeHref =
    safeId && safeSlug ? normalizeStudioDraftArtifactHref(href, safeId, safeSlug) : null
  if (
    kind !== 'studio-draft' ||
    !/^[a-z0-9_-]+$/iu.test(safeId) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(safeSlug) ||
    !safeTitle ||
    !safeColumn ||
    status !== 'review-needed' ||
    visibility !== 'hidden' ||
    reviewRequired !== true ||
    !safeHref
  ) {
    return null
  }
  return {
    kind,
    id: safeId,
    slug: safeSlug,
    title: safeTitle,
    column: safeColumn,
    status,
    visibility,
    reviewRequired,
    href: safeHref,
  }
}

function normalizeStudioDraftArtifactHref(
  value: unknown,
  id: string,
  slug: string,
): AssistantStudioDraftArtifact['href'] | null {
  if (value === '/studio') return '/studio'
  if (typeof value !== 'string' || !value.startsWith('/studio?')) return null

  const params = new URLSearchParams(value.slice('/studio?'.length))
  const draft = params.get('draft')
  if (!draft || draft.length > 120 || !/^[a-z0-9_-]+$/iu.test(draft)) return null
  if (draft !== id && draft !== slug) return null
  return `/studio?draft=${encodeURIComponent(draft)}`
}

function normalizeAssistantAgentGuardrails(value: unknown): AssistantAgentGuardrails | undefined {
  if (!isRecord(value)) return undefined
  const { status, allowedPermissions, blockedPermissions, citationSufficiency, sensitiveOutputBlocked, issues } = value
  if (
    (status !== 'passed' && status !== 'warned' && status !== 'blocked') ||
    (citationSufficiency !== 'enough' && citationSufficiency !== 'weak' && citationSufficiency !== 'none') ||
    typeof sensitiveOutputBlocked !== 'boolean'
  ) {
    return undefined
  }

  return {
    status,
    allowedPermissions: Array.isArray(allowedPermissions) ? allowedPermissions.filter(isAgentPermission) : [],
    blockedPermissions: Array.isArray(blockedPermissions) ? blockedPermissions.filter(isAgentPermission) : [],
    citationSufficiency,
    sensitiveOutputBlocked,
    issues: Array.isArray(issues) ? issues.map((issue) => readSafeString(issue, 160)).filter(Boolean).slice(0, 8) : [],
  }
}

function isAgentStep(value: unknown): value is AssistantAgentStep {
  return (
    value === 'plan' ||
    value === 'validate' ||
    value === 'execute' ||
    value === 'critique' ||
    value === 'compose' ||
    value === 'sanitize' ||
    value === 'persist'
  )
}

function isAgentToolId(value: unknown): value is AssistantAgentToolId {
  return (
    value === 'rag.retrieve' ||
    value === 'status.query' ||
    value === 'project.lookup' ||
    value === 'knowledge.search' ||
    value === 'studio.draft' ||
    value === 'memory.search' ||
    value === 'memory.write' ||
    value === 'answer.direct'
  )
}

function isAgentPermission(value: unknown): value is AssistantAgentPermission {
  return value === 'read' || value === 'draft-write' || value === 'admin-write' || value === 'external-live'
}

function isAgentToolStatus(value: unknown): value is AssistantAgentToolStatus {
  return value === 'selected' || value === 'skipped' || value === 'completed' || value === 'failed' || value === 'blocked'
}

function isAgentToolErrorClass(value: unknown): value is NonNullable<AssistantAgentToolTrace['errorClass']> {
  return value === 'tool_error' || value === 'policy_blocked' || value === 'not_configured'
}

function readSafeString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export function normalizeAssistantSessionPreview(value: unknown): AssistantSessionPreview | null {
  if (!isRecord(value)) return null
  const { id, title, updatedAt, preview, archived, archivedAt, createdAt } = value
  if (typeof id !== 'string' || typeof title !== 'string' || typeof updatedAt !== 'string' || typeof preview !== 'string') {
    return null
  }

  return {
    id,
    title,
    updatedAt,
    preview,
    archived: archived === true,
    archivedAt: typeof archivedAt === 'string' || archivedAt === null ? archivedAt : undefined,
    createdAt: typeof createdAt === 'string' ? createdAt : undefined,
  }
}

export function normalizeAssistantSessionPreviews(value: unknown): AssistantSessionPreview[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeAssistantSessionPreview(item))
    .filter((item): item is AssistantSessionPreview => item !== null)
}

export function normalizeAssistantInvite(value: unknown): AssistantInviteSummary | null {
  if (!isRecord(value)) return null
  const { id, label, role, dailyQuota, maxUses, usedCount, status, expiresAt, revokedAt, createdAt } = value
  if (
    typeof id !== 'string' ||
    typeof label !== 'string' ||
    (role !== 'MEMBER' && role !== 'ADMIN') ||
    typeof dailyQuota !== 'number' ||
    typeof maxUses !== 'number' ||
    typeof usedCount !== 'number' ||
    (status !== 'OPEN' && status !== 'EXHAUSTED' && status !== 'EXPIRED' && status !== 'REVOKED')
  ) {
    return null
  }

  return {
    id,
    label,
    role,
    dailyQuota,
    maxUses,
    usedCount,
    status,
    expiresAt: typeof expiresAt === 'string' || expiresAt === null ? expiresAt : undefined,
    revokedAt: typeof revokedAt === 'string' || revokedAt === null ? revokedAt : undefined,
    createdAt: typeof createdAt === 'string' ? createdAt : undefined,
  }
}

export function normalizeAssistantInvites(value: unknown): AssistantInviteSummary[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeAssistantInvite(item))
    .filter((item): item is AssistantInviteSummary => item !== null)
}

export function normalizeAssistantInternalKnowledgeDocument(value: unknown): AssistantInternalKnowledgeDocument | null {
  if (!isRecord(value)) return null
  const {
    id,
    slug,
    title,
    summary,
    body,
    tags,
    status,
    sourceType,
    safetyNotes,
    contentHash,
    lastSyncedAt,
    createdAt,
    updatedAt,
  } = value
  if (
    typeof id !== 'string' ||
    typeof slug !== 'string' ||
    typeof title !== 'string' ||
    typeof summary !== 'string' ||
    typeof body !== 'string' ||
    (status !== 'DRAFT' && status !== 'REVIEWED' && status !== 'ACTIVE' && status !== 'ARCHIVED') ||
    typeof sourceType !== 'string' ||
    typeof safetyNotes !== 'string' ||
    typeof contentHash !== 'string'
  ) {
    return null
  }

  return {
    id,
    slug,
    title,
    summary,
    body,
    tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [],
    status,
    sourceType,
    safetyNotes,
    contentHash,
    lastSyncedAt: typeof lastSyncedAt === 'string' || lastSyncedAt === null ? lastSyncedAt : undefined,
    createdAt: typeof createdAt === 'string' ? createdAt : undefined,
    updatedAt: typeof updatedAt === 'string' ? updatedAt : undefined,
  }
}

export function normalizeAssistantInternalKnowledgeDocuments(value: unknown): AssistantInternalKnowledgeDocument[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeAssistantInternalKnowledgeDocument(item))
    .filter((item): item is AssistantInternalKnowledgeDocument => item !== null)
}

const ASSISTANT_SYNC_DIAGNOSTIC_KEYS = new Set([
  'mode',
  'scope',
  'reason',
  'accepted',
  'documentCount',
  'chunkCount',
  'entityCount',
  'relationCount',
  'issueCount',
  'httpStatus',
  'expectedDimension',
  'actualDimension',
  'providerStep',
  'errorKind',
  'attemptedEndpoints',
  'timeoutMs',
  'sourceName',
  'sourceChecksum',
])

export function summarizeAssistantKnowledgeOps(
  documents: AssistantInternalKnowledgeDocument[],
  lastSyncRun?: AssistantInternalKnowledgeSyncRun | null,
): AssistantKnowledgeOpsSummary {
  const counts: Record<AssistantInternalKnowledgeStatus, number> = {
    DRAFT: 0,
    REVIEWED: 0,
    ACTIVE: 0,
    ARCHIVED: 0,
  }
  let syncedEligible = 0
  let unsyncedEligible = 0
  let staleEligible = 0

  for (const document of documents) {
    counts[document.status] += 1
    if (!isSyncEligibleKnowledgeStatus(document.status)) continue

    if (!document.lastSyncedAt) {
      unsyncedEligible += 1
    } else if (isAfter(document.updatedAt, document.lastSyncedAt)) {
      staleEligible += 1
    } else {
      syncedEligible += 1
    }
  }

  const diagnostic = lastSyncRun?.diagnostic ?? null
  return {
    total: documents.length,
    draft: counts.DRAFT,
    reviewed: counts.REVIEWED,
    active: counts.ACTIVE,
    archived: counts.ARCHIVED,
    eligible: counts.REVIEWED + counts.ACTIVE,
    syncedEligible,
    unsyncedEligible,
    staleEligible,
    lastSyncStatus: lastSyncRun?.status,
    lastSyncReason: typeof diagnostic?.reason === 'string' ? diagnostic.reason : undefined,
    lastSyncMode: typeof diagnostic?.mode === 'string' ? diagnostic.mode : undefined,
    lastSyncAccepted: typeof diagnostic?.accepted === 'boolean' ? diagnostic.accepted : undefined,
    lastSyncIssueCount: typeof diagnostic?.issueCount === 'number' ? diagnostic.issueCount : lastSyncRun?.issueCount,
  }
}

export function normalizeAssistantInternalKnowledgeSyncRun(value: unknown): AssistantInternalKnowledgeSyncRun | null {
  if (!isRecord(value)) return null
  const { id, status, documentCount, chunkCount, issueCount, startedAt, finishedAt, diagnostic } = value
  if (
    typeof id !== 'string' ||
    (status !== 'STARTED' && status !== 'COMPLETED' && status !== 'FAILED' && status !== 'SKIPPED') ||
    typeof documentCount !== 'number' ||
    typeof chunkCount !== 'number' ||
    typeof issueCount !== 'number' ||
    typeof startedAt !== 'string'
  ) {
    return null
  }

  return {
    id,
    status,
    documentCount,
    chunkCount,
    issueCount,
    startedAt,
    finishedAt: typeof finishedAt === 'string' || finishedAt === null ? finishedAt : undefined,
    diagnostic: normalizeAssistantSyncDiagnostic(diagnostic),
  }
}

export function normalizeAssistantRagAdminStatus(value: unknown): AssistantRagAdminStatus | null {
  if (!isRecord(value)) return null
  const { configured, syncConfigured, health, diagnostic } = value
  if (typeof configured !== 'boolean' || typeof syncConfigured !== 'boolean') return null
  return {
    configured,
    syncConfigured,
    health: normalizeAssistantRagHealth(health),
    diagnostic: normalizeAssistantSyncDiagnostic(diagnostic),
  }
}

export function normalizeAssistantRagSyncResult(value: unknown): AssistantRagSyncResult | null {
  if (!isRecord(value)) return null
  const { accepted, status, issueCount, health, diagnostic } = value
  if (
    typeof accepted !== 'boolean' ||
    (status !== 'STARTED' && status !== 'COMPLETED' && status !== 'FAILED' && status !== 'SKIPPED') ||
    typeof issueCount !== 'number'
  ) {
    return null
  }
  return {
    accepted,
    status,
    issueCount,
    health: normalizeAssistantRagHealth(health),
    diagnostic: normalizeAssistantSyncDiagnostic(diagnostic),
  }
}

export function normalizeAssistantRagHealth(value: unknown): AssistantRagHealth | null {
  if (!isRecord(value)) return null
  const {
    service,
    store,
    vectorReady,
    keywordReady,
    rerankerReady,
    lastSyncAt,
    documentCount,
    chunkCount,
    entityCount,
    relationCount,
    collections,
  } = value
  if (
    service !== 'biau-rag-orchestrator' ||
    typeof store !== 'string' ||
    typeof vectorReady !== 'boolean' ||
    typeof keywordReady !== 'boolean' ||
    typeof rerankerReady !== 'boolean' ||
    (typeof lastSyncAt !== 'string' && lastSyncAt !== null) ||
    typeof documentCount !== 'number' ||
    typeof chunkCount !== 'number' ||
    typeof entityCount !== 'number' ||
    typeof relationCount !== 'number'
  ) {
    return null
  }
  return {
    service,
    store,
    vectorReady,
    keywordReady,
    rerankerReady,
    lastSyncAt,
    documentCount,
    chunkCount,
    entityCount,
    relationCount,
    collections: normalizeAssistantRagCollections(collections),
  }
}

function normalizeAssistantRagCollections(value: unknown): AssistantRagHealth['collections'] | undefined {
  if (!isRecord(value)) return undefined
  const publicCollection = normalizeAssistantRagCollection(value.public)
  const internalCollection = normalizeAssistantRagCollection(value.internal)
  if (!publicCollection && !internalCollection) return undefined
  return {
    ...(publicCollection ? { public: publicCollection } : {}),
    ...(internalCollection ? { internal: internalCollection } : {}),
  }
}

function normalizeAssistantRagCollection(value: unknown): AssistantRagCollectionHealth | null {
  if (!isRecord(value)) return null
  const { name, scope, pointCount, vectorReady } = value
  if (
    typeof name !== 'string' ||
    (scope !== 'public' && scope !== 'internal') ||
    typeof pointCount !== 'number' ||
    typeof vectorReady !== 'boolean'
  ) {
    return null
  }
  return { name, scope, pointCount, vectorReady }
}

export function normalizeAssistantUsageSummary(value: unknown): AssistantUsageSummary | null {
  if (!isRecord(value)) return null
  const { id, scope, model, modelChannelId, modelChannel, tokensIn, tokensOut, createdAt, member } = value
  if (
    typeof id !== 'string' ||
    typeof scope !== 'string' ||
    typeof model !== 'string' ||
    typeof tokensIn !== 'number' ||
    typeof tokensOut !== 'number' ||
    typeof createdAt !== 'string'
  ) {
    return null
  }

  return {
    id,
    scope,
    model,
    modelChannelId: typeof modelChannelId === 'string' || modelChannelId === null ? modelChannelId : undefined,
    modelChannel: normalizeAssistantModelChannel(modelChannel) ?? undefined,
    tokensIn,
    tokensOut,
    createdAt,
    member: normalizeAssistantUsageMember(member),
  }
}

export function normalizeAssistantUsageSummaries(value: unknown): AssistantUsageSummary[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeAssistantUsageSummary(item))
    .filter((item): item is AssistantUsageSummary => item !== null)
}

function normalizeAssistantUsageMember(value: unknown): AssistantUsageSummary['member'] {
  if (value === null || value === undefined) return null
  if (!isRecord(value)) return null
  const { id, name, role, status, modelChannelId, modelChannel } = value
  if (typeof id !== 'string' || typeof name !== 'string' || !isAssistantMemberRole(role)) return null
  return {
    id,
    name,
    role,
    status: isAssistantMemberStatus(status) ? status : undefined,
    modelChannelId: typeof modelChannelId === 'string' || modelChannelId === null ? modelChannelId : undefined,
    modelChannel: normalizeAssistantModelChannel(modelChannel) ?? undefined,
  }
}

function normalizeAssistantSyncDiagnostic(value: unknown): Record<string, string | number | boolean> | null {
  if (!isRecord(value)) return null
  const diagnostic: Record<string, string | number | boolean> = {}
  for (const [key, item] of Object.entries(value)) {
    if (ASSISTANT_SYNC_DIAGNOSTIC_KEYS.has(key) && (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
      diagnostic[key] = item
    }
  }
  return diagnostic
}

function isSyncEligibleKnowledgeStatus(status: AssistantInternalKnowledgeStatus) {
  return status === 'REVIEWED' || status === 'ACTIVE'
}

function isAfter(left?: string | null, right?: string | null) {
  if (!left || !right) return false
  const leftTime = Date.parse(left)
  const rightTime = Date.parse(right)
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return false
  return leftTime > rightTime
}

export function normalizeAssistantModelChannel(value: unknown): AssistantModelChannelSummary | null {
  if (!isRecord(value)) return null
  const { id, label, provider, model, configured, isDefault, isActive } = value
  if (
    typeof id !== 'string' ||
    typeof label !== 'string' ||
    typeof provider !== 'string' ||
    typeof model !== 'string' ||
    typeof configured !== 'boolean' ||
    typeof isDefault !== 'boolean'
  ) {
    return null
  }

  return { id, label, provider, model, configured, isDefault, isActive: isActive !== false }
}

export function normalizeAssistantModelChannels(value: unknown): AssistantModelChannelSummary[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeAssistantModelChannel(item))
    .filter((item): item is AssistantModelChannelSummary => item !== null)
}

export function normalizeAssistantMember(value: unknown): AssistantMemberProfile | null {
  if (!isRecord(value)) return null
  const { id, name, role, status, dailyQuota, modelChannelId, modelChannel, disabledAt, lastSeenAt, createdAt } = value
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    !isAssistantMemberRole(role) ||
    typeof dailyQuota !== 'number' ||
    !Number.isFinite(dailyQuota)
  ) {
    return null
  }

  return {
    id,
    name,
    role,
    status: isAssistantMemberStatus(status) ? status : undefined,
    dailyQuota,
    modelChannelId: typeof modelChannelId === 'string' || modelChannelId === null ? modelChannelId : undefined,
    modelChannel: normalizeAssistantModelChannel(modelChannel) ?? undefined,
    disabledAt: typeof disabledAt === 'string' || disabledAt === null ? disabledAt : undefined,
    lastSeenAt: typeof lastSeenAt === 'string' || lastSeenAt === null ? lastSeenAt : undefined,
    createdAt: typeof createdAt === 'string' ? createdAt : undefined,
  }
}
