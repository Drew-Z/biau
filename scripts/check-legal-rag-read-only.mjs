import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../', import.meta.url))
const statusRoot = new URL('../public/status/', import.meta.url)
const protectedIds = ['legal-rag-qa', 'legal-rag-contract-review', 'legal-rag-observability']
const requests = []
let scenario = {}
const server = createServer(async (request, response) => {
  let body = ''
  for await (const chunk of request) body += chunk
  requests.push({ method: request.method, path: request.url, body, cookie: request.headers.cookie, authorization: request.headers.authorization })
  const json = (value, status = 200) => response.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(value))
  if (request.url === '/api/health') {
    if (scenario.health === 'invalid') return response.end('private-response-marker{broken')
    if (scenario.health === 'large-header') return response.writeHead(200, { 'Content-Length': 20000 }).end('x'.repeat(20000))
    if (scenario.health === 'large-body') return response.writeHead(200, { 'Transfer-Encoding': 'chunked' }).end('x'.repeat(20000))
    if (scenario.health === 'redirect') return response.writeHead(302, { Location: '/api/auth/status' }).end('{}')
    if (scenario.health === 'slow-header' || scenario.health === 'slow-body') {
      if (scenario.health === 'slow-body') {
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.write('{')
      }
      const timer = setTimeout(() => response.end('{"ok":true}'), 800)
      response.once('close', () => clearTimeout(timer))
      return
    }
    if (scenario.health === 'shared-deadline') {
      let bodyTimer
      const headTimer = setTimeout(() => {
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.write('{"ok":')
        bodyTimer = setTimeout(() => response.end('true}'), 180)
      }, 180)
      response.once('close', () => { clearTimeout(headTimer); clearTimeout(bodyTimer) })
      return
    }
    return json(scenario.health === 'incomplete' ? {} : { ok: true }, scenario.health === 'unavailable' ? 503 : scenario.health === 'denied' ? 401 : 200)
  }
  if (request.url === '/api/auth/status') return json({ enabled: scenario.enabled ?? true, authenticated: scenario.authenticated ?? false })
  if (request.url === '/api/auth/login') {
    if (scenario.loginFailure) return json({ authenticated: false }, 401)
    response.setHeader('Set-Cookie', 'fixture-session=fixture-cookie; HttpOnly')
    return json({ authenticated: true })
  }
  if (request.url === '/api/ingestion-jobs/seed') return json({ job: { id: 'fixture-job' } }, scenario.seedFailure ? 503 : 200)
  if (request.url === '/api/ingestion-jobs/fixture-job') return json({ job: { status: 'succeeded' } })
  if (request.url === '/api/rag/query') return json({ answer: 'fixture', citations: [], retrievedChunks: [], diagnostics: {} })
  if (request.url === '/api/contracts/review') return json({ risks: [{ requiresHumanReview: true }] })
  if (request.url === '/api/quality/report') return json({ checks: [{}], eval: { total: 1 }, reviewEval: { total: 1 } })
  response.writeHead(404).end()
})

async function snapshotHashes() {
  return Object.fromEntries(await Promise.all((await readdir(statusRoot)).filter((name) => name.endsWith('.json')).map(async (name) => [
    name, createHash('sha256').update(await readFile(new URL(name, statusRoot))).digest('hex'),
  ])))
}

async function runCli(base, outputPath, { args = [], credentials = true, suite = false } = {}) {
  const command = suite
    ? ['scripts/check-reliability-suite.mjs', '--json', '--skip', 'main-site,public-links,erp,xunqiu,pet,playlab,site-status,site-monitor']
    : ['scripts/check-legal-rag-synthetic.mjs', '--write-status', outputPath]
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...command, '--strict', '--timeout', '300', ...args], {
      cwd: repoRoot,
      env: {
        ...process.env,
        NODE_OPTIONS: '',
        LEGAL_RAG_API_BASE_URL: base,
        LEGAL_RAG_SYNTHETIC_EMAIL: credentials ? 'fixture@example.test' : '',
        LEGAL_RAG_SYNTHETIC_PASSWORD: credentials ? 'fixture-password' : '',
        LEGAL_RAG_SYNTHETIC_PROJECT_ID: 'fixture-project',
        LEGAL_RAG_SYNTHETIC_BUSINESS_CHECKS: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.once('error', reject)
    child.once('close', (code) => resolve({ code, stdout, stderr }))
  })
  const report = suite ? JSON.parse(result.stdout) : await readFile(outputPath, 'utf8').then(JSON.parse).catch(() => null)
  for (const sensitive of [base, 'fixture@example.test', 'fixture-password', 'fixture-cookie', 'private-response-marker']) {
    assert.equal(`${result.stdout}${result.stderr}${JSON.stringify(report)}`.includes(sensitive), false, 'report/log must remain low-sensitive')
  }
  return { ...result, report }
}

function assertReadOnly(report) {
  assert.equal(report.checkMode, 'read-only')
  assert.equal(requests.length, 1)
  assert.deepEqual(requests[0], { method: 'GET', path: '/api/health', body: '', cookie: undefined, authorization: undefined })
  assert.equal(report.checks.length, 4)
  for (const id of protectedIds) assert.equal(report.checks.find((check) => check.id === id).status, 'unchecked')
  assert.notEqual(report.demoAccessStatus, 'open-demo')
}

const before = await snapshotHashes()
const temporaryRoot = await mkdtemp(join(tmpdir(), 'biau-reliability-legal-contract-'))
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
try {
  const base = `http://127.0.0.1:${server.address().port}`
  let sequence = 0
  const run = async (settings, options) => {
    scenario = settings
    requests.length = 0
    return runCli(base, join(temporaryRoot, `report-${++sequence}.json`), options)
  }
  for (const settings of [{}, { enabled: false }, { authenticated: true }]) {
    for (const args of [[], ['--read-only']]) {
      for (const credentials of [true, false]) {
        const result = await run(settings, { args, credentials })
        assert.equal(result.code, 0, result.stderr)
        assertReadOnly(result.report)
        assert.equal(result.report.demoAccessStatus, 'not-checked')
        assert.equal(result.report.checks[0].status, 'online')
      }
    }
  }
  for (const [health, code, issue] of [
    ['unavailable', 1, 'server returned HTTP 503'],
    ['denied', 0, 'requires authentication'],
    ['incomplete', 1, ''],
    ['invalid', 1, 'request failed: invalid_json'],
    ['large-header', 1, 'request failed: response_too_large'],
    ['large-body', 1, 'request failed: response_too_large'],
    ['slow-header', 1, 'request failed: timeout'],
    ['slow-body', 1, 'request failed: timeout'],
    ['shared-deadline', 1, 'request failed: timeout'],
    ['redirect', 1, 'HTTP 302'],
  ]) {
    const result = await run({ health })
    assert.equal(result.code, code, health)
    assertReadOnly(result.report)
    assert.equal(result.report.checks[0].status, health === 'denied' ? 'degraded' : 'offline')
    if (issue) assert.ok(result.report.checks[0].issues.includes(issue), health)
    assert.ok(result.report.checks[0].durationMs < 1500, 'health header and body must share a bounded deadline')
  }
  const conflict = await run({}, { args: ['--read-only', '--business-checks'] })
  assert.equal(conflict.code, 1)
  assert.equal(conflict.report, null)
  assert.equal(requests.length, 0)
  assert.match(conflict.stderr, /conflicting Legal RAG check modes/)
  for (const settings of [{}, { enabled: false }, { authenticated: true }]) {
    const result = await run(settings, { args: ['--business-checks'] })
    assert.equal(result.code, 0, result.stderr)
    assert.equal(result.report.checkMode, 'business')
    assert.equal(result.report.demoAccessStatus, 'open-demo')
    const expected = ['GET /api/health', 'GET /api/auth/status']
    if (settings.enabled !== false && !settings.authenticated) expected.push('POST /api/auth/login')
    expected.push('POST /api/ingestion-jobs/seed', 'GET /api/ingestion-jobs/fixture-job', 'POST /api/rag/query', 'POST /api/contracts/review', 'GET /api/quality/report')
    assert.deepEqual(requests.map((request) => `${request.method} ${request.path}`), expected)
  }
  const loginFailure = await run({ loginFailure: true }, { args: ['--business-checks'] })
  assert.equal(loginFailure.code, 1)
  assert.equal(loginFailure.report.demoAccessStatus, 'blocked-by-login')
  assert.equal(requests.length, 3)
  const seedFailure = await run({ seedFailure: true }, { args: ['--business-checks'] })
  assert.equal(seedFailure.report.demoAccessStatus, 'degraded')
  assert.equal(seedFailure.report.checks.find((check) => check.id === 'legal-rag-qa').status, 'unchecked')
  assert.equal(requests.some((request) => request.path === '/api/rag/query'), false)
  const suite = await run({}, { suite: true })
  assert.equal(suite.code, 0, suite.stderr)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].path, '/api/health')
  const legal = suite.report.steps.find((step) => step.id === 'legal-rag')
  assert.match(legal.command, /--read-only/)
  assert.equal(legal.status, 'passed')
  assert.equal(legal.coverageStatus, 'partial')
  assert.deepEqual(legal.coverage, { total: 4, online: 1, degraded: 0, offline: 0, unchecked: 3, planned: 0 })
  assert.deepEqual(await snapshotHashes(), before)
  console.log('Legal RAG mode checks passed: health-only defaults, bounded JSON/deadline, explicit loopback business flows, suite isolation, unchanged public snapshots; external/model calls=0.')
} finally {
  server.closeAllConnections()
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await rm(temporaryRoot, { recursive: true })
}
