import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { parse } from 'yaml'
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

const indexedHealth = {
  ok: true, store: 'supabase-pgvector', buildCommit: 'older-identical-content', publicSourceChecksum: checksum,
  indexedSourceChecksum: checksum, vectorReady: true, keywordReady: true, documentCount: 32, chunkCount: 75,
}
async function checkIndexedCase({ health = indexedHealth, force = false, checkOnly = true, expectedError = null } = {}) {
  let posts = 0
  let result
  let error
  try {
    result = await syncPublicRagAfterDeployment({
      baseUrl: 'https://rag.example.com', token: 'fixture-sync-token', expectedCommit: commit, expectedChecksum: checksum,
      maxAttempts: 1, force, checkOnly,
      fetcher: async (_url, init = {}) => {
        if (init.method === 'POST') {
          posts += 1
          return Response.json({ accepted: true, scope: 'public', diagnostics: { sourceChecksum: checksum } })
        }
        return Response.json(health)
      },
    })
  } catch (caught) { error = caught }
  if (expectedError) {
    if (error?.message !== expectedError) throw new Error(`expected ${expectedError}; got ${error?.message}`)
  } else if (error) throw error
  return { posts, result }
}
const unchanged = await checkIndexedCase()
if (unchanged.posts !== 0 || unchanged.result.skipped !== true) throw new Error('same indexed content must skip all embedding writes')
for (const health of [
  { ...indexedHealth, indexedSourceChecksum: null },
  { ...indexedHealth, indexedSourceChecksum: 'd'.repeat(64) },
  { ...indexedHealth, publicSourceChecksum: 'd'.repeat(64) },
  { ...indexedHealth, vectorReady: false },
  { ...indexedHealth, store: 'local' },
]) {
  const failed = await checkIndexedCase({ health, expectedError: 'public-rag-deployment-not-ready' })
  if (failed.posts !== 0) throw new Error('unproven or stale index must not bypass the deployment gate')
}
const required = await checkIndexedCase({
  health: { ...indexedHealth, buildCommit: commit, indexedSourceChecksum: null }, expectedError: 'public-rag-sync-required',
})
if (required.posts !== 0) throw new Error('read-only mode must not embed a missing index')
const forcedStale = await checkIndexedCase({ force: true, expectedError: 'public-rag-deployment-not-ready' })
if (forcedStale.posts !== 0) throw new Error('forced sync must still reject a stale deployment')
const forced = await checkIndexedCase({ health: { ...indexedHealth, buildCommit: commit }, force: true, checkOnly: false })
if (forced.posts !== 1 || forced.result.skipped) throw new Error('approved force must rebuild even unchanged source')

const workflow = parse(await readFile(new URL('../.github/workflows/public-rag-sync.yml', import.meta.url), 'utf8'))
const blueprint = parse(await readFile(new URL('../render.yaml', import.meta.url), 'utf8'))
const ragService = blueprint.services.find((service) => service.name === 'biau-rag-orchestrator')
assert.equal(ragService.autoDeployTrigger, 'commit', 'checksPass would deadlock the sync workflow waiting for deployment')
assert.deepEqual([...ragService.buildFilter.paths].sort(), [...workflow.on.push.paths].sort(), 'deployment and sync trigger paths must match')
assert.equal(workflow.on.workflow_dispatch.inputs.check_only.default, true)
assert.equal(workflow.concurrency['cancel-in-progress'], false, 'an accepted sync must not be cancelled mid-transaction by another workflow')

console.log('Public RAG deployment-gated sync contracts passed.')
