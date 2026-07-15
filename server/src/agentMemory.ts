import type { AgentMemoryKind } from '@prisma/client'
import { containsSensitiveText } from './agentGuardrails.js'
import { sha256 } from './crypto.js'

const MAX_MEMORY_CONTENT_LENGTH = 600

export type AgentMemoryCandidateFailureReason =
  | 'not-explicit-memory-request'
  | 'memory-query-only'
  | 'missing-memory-content'
  | 'memory-content-too-long'
  | 'sensitive-content-detected'

export type AgentMemoryCandidate =
  | {
      allowed: true
      kind: AgentMemoryKind
      title: string
      content: string
      contentHash: string
    }
  | {
      allowed: false
      reason: AgentMemoryCandidateFailureReason
    }

const queryOnlyPatterns = [
  /(?:你|还|是否).{0,8}记得(?:吗|么|不记得|我的|之前)/u,
  /(?:回顾|回忆|根据|结合).{0,12}(?:历史|之前|记忆|上下文)/u,
  /what do you remember|do you remember|recall (?:my|the)/iu,
]

const directMemoryPatterns = [
  /^(?:请|麻烦|帮我)?\s*(?:记住|记下来|保存|存下|记录)(?:这个|以下|我的)?(?:偏好|规则|信息|内容|习惯|约束|备注)?\s*[：:,，-]*\s*(.+)$/u,
  /^(?:remember|save|store)(?: this| that| my preference| the rule)?\s*[：:,\s-]+(.+)$/iu,
]

const futurePreferencePattern =
  /^(?:以后|今后|后续)(?=[^。！？!?]{0,120}(?:默认|回答|回复|输出|使用|按照|按这个|优先|不要|务必|一律|先.{1,40}再))(.+)$/u

export function hasExplicitMemoryWriteIntent(question: string) {
  const normalized = normalizeText(question)
  if (!normalized || isMemoryQueryOnly(normalized)) return false
  return directMemoryPatterns.some((pattern) => pattern.test(normalized)) || futurePreferencePattern.test(normalized)
}

export function isMemoryQueryOnly(question: string) {
  const normalized = normalizeText(question)
  return queryOnlyPatterns.some((pattern) => pattern.test(normalized))
}

export function buildAgentMemoryCandidate(question: string): AgentMemoryCandidate {
  const normalized = normalizeText(question)
  if (isMemoryQueryOnly(normalized)) return { allowed: false, reason: 'memory-query-only' }

  const content = extractMemoryContent(normalized)
  if (content === null) return { allowed: false, reason: 'not-explicit-memory-request' }
  if (!content) return { allowed: false, reason: 'missing-memory-content' }
  if (content.length > MAX_MEMORY_CONTENT_LENGTH) return { allowed: false, reason: 'memory-content-too-long' }
  if (containsSensitiveText(content) || containsMemorySensitiveText(content)) {
    return { allowed: false, reason: 'sensitive-content-detected' }
  }

  const kind = inferMemoryKind(content)
  const title = buildMemoryTitle(kind, content)
  return {
    allowed: true,
    kind,
    title,
    content,
    contentHash: sha256(`${kind}:${content.toLowerCase()}`),
  }
}

function extractMemoryContent(question: string) {
  for (const pattern of directMemoryPatterns) {
    const matched = question.match(pattern)
    if (matched) return cleanExtractedContent(matched[1] ?? '')
  }

  const futureMatched = question.match(futurePreferencePattern)
  if (futureMatched) return cleanExtractedContent(`以后${futureMatched[1] ?? ''}`)
  return null
}

function inferMemoryKind(content: string): AgentMemoryKind {
  if (/(?:偏好|默认|喜欢|习惯|语言|语气|格式|简体中文|英文|回答)/u.test(content)) return 'PREFERENCE'
  if (/(?:项目|代码库|仓库|架构|技术栈|部署|legal|rag|erp|pet|xunqiu|playlab)/iu.test(content)) return 'PROJECT'
  if (/(?:流程|工作流|步骤|审核|发布|提交|测试|验证|先.+再)/u.test(content)) return 'WORKFLOW'
  return 'CONTEXT'
}

function buildMemoryTitle(kind: AgentMemoryKind, content: string) {
  const prefix =
    kind === 'PREFERENCE'
      ? '站长偏好'
      : kind === 'PROJECT'
        ? '项目约束'
        : kind === 'WORKFLOW'
          ? '工作流规则'
          : '上下文备注'
  const compact = content.replace(/[。！？!?]+$/u, '').slice(0, 28)
  return compact ? `${prefix}：${compact}`.slice(0, 60) : prefix
}

function containsMemorySensitiveText(value: string) {
  const patterns = [
    /(?:password|passwd|pwd|api[-_ ]?key|secret|token)\s*[:=]\s*\S+/iu,
    /(?:密码|密钥|令牌|访问码|连接串)\s*(?:是|为|[:：=])\s*\S+/u,
    /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/u,
    /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/iu,
    /https?:\/\/[^/\s]+\.(?:local|internal)(?::\d+)?/iu,
    /file:\/\/[^\s]+/iu,
    /-----BEGIN (?:CERTIFICATE|[A-Z ]+PRIVATE KEY)-----/u,
  ]
  return patterns.some((pattern) => pattern.test(value))
}

function cleanExtractedContent(value: string) {
  return normalizeText(value).replace(/^[：:,，;；\s-]+|[\s]+$/gu, '')
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}
