import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../', import.meta.url))
const statusRoot = new URL('../public/status/', import.meta.url)
const sitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
const skip = 'public-links,legal-rag,erp,xunqiu,pet,playlab,site-status,site-monitor'
let healthStatus = 200
let healthStatuses = []
let nonGetRequests = 0
let healthRequests = 0
const server = createServer((request, response) => {
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

async function runSuite(base) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/check-reliability-suite.mjs', '--strict', '--json', '--skip', skip], {
      cwd: repoRoot,
      env: {
        ...process.env,
        MAIN_SITE_SYNTHETIC_BASE_URL: base,
        MAIN_SITE_SYNTHETIC_ASSISTANT_CHAT: 'false',
        MAIN_SITE_SYNTHETIC_SKIP_ASSISTANT_API: 'false',
        MAIN_SITE_SYNTHETIC_HEALTH_MAX_ATTEMPTS: '5',
        MAIN_SITE_SYNTHETIC_HEALTH_RETRY_DELAY_MS: '0',
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
  console.log('Reliability report checks passed: current success/failure JSON, strict exit codes, unchanged public snapshots, zero model calls.')
} finally {
  server.closeAllConnections()
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}
