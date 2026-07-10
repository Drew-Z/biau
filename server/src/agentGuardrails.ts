import type {
  AgentGuardrailSummary,
  AgentToolArtifact,
  AgentToolPermission,
  AgentToolTrace,
  AssistantGroundingMode,
  Citation,
} from './types.js'

const NORMAL_CHAT_ALLOWED_PERMISSIONS = new Set<AgentToolPermission>(['read', 'draft-write'])

export function canUsePermission(permission: AgentToolPermission) {
  return NORMAL_CHAT_ALLOWED_PERMISSIONS.has(permission)
}

export function sanitizeToolTrace(trace: AgentToolTrace): AgentToolTrace {
  return stripUndefinedJson({
    id: trace.id,
    label: trace.label,
    permission: trace.permission,
    status: trace.status,
    durationMs: Math.max(0, Math.trunc(trace.durationMs)),
    summary: sanitizeTraceSummary(trace.summary),
    citationCount: trace.citationCount,
    itemCount: trace.itemCount,
    errorClass: trace.errorClass,
    artifacts: sanitizeToolArtifacts(trace.artifacts),
  })
}

function sanitizeToolArtifacts(value: AgentToolArtifact[] | undefined): AgentToolArtifact[] | undefined {
  if (!Array.isArray(value)) return undefined
  const artifacts = value
    .map((artifact) => sanitizeToolArtifact(artifact))
    .filter((artifact): artifact is AgentToolArtifact => artifact !== null)
  return artifacts.length > 0 ? artifacts.slice(0, 4) : undefined
}

function sanitizeToolArtifact(value: AgentToolArtifact): AgentToolArtifact | null {
  if (value.kind !== 'studio-draft') return null
  if (
    !isSafeIdentifier(value.id, 120) ||
    !isSafeSlug(value.slug) ||
    !isSafeText(value.title, 160) ||
    !isSafeText(value.column, 40) ||
    value.status !== 'review-needed' ||
    value.visibility !== 'hidden' ||
    value.reviewRequired !== true ||
    !isSafeStudioDraftHref(value.href, value.id, value.slug)
  ) {
    return null
  }
  return {
    kind: 'studio-draft',
    id: value.id,
    slug: value.slug,
    title: compactText(value.title, 120),
    column: value.column,
    status: 'review-needed',
    visibility: 'hidden',
    reviewRequired: true,
    href: normalizeStudioDraftHref(value.href),
  }
}

function isSafeStudioDraftHref(value: string, id: string, slug: string) {
  if (value === '/studio') return true
  if (!value.startsWith('/studio?')) return false
  const params = new URLSearchParams(value.slice('/studio?'.length))
  const draft = params.get('draft')
  return Boolean(draft && isSafeIdentifier(draft, 120) && (draft === id || draft === slug))
}

function normalizeStudioDraftHref(value: AgentToolArtifact['href']) {
  if (value === '/studio') return '/studio'
  const params = new URLSearchParams(value.slice('/studio?'.length))
  const draft = params.get('draft') ?? ''
  return `/studio?draft=${encodeURIComponent(draft)}` as AgentToolArtifact['href']
}

export function summarizeGuardrails(input: {
  traces: AgentToolTrace[]
  citations: Citation[]
  grounding: AssistantGroundingMode
  answer: string
}): AgentGuardrailSummary {
  const blockedPermissions = input.traces
    .filter((trace) => !canUsePermission(trace.permission) || trace.status === 'blocked')
    .map((trace) => trace.permission)
  const allowedPermissions = Array.from(NORMAL_CHAT_ALLOWED_PERMISSIONS)
  const sensitiveOutputBlocked = containsSensitiveText(input.answer)
  const citationSufficiency = summarizeCitationSufficiency(input.citations, input.grounding)
  const issues = [
    ...new Set([
      ...input.traces.filter((trace) => trace.status === 'failed').map((trace) => `${trace.id}:tool_error`),
      ...blockedPermissions.map((permission) => `${permission}:blocked`),
      ...(sensitiveOutputBlocked ? ['sensitive-output-blocked'] : []),
      ...(input.grounding !== 'none' && citationSufficiency === 'none' ? ['citation-sufficiency:none'] : []),
    ]),
  ].slice(0, 8)

  return {
    status: sensitiveOutputBlocked || blockedPermissions.length > 0 ? 'blocked' : issues.length > 0 ? 'warned' : 'passed',
    allowedPermissions,
    blockedPermissions: Array.from(new Set(blockedPermissions)),
    citationSufficiency,
    sensitiveOutputBlocked,
    issues,
  }
}

export function containsSensitiveText(value: string) {
  const patterns = [
    /sk-[A-Za-z0-9_-]{16,}/u,
    /Bearer\s+[A-Za-z0-9._-]{12,}/iu,
    /postgres(?:ql)?:\/\/[^"'\s]+/iu,
    /mysql:\/\/[^"'\s]+/iu,
    /mongodb(?:\+srv)?:\/\/[^"'\s]+/iu,
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/u,
    /ASSISTANT_MODEL_API_KEY|ASSISTANT_RAG_API_KEY|RAG_SYNC_TOKEN|DATABASE_URL/u,
  ]
  return patterns.some((pattern) => pattern.test(value))
}

function sanitizeTraceSummary(value: string) {
  if (containsSensitiveText(value)) return '工具摘要包含敏感形态，已隐藏。'
  return compactText(value, 180)
}

function summarizeCitationSufficiency(citations: Citation[], grounding: AssistantGroundingMode) {
  if (grounding === 'none') return 'enough'
  if (citations.length >= 2) return 'enough'
  if (citations.length === 1) return 'weak'
  return 'none'
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

function isSafeIdentifier(value: string, maxLength: number) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength && /^[a-z0-9_-]+$/iu.test(value)
}

function isSafeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value) && value.length >= 3 && value.length <= 96
}

function isSafeText(value: string, maxLength: number) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength && !containsSensitiveText(value)
}

function stripUndefinedJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
