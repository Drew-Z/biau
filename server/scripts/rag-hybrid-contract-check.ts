import assert from 'node:assert/strict'
import { fusePostgresRagCandidates, type PostgresRagCandidateRow } from '../src/ragPostgresStore.js'
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

const postgresRow = (
  chunkId: string,
  documentId: string,
  score: number,
  reason: string,
  title: string,
  text: string,
): PostgresRagCandidateRow => ({
  chunk_id: chunkId,
  document_id: documentId,
  section: 'summary',
  text,
  score,
  reason,
  title,
  summary: text,
  href: '/',
  tags: [],
  visibility: 'public',
})

const beaconChunk = postgresRow(
  'chunk:site:public-assistant:1',
  'site:public-assistant',
  1,
  'keyword+metadata',
  '知航 BIAU Beacon｜公开研究助手',
  '知航 BIAU Beacon 使用 Agentic RAG、LangGraph、混合检索和引用校验。',
)
const genericRagChunk = postgresRow(
  'chunk:blog:agentic-rag-frontier-2026:1',
  'blog:agentic-rag-frontier-2026',
  1,
  'keyword+metadata',
  'Agentic RAG 知识地图',
  '通用 Agentic RAG、混合检索与 GraphRAG 架构文章。',
)
const postgresFused = fusePostgresRagCandidates({
  keywordRows: [genericRagChunk, beaconChunk],
  vectorRows: [
    { ...genericRagChunk, score: 0.92, reason: 'vector+pgvector' },
    { ...beaconChunk, score: 0.78, reason: 'vector+pgvector' },
  ],
  entityRows: [{ ...beaconChunk, score: 0.64, reason: 'entity+relation' }],
  localChunks: [
    { id: beaconChunk.chunk_id, score: 1 },
    { id: genericRagChunk.chunk_id, score: 0.55 },
  ],
})
assert.equal(postgresFused[0]?.documentId, 'site:public-assistant')
assert.match(postgresFused[0]?.reason ?? '', /keyword\+metadata\+vector\+pgvector\+entity\+relation\+local-semantic-prior/u)

console.log('RAG hybrid contract passed')
