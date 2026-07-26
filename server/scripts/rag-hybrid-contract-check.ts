import assert from 'node:assert/strict'
import { buildQdrantHybridCollectionConfig, buildQdrantHybridQueryPayload } from '../src/ragQdrantStore.js'
import { rerankRagCandidates } from '../src/ragReranker.js'
import { buildRagSparseCorpus, buildRagSparseVector } from '../src/ragSparse.js'

const corpus = buildRagSparseCorpus([
  'BIAU public assistant uses hybrid retrieval and citations',
  '公开助手使用混合检索与精确引用',
  'Hybrid retrieval combines dense vectors and lexical evidence',
])
const query = buildRagSparseVector('公开助手 hybrid retrieval', corpus)
const repeated = buildRagSparseVector('公开助手 hybrid retrieval', corpus)

assert(query.indices.length > 0)
assert.deepEqual(query, repeated)
assert.deepEqual([...query.indices].sort((a, b) => a - b), query.indices)
assert.equal(query.indices.length, query.values.length)
assert(query.values.every((value) => Number.isFinite(value) && value > 0))

const collection = buildQdrantHybridCollectionConfig(4096)
assert.deepEqual(Object.keys(collection.vectors), ['dense'])
assert.equal(collection.vectors.dense.size, 4096)
assert.deepEqual(Object.keys(collection.sparse_vectors), ['lexical'])

const request = buildQdrantHybridQueryPayload([0.1, 0.2], query, 12)
assert.equal(request.prefetch.length, 2)
assert.equal(request.prefetch[0].using, 'dense')
assert.equal(request.prefetch[1].using, 'lexical')
assert.deepEqual(request.query, { fusion: 'rrf' })
assert.equal(request.limit, 12)

const reranked = await rerankRagCandidates('hybrid retrieval citations', [
  { id: 'weak', text: 'unrelated project copy', score: 0.7 },
  { id: 'strong', text: 'hybrid retrieval with citations', score: 0.65 },
], { allowProvider: false })
assert.equal(reranked.mode, 'deterministic')
assert.equal(reranked.candidates[0].id, 'strong')

console.log('RAG hybrid contract passed')
