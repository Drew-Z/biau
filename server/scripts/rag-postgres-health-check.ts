import assert from 'node:assert/strict'
import { getPostgresRagHealth } from '../src/ragPostgresStore.js'

const checksum = 'a'.repeat(64)
const row = {
  document_count: '32', chunk_count: '75', entity_count: '176', relation_count: '253',
  embedded_chunk_count: '75', compatible_chunk_count: '75', last_sync_at: '2026-11-04T15:22:17Z',
  indexed_source_checksum: checksum,
  synced_document_count: '32', synced_chunk_count: '75', synced_entity_count: '176', synced_relation_count: '253',
}
const originalFetch = globalThis.fetch
let networkCalls = 0
globalThis.fetch = async () => { networkCalls += 1; throw new Error('network-forbidden') }
try {
  const complete = await getPostgresRagHealth(async () => ({ rows: [row] }))
  assert.equal(complete.indexedSourceChecksum, checksum)
  assert.equal(complete.vectorReady, true)
  assert.equal(complete.documentCount, 32)
  for (const override of [
    { embedded_chunk_count: '74' }, { compatible_chunk_count: '74' },
    { synced_document_count: '31' }, { synced_chunk_count: '74' },
    { synced_entity_count: '175' }, { synced_relation_count: '252' },
    { last_sync_at: null }, { indexed_source_checksum: null }, { indexed_source_checksum: 'not-a-checksum' },
    { synced_document_count: null }, { document_count: '0', synced_document_count: '0' },
  ]) {
    const incomplete = await getPostgresRagHealth(async () => ({ rows: [{ ...row, ...override }] }))
    assert.equal(incomplete.indexedSourceChecksum, null, JSON.stringify(override))
  }
  const unavailable = await getPostgresRagHealth(async () => { throw new Error('private-db-details') })
  assert.equal(unavailable.indexedSourceChecksum, null)
  assert.equal(unavailable.vectorReady, false)
  assert.doesNotMatch(JSON.stringify(unavailable), /private-db-details/)
  assert.equal(networkCalls, 0)
  console.log('Postgres RAG indexed checksum evidence contracts passed; network/model calls: 0.')
} finally {
  globalThis.fetch = originalFetch
}
