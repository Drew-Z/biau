import { mkdir, readFile, writeFile } from 'node:fs/promises'
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

interface CheckResult extends SiteStatusTarget {
  status: GeneratedStatus
  httpStatus: number
  durationMs: number
  checkedAt: string
  finalUrl: string
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
const legalRagSyntheticPath = resolve(repoRoot, 'public/status/legal-rag-synthetic.json')
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

function issueFromStatus(httpStatus: number, error: string) {
  if (error) return `request failed: ${error}`
  if (httpStatus >= 200 && httpStatus < 400) return ''
  if ([401, 403].includes(httpStatus)) return 'requires login or denies anonymous access'
  if (httpStatus === 404) return 'public route returned 404'
  if (httpStatus === 405) return 'method not allowed but host responded'
  if (httpStatus === 429) return 'rate limited'
  if (httpStatus >= 500) return `server returned HTTP ${httpStatus}`
  return httpStatus > 0 ? `HTTP ${httpStatus}` : 'not checked'
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
    }
  } catch (error) {
    return {
      httpStatus: 0,
      finalUrl: url,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
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

async function loadLegalRagSyntheticChecks(): Promise<Map<string, SyntheticCheckResult>> {
  try {
    const payload = JSON.parse(await readFile(legalRagSyntheticPath, 'utf8')) as unknown
    if (!payload || typeof payload !== 'object') return new Map()
    const checks = (payload as { checks?: unknown }).checks
    if (!Array.isArray(checks)) return new Map()
    return new Map(
      checks
        .map(normalizeSyntheticCheck)
        .filter((check): check is SyntheticCheckResult => Boolean(check))
        .map((check) => [check.id, check]),
    )
  } catch {
    return new Map()
  }
}

function mergeReliabilityProjects(
  targets: CheckResult[],
  syntheticChecks: Map<string, SyntheticCheckResult>,
): ReliabilityProject[] {
  const targetStatus = new Map(targets.map((target) => [target.id, target]))
  return reliabilityProjects.map((project) => ({
    ...project,
    checks: project.checks.map((check) => {
      const synthetic = syntheticChecks.get(check.id)
      if (synthetic) {
        const issue = synthetic.issues[0]
        return {
          ...check,
          status: synthetic.status,
          evidence: issue
            ? `最近一次 synthetic 检查：${synthetic.summary}；${issue}。${check.evidence}`
            : `最近一次 synthetic 检查：${synthetic.summary}。${check.evidence}`,
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
  const response = await fetchWithTimeout(target.url, timeoutMs)
  const status = statusFromHttpStatus(response.httpStatus, Boolean(response.error))
  const issue = issueFromStatus(response.httpStatus, response.error)

  return {
    ...target,
    status,
    httpStatus: response.httpStatus,
    durationMs: response.durationMs,
    checkedAt,
    finalUrl: response.finalUrl,
    issues: issue ? [issue] : [],
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const checkedAt = new Date().toISOString()
  const targets = []
  const syntheticChecks = await loadLegalRagSyntheticChecks()

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
    reliabilityProjects: mergeReliabilityProjects(targets, syntheticChecks),
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
