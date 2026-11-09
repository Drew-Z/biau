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
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ ok: status === 200 }))
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
  })
}

const before = await snapshotHashes()
const diagnosticsRoot = await mkdtemp(join(tmpdir(), 'biau-reliability-contract-'))
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
try {
  const base = `http://127.0.0.1:${server.address().port}`
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
    if (status === 503) assert.ok(main.issues.includes('assistant health returned HTTP 503'))
    assert.equal(report.summary.skipped, 8)
    assert.ok(!result.stdout.includes(base))
    assert.ok(!result.stdout.includes(repoRoot))
    assert.deepEqual(await snapshotHashes(), before)
  }
  healthStatuses = [503, 200]
  const recovered = await runSuite(base)
  assert.equal(recovered.code, 0, recovered.stderr)
  const recoveredMain = JSON.parse(recovered.stdout).steps.find((step) => step.id === 'main-site')
  assert.equal(recoveredMain.status, 'passed')
  assert.match(recoveredMain.summary, /degraded=1/)
  assert.ok(recoveredMain.issues.some((issue) => issue.includes('recovered after 2 attempts') && issue.includes('503')))
  assert.deepEqual(await snapshotHashes(), before)
  const crashed = await runSuite('http://[')
  assert.equal(crashed.code, 1)
  const crashedReport = JSON.parse(crashed.stdout)
  const crashedMain = crashedReport.steps.find((step) => step.id === 'main-site')
  assert.equal(crashedMain.status, 'failed')
  assert.ok(crashedMain.issues.includes('expected report was not readable'))
  assert.deepEqual(await snapshotHashes(), before)
  assert.equal(healthRequests, 8)
  assert.equal(nonGetRequests, 0)
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
  assert.deepEqual(await readdir(diagnosticsRoot), [], 'skipped link checks must not upload a stale artifact')
  console.log('Reliability report checks passed: current success/failure JSON, strict exit codes, unchanged public snapshots, zero model calls.')
} finally {
  server.closeAllConnections()
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await rm(diagnosticsRoot, { recursive: true })
}
