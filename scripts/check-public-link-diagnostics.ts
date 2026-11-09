import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { buildLinkDiagnostics, checkTarget, checkTargets } from './check-public-links'
import { resolveDiagnosticsOutput } from './lib/status-output.mjs'

const repoRoot = resolve(import.meta.dirname, '..')
const temporaryRoot = await mkdtemp(join(tmpdir(), 'biau-link-contract-'))
const requests = new Map<string, string[]>()
let pendingReached: () => void = () => {}
let bodyClosed: () => void = () => {}
const server = createServer((request, response) => {
  const path = request.url ?? '/'
  const methods = requests.get(path) ?? []
  methods.push(request.method ?? '')
  requests.set(path, methods)
  if (path === '/pending') { pendingReached(); return }
  if (path === '/timeout') return
  if (path === '/reset' && methods.length === 1) { request.socket.destroy(); return }
  if (path === '/stream' && request.method === 'GET') {
    response.on('close', () => bodyClosed())
    response.writeHead(200, { 'Content-Type': 'text/plain' })
    response.flushHeaders()
    return // An endless body must not keep the HTTP reachability probe running.
  }
  const status = path === '/missing' ? 404
    : path === '/forbidden' ? 403
      : path === '/rate' ? 429
        : ['/fallback', '/fallback-recovered', '/stream'].includes(path) && request.method === 'HEAD' ? 405
          : path === '/not-implemented' && request.method === 'HEAD' ? 501
            : path === '/down' || (path === '/recovered' && methods.length === 1)
              || (path === '/fallback-recovered' && methods.length === 2) ? 503 : 200
  response.writeHead(status).end()
})

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
assert.ok(address && typeof address !== 'string')
const base = `http://127.0.0.1:${address.port}`
const target = (path: string) => ({ url: `${base}${path}`, contexts: ['blog-semi: project link / Fixture'] })
try {
  const results: Awaited<ReturnType<typeof checkTarget>>[] = []
  for (const path of ['/ok', '/fallback', '/not-implemented', '/recovered', '/fallback-recovered', '/missing', '/forbidden', '/rate', '/down', '/reset', '/timeout']) {
    results.push(await checkTarget(target(path), path === '/timeout' ? 40 : 2_000))
  }
  assert.deepEqual(results.map((result) => result.ok), [true, true, true, true, true, false, false, false, false, true, false])
  assert.deepEqual(results.map((result) => result.attempts.length), [1, 2, 2, 2, 3, 1, 1, 1, 2, 2, 2])
  assert.deepEqual(results[1].attempts.map(({ method, status }) => [method, status]), [['HEAD', 405], ['GET', 200]])
  assert.equal(results[1].fallbackUsed, true)
  assert.equal(results[1].recovered, false)
  assert.deepEqual(results[4].attempts.map(({ status }) => status), [405, 503, 200])
  for (const index of [3, 4, 9]) {
    const result = results[index]
    assert.equal(result.recovered, true)
    assert.ok(result.durationMs >= 700, 'wall time must include the 750 ms retry delay')
    assert.ok(result.durationMs >= result.attempts.reduce((total, attempt) => total + attempt.durationMs, 0))
  }
  assert.equal(results[9].attempts[0].issueKind, 'connection_error')
  assert.equal(results[10].issueKind, 'timeout')
  assert.deepEqual(requests.get('/fallback-recovered'), ['HEAD', 'GET', 'GET'])
  let tlsAttempts = 0
  const tls = await checkTarget(target('/tls'), 100, async () => {
    tlsAttempts += 1
    throw Object.assign(new Error('private TLS failure'), { cause: { code: 'CERT_HAS_EXPIRED' } })
  })
  assert.equal(tls.ok, false)
  assert.equal(tls.issueKind, 'tls_error')
  assert.equal(tlsAttempts, 1)

  const closed = new Promise<void>((resolve) => { bodyClosed = resolve })
  const stream = await checkTarget(target('/stream'), 200)
  assert.equal(stream.ok, true)
  const closedWithinBudget = await Promise.race([closed.then(() => true), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1_000))])
  assert.equal(closedWithinBudget, true, 'GET response body must be cancelled')

  const diagnosticsFile = resolveDiagnosticsOutput(['--diagnostics-file', join(temporaryRoot, 'partial.json')], { repoRoot })
  const pending = new Promise<void>((resolve) => { pendingReached = resolve })
  const running = checkTargets([target('/ok'), target('/pending')], 200, { diagnosticsFile })
  await pending
  const partial = JSON.parse(await readFile(diagnosticsFile, 'utf8'))
  assert.equal(partial.complete, false)
  assert.equal(partial.checkedCount, 1)
  assert.equal(partial.targetCount, 2)
  assert.equal(partial.results[0].ok, true)
  const finished = await running
  const complete = JSON.parse(await readFile(diagnosticsFile, 'utf8'))
  assert.equal(complete.complete, true)
  assert.equal(complete.checkedCount, 2)
  assert.equal(complete.failedCount, 1)
  assert.equal(finished[1].ok, false)

  // Diagnostic projection accepts only known project IDs and structured fields.
  results[0].contexts.push('home hero: blog-semi / label', 'https://private.invalid/path', 'C:\\private\\secret')
  results[0].issue = 'Bearer fixture-secret with https://private.invalid/path'
  const diagnostic = buildLinkDiagnostics(new Date().toISOString(), results.length, results)
  assert.equal(diagnostic.recoveredCount, 3)
  assert.equal(diagnostic.results[0].targetId, createHash('sha256').update(target('/ok').url).digest('hex'))
  assert.deepEqual(diagnostic.results[0].projectIds, ['blog-semi'])
  for (const forbidden of [base, 'https://', 'C:\\', 'Bearer', 'fixture-secret', 'private', 'contexts', 'finalUrl']) {
    assert.equal(JSON.stringify(diagnostic).includes(forbidden), false, `leaked ${forbidden}`)
  }
  assert.equal(resolveDiagnosticsOutput([], { repoRoot }), '')
  for (const argv of [
    ['--diagnostics-file'], ['--diagnostics-file', '--json'],
    ['--diagnostics-file', join(repoRoot, 'public/status/unsafe.json')],
    ['--diagnostics-file', join(temporaryRoot, 'unsafe.txt')],
    ['--diagnostics-file', diagnosticsFile, `--diagnostics-file=${diagnosticsFile}`],
  ]) assert.throws(() => resolveDiagnosticsOutput(argv, { repoRoot }))
  assert.equal(resolveDiagnosticsOutput(['--diagnostics-dir', temporaryRoot], { repoRoot, directory: true }), temporaryRoot)
  console.log('Public link diagnostics passed: bounded HTTP retries, recovery history, partial reports, safe artifact projection; zero model calls.')
} finally {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await rm(temporaryRoot, { recursive: true })
}
