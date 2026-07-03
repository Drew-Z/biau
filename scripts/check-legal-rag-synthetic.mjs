import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, 'public/status/legal-rag-synthetic.json')
const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_PROJECT_ID = 'project_default'
const CHECK_IDS = [
  'legal-rag-health',
  'legal-rag-qa',
  'legal-rag-contract-review',
  'legal-rag-observability',
]

const SAMPLE_QUESTION = '技术服务合同里，验收标准不明确会带来什么风险？'
const SAMPLE_CONTRACT = [
  '技术服务合同',
  '第一条 服务内容：乙方提供系统开发服务，具体范围以双方沟通为准。',
  '第二条 付款：甲方一次性支付服务费，但未约定验收与退款条件。',
  '第三条 验收：双方另行协商验收标准。',
  '第四条 数据安全：乙方应采取合理措施保护数据。',
].join('\n')

function parseArgs(argv) {
  const args = {
    strict: process.env.LEGAL_RAG_SYNTHETIC_STRICT === '1',
    timeoutMs: Number(process.env.LEGAL_RAG_SYNTHETIC_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  }

  const readValue = (index) => argv[index + 1] ?? ''
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

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withProtocol.replace(/\/+$/, '')
}

function emptyCheck(id, summary, issues = []) {
  return {
    id,
    status: 'unchecked',
    httpStatus: 0,
    durationMs: 0,
    checkedAt: new Date().toISOString(),
    summary,
    issues,
  }
}

function statusFromResponse(response, ok) {
  if (ok) return 'online'
  if ([401, 403, 404, 405, 408, 409, 425, 429].includes(response.status)) return 'degraded'
  if (response.status > 0) return 'offline'
  return 'unchecked'
}

function issueFromResponse(response, fallback = '') {
  if (response.ok) return ''
  if (fallback) return fallback
  if (response.status === 401 || response.status === 403) return 'requires authentication'
  if (response.status === 429) return 'rate limited'
  if (response.status >= 500) return `server returned HTTP ${response.status}`
  return response.status > 0 ? `HTTP ${response.status}` : 'request failed'
}

async function requestJson(baseUrl, path, options, timeoutMs, cookieJar) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'biau-legal-rag-synthetic/1.0',
    ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(cookieJar.size > 0 ? { Cookie: [...cookieJar.values()].join('; ') } : {}),
    ...(options?.headers ?? {}),
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    storeCookies(response, cookieJar)
    const json = await response.json().catch(() => null)
    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      json,
      error: '',
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      json: null,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function storeCookies(response, cookieJar) {
  const values =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean)

  for (const value of values) {
    const pair = value.split(';')[0]
    const name = pair.split('=')[0]
    if (name) cookieJar.set(name, pair)
  }
}

function checkFromResponse(id, response, ok, summary, fallbackIssue = '') {
  const issue = response.error || issueFromResponse(response, fallbackIssue)
  return {
    id,
    status: statusFromResponse(response, ok),
    httpStatus: response.status,
    durationMs: response.durationMs,
    checkedAt: new Date().toISOString(),
    summary,
    issues: issue ? [issue] : [],
  }
}

async function waitForSeedJob(baseUrl, jobId, timeoutMs, cookieJar) {
  if (!jobId) return { ok: true, status: 200, durationMs: 0, json: null, error: '' }
  const startedAt = Date.now()
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await requestJson(baseUrl, `/api/ingestion-jobs/${encodeURIComponent(jobId)}`, {}, timeoutMs, cookieJar)
    const status = response.json?.job?.status
    if (status === 'succeeded') {
      return { ...response, durationMs: Date.now() - startedAt }
    }
    if (status === 'failed') {
      return { ...response, ok: false, durationMs: Date.now() - startedAt, error: 'public dataset seed failed' }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return { ok: false, status: 0, durationMs: Date.now() - startedAt, json: null, error: 'public dataset seed timed out' }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const baseUrl = normalizeBaseUrl(process.env.LEGAL_RAG_API_BASE_URL)
  const email = String(process.env.LEGAL_RAG_SYNTHETIC_EMAIL || '').trim()
  const password = String(process.env.LEGAL_RAG_SYNTHETIC_PASSWORD || '')
  const projectId = String(process.env.LEGAL_RAG_SYNTHETIC_PROJECT_ID || DEFAULT_PROJECT_ID).trim() || DEFAULT_PROJECT_ID
  const hasCredentials = Boolean(email && password)
  const checkedAt = new Date().toISOString()
  const checks = []
  const cookieJar = new Map()

  if (!baseUrl) {
    checks.push(...CHECK_IDS.map((id) => emptyCheck(id, 'LEGAL_RAG_API_BASE_URL is not configured')))
    await writeReport({ checkedAt, apiBaseConfigured: false, hasCredentials, checks })
    console.log('Legal RAG synthetic report generated without API base URL; all live checks are unchecked.')
    return
  }

  const health = await requestJson(baseUrl, '/api/health', {}, args.timeoutMs, cookieJar)
  checks.push(
    checkFromResponse(
      'legal-rag-health',
      health,
      health.ok && health.json?.ok === true,
      health.ok && health.json?.ok === true ? 'API health returned ok=true' : 'API health did not confirm ok=true',
    ),
  )

  const authStatus = await requestJson(baseUrl, '/api/auth/status', {}, args.timeoutMs, cookieJar)
  const authEnabled = authStatus.json?.enabled === true
  const alreadyAuthenticated = authStatus.json?.authenticated === true

  if (authEnabled && !alreadyAuthenticated && !hasCredentials) {
    checks.push(
      emptyCheck('legal-rag-qa', 'Auth is enabled; credentials are required for RAG query checks'),
      emptyCheck('legal-rag-contract-review', 'Auth is enabled; credentials are required for contract review checks'),
      emptyCheck('legal-rag-observability', 'Auth is enabled; credentials are required for quality report checks'),
    )
    await writeReport({ checkedAt, apiBaseConfigured: true, hasCredentials, checks })
    console.log('Legal RAG health checked; protected checks skipped because credentials are not configured.')
    if (args.strict && checks.some((check) => check.status === 'offline')) process.exitCode = 1
    return
  }

  if (authEnabled && !alreadyAuthenticated) {
    const login = await requestJson(
      baseUrl,
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      args.timeoutMs,
      cookieJar,
    )

    if (!login.ok || login.json?.authenticated !== true) {
      const failed = checkFromResponse('legal-rag-qa', login, false, 'Login failed before protected checks', 'authentication failed')
      checks.push(
        failed,
        { ...failed, id: 'legal-rag-contract-review' },
        { ...failed, id: 'legal-rag-observability' },
      )
      await writeReport({ checkedAt, apiBaseConfigured: true, hasCredentials, checks })
      console.log('Legal RAG health checked; protected checks failed at login.')
      if (args.strict) process.exitCode = 1
      return
    }
  }

  const seed = await requestJson(
    baseUrl,
    '/api/ingestion-jobs/seed',
    { method: 'POST', body: JSON.stringify({ projectId }) },
    args.timeoutMs,
    cookieJar,
  )
  const seedJob = seed.ok ? await waitForSeedJob(baseUrl, seed.json?.job?.id, args.timeoutMs, cookieJar) : seed
  if (!seedJob.ok) {
    const issue = seedJob.error || 'public dataset seed did not succeed'
    checks.push(emptyCheck('legal-rag-qa', 'Public-safe dataset seed did not complete', [issue]))
  } else {
    const qa = await requestJson(
      baseUrl,
      '/api/rag/query',
      {
        method: 'POST',
        body: JSON.stringify({ projectId, question: SAMPLE_QUESTION, topK: 5 }),
      },
      args.timeoutMs,
      cookieJar,
    )
    const qaOk =
      qa.ok &&
      typeof qa.json?.answer === 'string' &&
      qa.json.answer.trim().length > 0 &&
      Array.isArray(qa.json?.citations) &&
      Array.isArray(qa.json?.retrievedChunks) &&
      Boolean(qa.json?.diagnostics)
    checks.push(
      checkFromResponse(
        'legal-rag-qa',
        qa,
        qaOk,
        qaOk ? 'RAG query returned answer, citations, retrieved chunks, and diagnostics' : 'RAG query payload is incomplete',
      ),
    )
  }

  const review = await requestJson(
    baseUrl,
    '/api/contracts/review',
    {
      method: 'POST',
      body: JSON.stringify({ projectId, text: SAMPLE_CONTRACT }),
    },
    args.timeoutMs,
    cookieJar,
  )
  const reviewOk =
    review.ok &&
    Array.isArray(review.json?.risks) &&
    review.json.risks.length > 0 &&
    review.json.risks.some((risk) => typeof risk?.requiresHumanReview === 'boolean')
  checks.push(
    checkFromResponse(
      'legal-rag-contract-review',
      review,
      reviewOk,
      reviewOk ? 'Contract review returned risks with human-review flags' : 'Contract review payload is incomplete',
    ),
  )

  const quality = await requestJson(baseUrl, '/api/quality/report', {}, args.timeoutMs, cookieJar)
  const qualityOk =
    quality.ok &&
    Array.isArray(quality.json?.checks) &&
    quality.json.checks.length > 0 &&
    typeof quality.json?.eval?.total === 'number' &&
    typeof quality.json?.reviewEval?.total === 'number'
  checks.push(
    checkFromResponse(
      'legal-rag-observability',
      quality,
      qualityOk,
      qualityOk ? 'Quality report returned RAG and contract-review evaluation summaries' : 'Quality report payload is incomplete',
    ),
  )

  await writeReport({ checkedAt, apiBaseConfigured: true, hasCredentials, checks })
  console.log(
    `Legal RAG synthetic report generated: online=${checks.filter((check) => check.status === 'online').length} unchecked=${checks.filter((check) => check.status === 'unchecked').length} offline=${checks.filter((check) => check.status === 'offline').length}`,
  )

  if (args.strict && checks.some((check) => check.status === 'offline')) process.exitCode = 1
}

async function writeReport(report) {
  const payload = {
    checkedAt: report.checkedAt,
    apiBaseConfigured: report.apiBaseConfigured,
    hasCredentials: report.hasCredentials,
    ok: report.checks.every((check) => check.status !== 'offline'),
    checks: report.checks,
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
