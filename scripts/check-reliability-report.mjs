import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const repoRoot = fileURLToPath(new URL('../', import.meta.url))
const statusRoot = new URL('../public/status/', import.meta.url)
const sitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
const skip = 'public-links,legal-rag,erp,xunqiu,pet,playlab,site-status,site-monitor'
let healthStatus = 200
let healthStatuses = []
let healthHtml = false
let nonGetRequests = 0
let healthRequests = 0
let linkStatus = 200
const server = createServer((request, response) => {
  if (request.url === '/link-fixture') {
    response.writeHead(linkStatus).end()
    return
  }
  if (request.method !== 'GET') {
    nonGetRequests += 1
    response.writeHead(405).end()
    return
  }
  if (request.url === '/api/health') {
    healthRequests += 1
    const status = healthStatuses.shift() ?? healthStatus
    response.writeHead(status, { 'Content-Type': healthHtml ? 'text/html' : 'application/json' })
    response.end(healthHtml ? '<html>fixture-private-response-detail</html>' : JSON.stringify({
      ok: status === 200,
      ...(status === 502 ? { error: 'public-assistant-upstream-unreachable', detail: 'fixture-private-response-detail' } : {}),
    }))
  } else if (request.url === '/sitemap.xml') {
    response.writeHead(200, { 'Content-Type': 'application/xml' }).end(sitemap)
  } else if (request.url === '/robots.txt') {
    response.writeHead(200, { 'Content-Type': 'text/plain' }).end('User-agent: *\nSitemap: https://example.test/sitemap.xml\n')
  } else {
    response.writeHead(200, { 'Content-Type': 'text/html' }).end('<title>Fixture</title><meta name="description" content="Fixture">')
  }
})

async function snapshotHashes() {
  return Object.fromEntries(await Promise.all((await readdir(statusRoot)).filter((name) => name.endsWith('.json')).map(async (name) => [
    name, createHash('sha256').update(await readFile(new URL(name, statusRoot))).digest('hex'),
  ])))
}

async function runSuite(base, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/check-reliability-suite.mjs', '--strict', '--json', '--skip', options.skip ?? skip, ...(options.args ?? [])], {
      cwd: repoRoot,
      env: {
        ...process.env,
        NODE_OPTIONS: '',
        ERP_SYNTHETIC_API_BASE_URL: '',
        XUNQIU_SYNTHETIC_API_BASE_URL: '',
        LEGAL_RAG_API_BASE_URL: '',
        MAIN_SITE_SYNTHETIC_BASE_URL: base,
        MAIN_SITE_SYNTHETIC_ASSISTANT_CHAT: 'false',
        MAIN_SITE_SYNTHETIC_SKIP_ASSISTANT_API: 'false',
        MAIN_SITE_SYNTHETIC_HEALTH_MAX_ATTEMPTS: '5',
        MAIN_SITE_SYNTHETIC_HEALTH_RETRY_DELAY_MS: '0',
        ...options.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.once('error', reject)
    child.once('close', (code) => resolve({ code, stdout, stderr }))
  }).then((result) => {
    const report = JSON.parse(result.stdout)
    assert.equal(report.summary.total, 9)
    assert.equal(report.summary.passed + report.summary.failed + report.summary.skipped, 9)
    assert.equal(Object.values(report.summary.coverage).reduce((sum, value) => sum + value, 0), 9)
    for (const step of report.steps) {
      assert.ok(['current', 'previous', 'none'].includes(step.evidenceSource))
      if (step.coverage) {
        assert.equal(Object.entries(step.coverage).filter(([key]) => key !== 'total').reduce((sum, [, value]) => sum + value, 0), step.coverage.total)
        assert.equal(step.evidenceSource, 'current')
      }
    }
    return result
  })
}

// Inject only the child report boundary; the real suite still spawns commands,
// removes seeded history, parses the output and computes strict exit codes.
async function runProjectionFixture(base, id, payload, { raw, exitCode = 0, timeout = false } = {}) {
  const script = { 'main-site': 'check-main-site-synthetic.mjs', erp: 'check-erp-synthetic.mjs', 'site-status': 'generate-site-status.ts', 'site-monitor': 'check-site-monitor.ts' }[id]
  const source = `
    import { writeFileSync } from 'node:fs';
    globalThis.fetch = () => { throw new Error('fixture network blocked'); };
    if (process.argv.some(arg => arg.replaceAll('\\\\', '/').endsWith('/${script}'))) {
      const content = ${JSON.stringify(raw ?? JSON.stringify(payload))};
      const index = process.argv.indexOf('--write-status');
      if (index >= 0) writeFileSync(process.argv[index + 1], content);
      else console.log(content);
      ${timeout ? 'setTimeout(() => process.exit(1), 5000);' : `process.exit(${exitCode});`}
    }
  `
  const result = await runSuite(base, {
    skip: ['main-site', 'public-links', 'legal-rag', 'erp', 'xunqiu', 'pet', 'playlab', 'site-status', 'site-monitor'].filter((item) => item !== id).join(','),
    env: { NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(source)}` },
    args: timeout ? ['--timeout', '200', '--step-timeout', '1600'] : [],
  })
  return { ...result, step: JSON.parse(result.stdout).steps.find((step) => step.id === id) }
}

const before = await snapshotHashes()
const diagnosticsRoot = await mkdtemp(join(tmpdir(), 'biau-reliability-contract-'))
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
try {
  const base = `http://127.0.0.1:${server.address().port}`
  const unconfigured = await runSuite(base, {
    skip: 'main-site,public-links,legal-rag,pet,playlab,site-status,site-monitor',
  })
  assert.equal(unconfigured.code, 0, unconfigured.stderr)
  const unconfiguredReport = JSON.parse(unconfigured.stdout)
  assert.equal(unconfiguredReport.summary.passed, 0, 'unchecked checks must not count as passed steps')
  assert.equal(unconfiguredReport.summary.skipped, 9)
  for (const id of ['erp', 'xunqiu']) {
    const step = unconfiguredReport.steps.find((item) => item.id === id)
    assert.equal(step.status, 'skipped')
    assert.equal(step.skipReason, 'no-checks-run')
    assert.equal(step.coverageStatus, 'none')
    assert.equal(step.evidenceSource, 'current')
    assert.deepEqual(step.coverage, { total: 3, online: 0, degraded: 0, offline: 0, unchecked: 3, planned: 0 })
  }
  assert.deepEqual(await snapshotHashes(), before)
  for (const [statuses, expectedStatus, coverageStatus] of [
    [['online', 'degraded'], 'passed', 'complete'],
    [['online', 'unchecked', 'planned'], 'passed', 'partial'],
    [['unchecked', 'planned'], 'skipped', 'none'],
    [['offline', 'unchecked'], 'failed', 'partial'],
  ]) {
    const result = await runProjectionFixture(base, 'erp', { ok: true, checks: statuses.map((status) => ({ status })) })
    assert.equal(result.code, expectedStatus === 'failed' ? 1 : 0, result.stderr)
    assert.equal(result.step.status, expectedStatus)
    assert.equal(result.step.coverageStatus, coverageStatus)
    assert.equal(result.step.evidenceSource, 'current')
  }
  for (const payload of [null, {}, { ok: true }, { ok: true, checks: [] }, { ok: 'true', checks: [{ status: 'online' }] }, { checks: [{ status: 'online' }] }, { ok: true, checks: [{ status: 'mystery' }] }, { ok: true, checks: [{ status: 'total' }] }]) {
    const result = await runProjectionFixture(base, 'erp', payload)
    assert.equal(result.code, 1)
    assert.equal(result.step.status, 'failed')
    assert.equal(result.step.coverageStatus, 'unknown')
    assert.equal(result.step.coverage, null)
  }
  const malformed = await runProjectionFixture(base, 'erp', null, { raw: '{broken' })
  assert.equal(malformed.code, 1)
  assert.equal(malformed.step.coverageStatus, 'unknown')
  for (const [ok, exitCode] of [[false, 0], [true, 7]]) {
    const result = await runProjectionFixture(base, 'erp', { ok, checks: [{ status: 'unchecked' }] }, { exitCode })
    assert.equal(result.code, 1)
    assert.equal(result.step.status, 'failed', 'process/report failure must win over zero coverage')
    assert.equal(result.step.coverageStatus, 'none')
  }
  const timedOut = await runProjectionFixture(base, 'erp', { ok: true, checks: [{ status: 'unchecked' }] }, { timeout: true })
  assert.equal(timedOut.code, 1)
  assert.equal(timedOut.step.status, 'failed')
  assert.ok(timedOut.step.issues.some((issue) => issue.includes('timed out')))
  const targets = await runProjectionFixture(base, 'site-status', {
    ok: true,
    targets: [{ status: 'online' }],
    summary: { online: 200, offline: 100 },
    reliabilityProjects: [{ checks: [{ status: 'offline' }] }],
  })
  assert.equal(targets.code, 0)
  assert.equal(targets.step.coverage.total, 1, 'only current targets count, not historic merged projects or supplied totals')
  assert.equal(targets.step.coverage.offline, 0)
  for (const [checks, code, coverageStatus] of [
    [[{ ok: true }], 0, 'complete'],
    [[{ ok: false }], 1, 'complete'],
    [[{ ok: 'true' }], 1, 'unknown'],
    [[{}], 1, 'unknown'],
    [[], 1, 'unknown'],
  ]) {
    const result = await runProjectionFixture(base, 'site-monitor', { ok: true, checks })
    assert.equal(result.code, code)
    assert.equal(result.step.coverageStatus, coverageStatus)
  }
  const missingEnv = await runSuite(base, { skip: 'main-site,public-links,erp,xunqiu,pet,playlab,site-status,site-monitor' })
  const legalSkip = JSON.parse(missingEnv.stdout).steps.find((step) => step.id === 'legal-rag')
  assert.equal(legalSkip.skipReason, 'missing-env')
  assert.equal(legalSkip.evidenceSource, 'previous')
  assert.equal(legalSkip.coverage, null)
  assert.equal(legalSkip.coverageStatus, 'none')
  assert.match(legalSkip.summary, /preserved/)
  const noHistorySource = `
    import fs from 'node:fs/promises';
    import { syncBuiltinESMExports } from 'node:module';
    const readFile = fs.readFile;
    fs.readFile = (path, ...args) => String(path).replaceAll('\\\\', '/').endsWith('/legal-rag-synthetic.json')
      ? Promise.reject(Object.assign(new Error('fixture missing'), { code: 'ENOENT' })) : readFile(path, ...args);
    syncBuiltinESMExports();
  `
  const noHistory = await runSuite(base, {
    skip: 'main-site,public-links,erp,xunqiu,pet,playlab,site-status,site-monitor',
    env: { NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(noHistorySource)}` },
  })
  const noHistoryLegal = JSON.parse(noHistory.stdout).steps.find((step) => step.id === 'legal-rag')
  assert.equal(noHistoryLegal.evidenceSource, 'none')
  assert.equal(noHistoryLegal.skipReason, 'missing-env')
  assert.equal(noHistoryLegal.coverage, null)
  for (const status of [200, 503]) {
    healthStatus = status
    const startedAt = Date.now()
    const result = await runSuite(base)
    assert.equal(result.code, status === 200 ? 0 : 1, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.ok(Date.parse(report.checkedAt) >= startedAt)
    assert.equal(report.ok, status === 200)
    assert.equal(report.summary.failed, status === 200 ? 0 : 1)
    const main = report.steps.find((step) => step.id === 'main-site')
    assert.equal(main.status, status === 200 ? 'passed' : 'failed')
    assert.equal(main.healthAttempts?.length, status === 200 ? 1 : 5, 'current health attempts must survive suite aggregation')
    for (const [index, attempt] of main.healthAttempts.entries()) {
      assert.equal(attempt.attempt, index + 1)
      assert.equal(attempt.httpStatus, status)
      assert.equal(attempt.failureKind, status === 200 ? 'none' : 'http_status')
      assert.equal(attempt.responseType, 'json')
      assert.equal(attempt.proxyError, null)
      assert.equal(Number.isSafeInteger(attempt.durationMs), true)
      assert.deepEqual(Object.keys(attempt).sort(), ['attempt', 'durationMs', 'failureKind', 'httpStatus', 'proxyError', 'responseType'])
    }
    if (status === 503) assert.ok(main.issues.includes('assistant health returned HTTP 503'))
    assert.equal(report.summary.skipped, 8)
    assert.ok(!result.stdout.includes(base))
    assert.ok(!result.stdout.includes(repoRoot))
    assert.deepEqual(await snapshotHashes(), before)
  }
  healthStatuses = [503, 502, 200]
  const recovered = await runSuite(base)
  assert.equal(recovered.code, 0, recovered.stderr)
  const recoveredMain = JSON.parse(recovered.stdout).steps.find((step) => step.id === 'main-site')
  assert.equal(recoveredMain.status, 'passed')
  assert.match(recoveredMain.summary, /degraded=1/)
  assert.ok(recoveredMain.issues.some((issue) => issue.includes('recovered after 3 attempts') && issue.includes('503')))
  assert.deepEqual(recoveredMain.healthAttempts.map((attempt) => attempt.httpStatus), [503, 502, 200])
  assert.deepEqual(recoveredMain.healthAttempts.map((attempt) => attempt.proxyError), [null, 'public-assistant-upstream-unreachable', null])
  assert.deepEqual(recoveredMain.healthAttempts.map((attempt) => attempt.failureKind), ['http_status', 'http_status', 'none'])
  assert.doesNotMatch(recovered.stdout, /fixture-private-response-detail/)
  healthStatus = 502
  healthHtml = true
  const htmlFailure = await runSuite(base)
  assert.equal(htmlFailure.code, 1)
  const htmlAttempts = JSON.parse(htmlFailure.stdout).steps.find((step) => step.id === 'main-site').healthAttempts
  assert.equal(htmlAttempts.length, 5)
  assert.ok(htmlAttempts.every((attempt) => attempt.httpStatus === 502 && attempt.responseType === 'html' && attempt.failureKind === 'http_status' && attempt.proxyError === null))
  assert.doesNotMatch(htmlFailure.stdout, /fixture-private-response-detail/)
  healthHtml = false
  assert.deepEqual(await snapshotHashes(), before)
  const crashed = await runSuite('http://[')
  assert.equal(crashed.code, 1)
  const crashedReport = JSON.parse(crashed.stdout)
  const crashedMain = crashedReport.steps.find((step) => step.id === 'main-site')
  assert.equal(crashedMain.status, 'failed')
  assert.ok(crashedMain.issues.includes('expected report was not readable'))
  assert.equal(Object.hasOwn(crashedMain, 'healthAttempts'), false)
  assert.deepEqual(await snapshotHashes(), before)
  assert.equal(healthRequests, 14)
  assert.equal(nonGetRequests, 0)
  for (const attempts of [undefined, [{ attempt: 1, httpStatus: 200, durationMs: 1, issues: ['legacy-private-detail'] }]]) {
    const legacy = await runProjectionFixture(base, 'main-site', { ok: true, checks: [{ id: 'blog-semi-public-assistant', status: 'unchecked', healthAttempts: attempts }] })
    assert.equal(legacy.code, 0)
    assert.equal(legacy.step.coverageStatus, 'none', 'diagnostics must not upgrade chat coverage')
    if (attempts) {
      assert.deepEqual(legacy.step.healthAttempts, [{ attempt: 1, httpStatus: 200, durationMs: 1, failureKind: null, responseType: null, proxyError: null }])
    } else assert.equal(Object.hasOwn(legacy.step, 'healthAttempts'), false)
    assert.doesNotMatch(legacy.stdout, /legacy-private-detail/)
  }
  const unsafeAttempts = Array.from({ length: 6 }, (_, index) => ({
    attempt: index + 1, httpStatus: 502, durationMs: 1,
    failureKind: 'fixture-private-category', responseType: 'fixture-private-header', proxyError: 'fixture-private-error',
    issues: ['fixture-private-issue'], body: 'fixture-private-body', url: 'https://fixture-private.invalid',
  }))
  const unsafe = await runProjectionFixture(base, 'main-site', {
    ok: false,
    checks: [{ id: 'blog-semi-public-assistant', status: 'offline', healthAttempts: unsafeAttempts }],
  })
  assert.equal(unsafe.code, 1)
  assert.equal(unsafe.step.healthAttempts.length, 5)
  assert.ok(unsafe.step.healthAttempts.every((attempt) => attempt.failureKind === null && attempt.responseType === null && attempt.proxyError === null))
  assert.doesNotMatch(unsafe.stdout, /fixture-private/)
  const malformedAttempts = await runProjectionFixture(base, 'main-site', {
    ok: false,
    checks: [{ id: 'blog-semi-public-assistant', status: 'offline', healthAttempts: [null, {}, { attempt: 1, httpStatus: '502', durationMs: 1 }, { attempt: 2, httpStatus: 502, durationMs: -1 }, { attempt: 6, httpStatus: 502, durationMs: 1 }] }],
  })
  assert.equal(malformedAttempts.code, 1)
  assert.equal(Object.hasOwn(malformedAttempts.step, 'healthAttempts'), false)
  // Run the real suite and link CLI against a loopback server. No public target
  // is contacted; the import is inherited by the npm/tsx child processes.
  const fixtureImport = `const originalFetch = globalThis.fetch; globalThis.fetch = (_url, init) => originalFetch(${JSON.stringify(`${base}/link-fixture`)}, init);`
  const nodeOptions = `--import=data:text/javascript,${encodeURIComponent(fixtureImport)}`
  for (const status of [200, 404]) {
    linkStatus = status
    const checked = await runSuite(base, {
      skip: 'main-site,legal-rag,erp,xunqiu,pet,playlab,site-status,site-monitor',
      args: ['--diagnostics-dir', diagnosticsRoot],
      env: { NODE_OPTIONS: nodeOptions, PUBLIC_LINKS_MAX: '2' },
    })
    assert.equal(checked.code, status === 200 ? 0 : 1, checked.stderr)
    const report = JSON.parse(checked.stdout)
    assert.equal(report.steps.find((step) => step.id === 'public-links').status, status === 200 ? 'passed' : 'failed')
    const diagnostics = JSON.parse(await readFile(join(diagnosticsRoot, 'public-links.json'), 'utf8'))
    assert.equal(diagnostics.complete, true)
    assert.equal(diagnostics.checkedCount, 2)
    assert.equal(diagnostics.failedCount, status === 200 ? 0 : 2)
    for (const raw of [checked.stdout, JSON.stringify(diagnostics)]) {
      assert.equal(raw.includes(base), false)
      assert.equal(raw.includes(diagnosticsRoot), false)
      assert.equal(raw.includes('https://'), false)
    }
    assert.deepEqual(await snapshotHashes(), before)
  }
  await writeFile(join(diagnosticsRoot, 'public-links.json'), '{"stale":true}')
  const skipped = await runSuite(base, { skip: `main-site,${skip}`, args: ['--diagnostics-dir', diagnosticsRoot] })
  assert.equal(skipped.code, 0)
  const skippedReport = JSON.parse(skipped.stdout)
  assert.deepEqual(skippedReport.summary.coverage, { complete: 0, partial: 0, none: 9, unknown: 0 })
  for (const step of skippedReport.steps) {
    assert.equal(step.skipReason, 'requested')
    assert.equal(step.coverage, null)
    assert.equal(Object.hasOwn(step, 'healthAttempts'), false, 'skipped steps cannot project historic attempts as current evidence')
  }
  assert.equal(skippedReport.steps.find((step) => step.id === 'main-site').evidenceSource, 'previous')
  assert.equal(skippedReport.steps.find((step) => step.id === 'site-monitor').evidenceSource, 'none')
  assert.deepEqual(await readdir(diagnosticsRoot), [], 'skipped link checks must not upload a stale artifact')
  assert.deepEqual(await snapshotHashes(), before)
  console.log('Reliability report checks passed: safe health attempts/recovery, coverage, skipped/history semantics, corrupt reports, strict failure precedence, unchanged public snapshots, zero model calls.')
} finally {
  server.closeAllConnections()
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await rm(diagnosticsRoot, { recursive: true })
}
