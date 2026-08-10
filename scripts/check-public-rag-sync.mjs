import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { PublicRagSyncError, readPublicKnowledgeChecksum, syncPublicRagAfterDeployment } from './sync-public-rag.mjs'

const commit = 'a'.repeat(40)
const checksum = 'b'.repeat(64)
const requests = []
let healthAttempt = 0
let sleepCount = 0

const result = await syncPublicRagAfterDeployment({
  baseUrl: 'https://rag.example.com/',
  token: 'fixture-sync-token',
  expectedCommit: commit,
  expectedChecksum: checksum,
  maxAttempts: 4,
  pollIntervalMs: 100,
  sleep: async () => { sleepCount += 1 },
  fetcher: async (url, init = {}) => {
    requests.push({ url: String(url), init })
    if (String(url).endsWith('/health')) {
      healthAttempt += 1
      const payload = healthAttempt === 1
        ? { ok: true, buildCommit: 'old-commit', publicSourceChecksum: checksum }
        : healthAttempt === 2
          ? { ok: true, buildCommit: commit, publicSourceChecksum: 'c'.repeat(64) }
          : { ok: true, buildCommit: commit, publicSourceChecksum: checksum }
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({
      ok: true,
      accepted: true,
      scope: 'public',
      diagnostics: { sourceChecksum: checksum, documentCount: 27, chunkCount: 56 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  },
})

if (result.accepted !== true || sleepCount !== 2) throw new Error('sync runner did not wait for the matching deployment')
const syncRequest = requests.at(-1)
if (syncRequest?.url !== 'https://rag.example.com/v1/sync/public') throw new Error('sync runner used the wrong endpoint')
if (syncRequest.init?.headers?.Authorization !== 'Bearer fixture-sync-token') throw new Error('sync runner omitted its server-only token')
if (syncRequest.init?.body !== '{}') throw new Error('public sync must not upload client documents')

let rejected = false
try {
  await syncPublicRagAfterDeployment({
    baseUrl: 'https://rag.example.com',
    token: 'fixture-sync-token',
    expectedCommit: commit,
    expectedChecksum: checksum,
    maxAttempts: 1,
    fetcher: async () => new Response(JSON.stringify({ ok: true, buildCommit: 'old', publicSourceChecksum: checksum }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  })
} catch (error) {
  rejected = error instanceof Error && error.message === 'public-rag-deployment-not-ready'
}
if (!rejected) throw new Error('sync runner must fail when the deployed revision never matches')

let syncFailure = null
try {
  await syncPublicRagAfterDeployment({
    baseUrl: 'https://rag.example.com',
    token: 'fixture-sync-token',
    expectedCommit: commit,
    expectedChecksum: checksum,
    maxAttempts: 1,
    fetcher: async (url) => new Response(JSON.stringify(String(url).endsWith('/health')
      ? { ok: true, buildCommit: commit, publicSourceChecksum: checksum }
      : {
          ok: true,
          accepted: false,
          diagnostics: {
            reason: 'embedding_dimension_mismatch',
            providerStep: 'embedding',
            errorKind: 'dimension_mismatch',
            expectedDimension: 4096,
            actualDimension: 3072,
            documentCount: 27,
            chunkCount: 56,
            endpoint: 'https://private.example.com/v1',
            token: 'must-not-escape',
            rawResponse: 'must-not-escape',
          },
        }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  })
} catch (error) {
  syncFailure = error
}
if (!(syncFailure instanceof PublicRagSyncError)) throw new Error('sync rejection must preserve its bounded diagnostic type')
const syncFailureProjection = JSON.stringify(syncFailure.diagnostics)
for (const expected of ['embedding_dimension_mismatch', 'embedding', 'dimension_mismatch', '4096', '3072']) {
  if (!syncFailureProjection.includes(expected)) throw new Error(`sync rejection omitted bounded diagnostic: ${expected}`)
}
for (const forbidden of ['private.example.com', 'must-not-escape', 'endpoint', 'token', 'rawResponse']) {
  if (syncFailureProjection.includes(forbidden)) throw new Error(`sync rejection leaked forbidden diagnostic: ${forbidden}`)
}

const raw = await readFile(new URL('../server/data/public-knowledge-v2.json', import.meta.url), 'utf8')
const expectedFileChecksum = createHash('sha256').update(JSON.stringify(JSON.parse(raw))).digest('hex')
if (await readPublicKnowledgeChecksum() !== expectedFileChecksum) throw new Error('knowledge checksum calculation drifted')

console.log('Public RAG deployment-gated sync contracts passed.')
