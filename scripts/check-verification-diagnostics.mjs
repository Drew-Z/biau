import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import {
  buildPublicFailureSummary,
  classifyHttpResult,
  classifyNetworkFailure,
  normalizePublicIssueKinds,
  shouldRetryNetworkResult,
} from './lib/network-diagnostics.mjs'
import { reliabilityTempPrefix, resolveStatusOutput, writeJsonAtomically } from './lib/status-output.mjs'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const repoRoot = resolve(import.meta.dirname, '..')
const statusWriterScripts = [
  'check-main-site-synthetic.mjs',
  'check-legal-rag-synthetic.mjs',
  'check-erp-synthetic.mjs',
  'check-xunqiu-synthetic.mjs',
  'check-pet-showcase-synthetic.mjs',
  'check-playlab-synthetic.mjs',
  'check-public-links.ts',
  'generate-site-status.ts',
  'check-reliability-suite.mjs',
]

for (const scriptName of statusWriterScripts) {
  const source = await readFile(join(repoRoot, 'scripts', scriptName), 'utf8')
  assert.match(source, /resolveStatusOutput/u, `${scriptName} must use the shared explicit-write contract`)
  assert.match(source, /writeJsonAtomically/u, `${scriptName} must use atomic JSON output`)
  assert.doesNotMatch(source, /writeFile\s*\(\s*outputPath/u, `${scriptName} retained an implicit output write`)
}

const nested = (code) => ({ message: 'fetch failed', cause: { code } })
assert.equal(classifyNetworkFailure({ name: 'AbortError' }), 'timeout')
assert.equal(classifyNetworkFailure(nested('UND_ERR_CONNECT_TIMEOUT')), 'timeout')
assert.equal(classifyNetworkFailure(nested('ENOTFOUND')), 'dns_error')
assert.equal(classifyNetworkFailure({ cause: { cause: { code: 'SELF_SIGNED_CERT_IN_CHAIN' } } }), 'tls_error')
assert.equal(classifyNetworkFailure(nested('ECONNREFUSED')), 'connection_error')
assert.equal(classifyNetworkFailure(new Error('opaque fetch failure')), 'network_error')

for (const status of [200, 204, 301, 399]) assert.deepEqual(classifyHttpResult(status), { ok: true, issueKind: '' })
for (const status of [0, 403, 404, 500]) assert.deepEqual(classifyHttpResult(status), { ok: false, issueKind: 'http_status' })
assert.equal(shouldRetryNetworkResult(403, 'http_status'), false)
assert.equal(shouldRetryNetworkResult(404, 'http_status'), false)
assert.equal(shouldRetryNetworkResult(429, 'http_status'), false)
assert.equal(shouldRetryNetworkResult(500, 'http_status'), true)
assert.equal(shouldRetryNetworkResult(0, 'dns_error'), true)
assert.equal(shouldRetryNetworkResult(0, 'tls_error'), false)

const issueKinds = normalizePublicIssueKinds(['tls_error', 'dns_error', 'tls_error', 'not_allowed'])
assert.deepEqual(issueKinds, ['dns_error', 'tls_error'])
const publicSummary = buildPublicFailureSummary(2, issueKinds, 'npm.cmd run public-links:check')
assert.equal(
  publicSummary,
  '2 public project links failed; issue classes: dns_error, tls_error. Run npm.cmd run public-links:check for details.',
)
for (const forbidden of ['https://', 'certificate', 'cause', 'fetch failed', repoRoot]) {
  assert.equal(publicSummary.includes(forbidden), false, `public summary leaked ${forbidden}`)
}

const disabled = resolveStatusOutput([], {
  repoRoot,
  defaultRelativePath: 'public/status/verification-fixture.json',
})
assert.equal(disabled.enabled, false)

const defaultOutput = resolveStatusOutput(['--write-status'], {
  repoRoot,
  defaultRelativePath: 'public/status/verification-fixture.json',
})
assert.equal(defaultOutput.filePath, resolve(repoRoot, 'public/status/verification-fixture.json'))

assert.throws(
  () =>
    resolveStatusOutput(['--write-status', '../outside.json'], {
      repoRoot,
      defaultRelativePath: 'public/status/verification-fixture.json',
    }),
  /must stay inside/u,
)
assert.throws(
  () =>
    resolveStatusOutput(['--write-status', 'public/status/a.json', '--write-status=public/status/b.json'], {
      repoRoot,
      defaultRelativePath: 'public/status/verification-fixture.json',
    }),
  /duplicate/u,
)

const temporaryRoot = await mkdtemp(join(tmpdir(), reliabilityTempPrefix()))
try {
  const temporaryOutput = resolveStatusOutput(['--write-status', join(temporaryRoot, 'fixture.json')], {
    repoRoot,
    defaultRelativePath: 'public/status/verification-fixture.json',
    allowReliabilityTemp: true,
  })
  await writeJsonAtomically(temporaryOutput.filePath, { ok: true, issueKind: 'dns_error' })
  assert.deepEqual(JSON.parse(await readFile(temporaryOutput.filePath, 'utf8')), { ok: true, issueKind: 'dns_error' })
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}

let routeHandler = null
const fakePage = {
  async route(_pattern, handler) {
    routeHandler = handler
  },
}
const blocked = []
await installLocalNetworkGuard(fakePage, 'http://127.0.0.1:5174', (event) => blocked.push(event))
assert.equal(typeof routeHandler, 'function')

async function runGuardFixture(url, resourceType = 'fetch') {
  const result = { fallback: 0, abort: [] }
  await routeHandler({
    request: () => ({ url: () => url, resourceType: () => resourceType }),
    fallback: async () => {
      result.fallback += 1
    },
    abort: async (reason) => {
      result.abort.push(reason)
    },
  })
  return result
}

assert.deepEqual(await runGuardFixture('http://127.0.0.1:5174/assets/app.js', 'script'), { fallback: 1, abort: [] })
assert.deepEqual(await runGuardFixture('data:text/plain,fixture'), { fallback: 1, abort: [] })
assert.deepEqual(await runGuardFixture('https://external.example.invalid/provider', 'fetch'), {
  fallback: 0,
  abort: ['blockedbyclient'],
})
assert.deepEqual(blocked, [{ resourceType: 'fetch' }])

console.log('Verification diagnostics contract passed without network access')
