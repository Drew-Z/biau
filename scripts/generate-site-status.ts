import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SITE_STATUS_BASE_URL,
  reliabilityProjects,
  siteStatusTargets,
  type ReliabilityProject,
  type ReliabilityStatus,
  type SiteStatusTarget,
} from '../src/data/statusTargets.ts'

type GeneratedStatus = Extract<ReliabilityStatus, 'online' | 'degraded' | 'offline' | 'unchecked'>
type SiteStatusIssueKind =
  | 'none'
  | 'timeout'
  | 'dns_error'
  | 'tls_error'
  | 'connection_error'
  | 'network_error'
  | 'http_status'
  | 'not_checked'

interface CheckResult extends SiteStatusTarget {
  status: GeneratedStatus
  httpStatus: number
  durationMs: number
  checkedAt: string
  finalUrl: string
  issueKind: SiteStatusIssueKind
  issues: string[]
}

interface Summary {
  total: number
  online: number
  degraded: number
  offline: number
  unchecked: number
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, 'public/status/site-status.json')
const statusDir = resolve(repoRoot, 'public/status')
const DEFAULT_TIMEOUT_MS = 12_000

interface SyntheticCheckResult {
  id: string
  status: GeneratedStatus
  httpStatus: number
  durationMs: number
  checkedAt: string
  summary: string
  issues: string[]
}

type EvidenceFreshness = 'fresh' | 'aging' | 'stale' | 'unknown'

const FRESH_EVIDENCE_MS = 24 * 60 * 60 * 1000
const STALE_EVIDENCE_MS = 72 * 60 * 60 * 1000

function parseArgs(argv: string[]) {
  const args = {
    timeoutMs: Number(process.env.SITE_STATUS_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    strict: process.env.SITE_STATUS_STRICT === '1',
  }

  const readValue = (index: number) => argv[index + 1] ?? ''
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--strict') {
      args.strict = true
      continue
    }
    if (item === '--timeout') {
      args.timeoutMs = Number(readValue(index))
      index += 1
      continue
    }
    if (item.startsWith('--timeout=')) {
      args.timeoutMs = Number(item.slice('--timeout='.length))
    }
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) args.timeoutMs = DEFAULT_TIMEOUT_MS
  return args
}

function statusFromHttpStatus(httpStatus: number, hasNetworkError: boolean): GeneratedStatus {
  if (hasNetworkError) return 'offline'
  if (httpStatus >= 200 && httpStatus < 400) return 'online'
  if ([401, 403, 404, 405, 408, 409, 425, 429].includes(httpStatus)) return 'degraded'
  if (httpStatus > 0) return 'offline'
  return 'unchecked'
}

function classifyFetchError(error: unknown): SiteStatusIssueKind {
  if (!error || typeof error !== 'object') return 'network_error'
  const record = error as { name?: unknown; code?: unknown; cause?: unknown }
  const code =
    typeof record.code === 'string'
      ? record.code
      : record.cause && typeof record.cause === 'object'
        ? ((record.cause as { code?: unknown }).code ?? '')
        : ''

  if (record.name === 'AbortError' || code === 'ETIMEDOUT') return 'timeout'
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns_error'
  if (
    code === 'CERT_HAS_EXPIRED' ||
    code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'DEPTH_ZERO_SELF_SIGNED_CERT'
  ) {
    return 'tls_error'
  }
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'UND_ERR_SOCKET') return 'connection_error'
  return 'network_error'
}

function issueFromStatus(httpStatus: number, issueKind: SiteStatusIssueKind) {
  if (issueKind !== 'none') return `request failed: ${issueKind}`
  if (httpStatus >= 200 && httpStatus < 400) return ''
  if ([401, 403].includes(httpStatus)) return 'requires login or denies anonymous access'
  if (httpStatus === 404) return 'public route returned 404'
  if (httpStatus === 405) return 'method not allowed but host responded'
  if (httpStatus === 429) return 'rate limited'
  if (httpStatus >= 500) return `server returned HTTP ${httpStatus}`
  return httpStatus > 0 ? `HTTP ${httpStatus}` : 'not checked'
}

function delay(ms: number) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms)
  })
}

function shouldRetryStatus(result: Awaited<ReturnType<typeof fetchWithTimeout>>) {
  if (['timeout', 'network_error', 'connection_error'].includes(result.issueKind)) return true
  return result.httpStatus >= 500
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'biau-site-status/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
      },
    })
    await response.arrayBuffer().catch(() => null)
    return {
      httpStatus: response.status,
      finalUrl: response.url,
      durationMs: Date.now() - startedAt,
      error: '',
      issueKind: 'none' as const,
    }
  } catch (error) {
    return {
      httpStatus: 0,
      finalUrl: url,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      issueKind: classifyFetchError(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchWithRetry(url: string, timeoutMs: number) {
  const first = await fetchWithTimeout(url, timeoutMs)
  if (!shouldRetryStatus(first)) return first

  await delay(800)
  const second = await fetchWithTimeout(url, timeoutMs)
  return {
    ...second,
    durationMs: first.durationMs + second.durationMs,
  }
}

function summarize(results: CheckResult[]): Summary {
  return results.reduce<Summary>(
    (summary, result) => {
      summary.total += 1
      summary[result.status] += 1
      return summary
    },
    { total: 0, online: 0, degraded: 0, offline: 0, unchecked: 0 },
  )
}

function isGeneratedStatus(value: unknown): value is GeneratedStatus {
  return value === 'online' || value === 'degraded' || value === 'offline' || value === 'unchecked'
}

function normalizeSyntheticCheck(value: unknown): SyntheticCheckResult | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string' || !isGeneratedStatus(record.status)) return null
  return {
    id: record.id,
    status: record.status,
    httpStatus: typeof record.httpStatus === 'number' ? record.httpStatus : 0,
    durationMs: typeof record.durationMs === 'number' ? record.durationMs : 0,
    checkedAt: typeof record.checkedAt === 'string' ? record.checkedAt : '',
    summary: typeof record.summary === 'string' ? record.summary : 'synthetic check result available',
    issues: Array.isArray(record.issues) ? record.issues.filter((item): item is string => typeof item === 'string') : [],
  }
}

function classifyEvidenceFreshness(checkedAt: string, generatedAtMs: number): EvidenceFreshness {
  const checkedAtMs = Date.parse(checkedAt)
  if (!Number.isFinite(checkedAtMs)) return 'unknown'
  const ageMs = generatedAtMs - checkedAtMs
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'unknown'
  if (ageMs <= FRESH_EVIDENCE_MS) return 'fresh'
  if (ageMs <= STALE_EVIDENCE_MS) return 'aging'
  return 'stale'
}

function formatEvidenceAge(checkedAt: string, generatedAtMs: number) {
  const checkedAtMs = Date.parse(checkedAt)
  if (!Number.isFinite(checkedAtMs)) return '时间不可读'
  const ageMs = Math.max(0, generatedAtMs - checkedAtMs)
  const ageMinutes = Math.round(ageMs / 60_000)
  if (ageMinutes < 60) return `${Math.max(1, ageMinutes)} 分钟前`
  const ageHours = Math.round(ageMinutes / 60)
  if (ageHours < 48) return `${ageHours} 小时前`
  return `${Math.round(ageHours / 24)} 天前`
}

function evidenceFreshnessLabel(freshness: EvidenceFreshness) {
  if (freshness === 'fresh') return '新鲜'
  if (freshness === 'aging') return '接近过期'
  if (freshness === 'stale') return '已过期'
  return '未知'
}

function applyFreshnessToStatus(status: GeneratedStatus, freshness: EvidenceFreshness): GeneratedStatus {
  if (status === 'online' && (freshness === 'stale' || freshness === 'unknown')) return 'degraded'
  return status
}

function formatFreshnessEvidence(check: SyntheticCheckResult, generatedAtMs: number) {
  const freshness = classifyEvidenceFreshness(check.checkedAt, generatedAtMs)
  return `证据时间：${check.checkedAt || '未记录'}；证据新鲜度：${evidenceFreshnessLabel(freshness)}（${formatEvidenceAge(check.checkedAt, generatedAtMs)}）`
}

async function loadSyntheticChecks(): Promise<Map<string, SyntheticCheckResult>> {
  const merged = new Map<string, SyntheticCheckResult>()
  let entries: string[]

  try {
    entries = await readdir(statusDir)
  } catch {
    return merged
  }

  const syntheticFiles = entries.filter((entry) => entry.endsWith('-synthetic.json'))
  for (const fileName of syntheticFiles) {
    for (const check of await loadSyntheticChecksFromFile(resolve(statusDir, fileName))) {
      merged.set(check.id, check)
    }
  }

  return merged
}

async function loadSyntheticChecksFromFile(filePath: string): Promise<SyntheticCheckResult[]> {
  try {
    const payload = JSON.parse(await readFile(filePath, 'utf8')) as unknown
    if (!payload || typeof payload !== 'object') return []
    const checks = (payload as { checks?: unknown }).checks
    if (!Array.isArray(checks)) return []
    return checks.map(normalizeSyntheticCheck).filter((check): check is SyntheticCheckResult => Boolean(check))
  } catch {
    return []
  }
}

function mergeReliabilityProjects(
  targets: CheckResult[],
  syntheticChecks: Map<string, SyntheticCheckResult>,
  generatedAtMs: number,
): ReliabilityProject[] {
  const targetStatus = new Map(targets.map((target) => [target.id, target]))
  return reliabilityProjects.map((project) => ({
    ...project,
    checks: project.checks.map((check) => {
      const synthetic = syntheticChecks.get(check.id)
      if (synthetic) {
        const issue = synthetic.issues[0]
        const freshnessEvidence = formatFreshnessEvidence(synthetic, generatedAtMs)
        return {
          ...check,
          status: applyFreshnessToStatus(synthetic.status, classifyEvidenceFreshness(synthetic.checkedAt, generatedAtMs)),
          evidence: issue
            ? `最近一次 synthetic 检查：${synthetic.summary}；${freshnessEvidence}；${issue}。${check.evidence}`
            : `最近一次 synthetic 检查：${synthetic.summary}；${freshnessEvidence}。${check.evidence}`,
        }
      }
      if (!check.relatedTargetId) return check
      const target = targetStatus.get(check.relatedTargetId)
      if (!target) return check
      const issue = target.issues[0]
      return {
        ...check,
        status: target.status,
        evidence: issue
          ? `最近一次入口检测：${issue}。${check.evidence}`
          : `最近一次入口检测通过：${target.httpStatus > 0 ? `HTTP ${target.httpStatus}` : 'host responded'}，耗时 ${target.durationMs} ms。${check.evidence}`,
      }
    }),
  }))
}

async function checkTarget(target: SiteStatusTarget, timeoutMs: number): Promise<CheckResult> {
  const checkedAt = new Date().toISOString()
  const response = await fetchWithRetry(target.url, timeoutMs)
  const status = statusFromHttpStatus(response.httpStatus, Boolean(response.error))
  const issueKind = response.error ? response.issueKind : response.httpStatus > 0 ? 'http_status' : 'not_checked'
  const issue = issueFromStatus(response.httpStatus, response.error ? response.issueKind : 'none')

  return {
    ...target,
    status,
    httpStatus: response.httpStatus,
    durationMs: response.durationMs,
    checkedAt,
    finalUrl: response.finalUrl,
    issueKind: issue ? issueKind : 'none',
    issues: issue ? [issue] : [],
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const generatedAt = new Date()
  const checkedAt = generatedAt.toISOString()
  const generatedAtMs = generatedAt.getTime()
  const targets = []
  const syntheticChecks = await loadSyntheticChecks()

  for (const target of siteStatusTargets) {
    targets.push(await checkTarget(target, args.timeoutMs))
  }

  const summary = summarize(targets)
  const result = {
    checkedAt,
    base: SITE_STATUS_BASE_URL,
    ok: summary.offline === 0,
    summary,
    targets,
    reliabilityProjects: mergeReliabilityProjects(targets, syntheticChecks, generatedAtMs),
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`)

  console.log(`Generated public/status/site-status.json with ${targets.length} targets.`)
  console.log(`online=${summary.online} degraded=${summary.degraded} offline=${summary.offline} unchecked=${summary.unchecked}`)

  if (args.strict && !result.ok) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
