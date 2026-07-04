import { publicKnowledgeV2 } from './knowledge.js'
import type { RagChunkCitation } from './types.js'

export interface RagEmbeddingProvider {
  kind: 'deterministic-local'
  dimensions: number
  embed(text: string): number[]
}

export interface RagVectorCandidate {
  chunkId: string
  documentId: string
  score: number
  reason: 'deterministic-vector'
}

export interface RagVectorStore {
  kind: 'local-public-knowledge'
  search(query: string, limit: number): RagVectorCandidate[]
}

const VECTOR_DIMENSIONS = 48

export function createDeterministicEmbeddingProvider(): RagEmbeddingProvider {
  return {
    kind: 'deterministic-local',
    dimensions: VECTOR_DIMENSIONS,
    embed: (text) => embedDeterministically(text, VECTOR_DIMENSIONS),
  }
}

export function createLocalVectorStore(embeddingProvider = createDeterministicEmbeddingProvider()): RagVectorStore {
  return {
    kind: 'local-public-knowledge',
    search: (query, limit) => searchLocalChunks(query, limit, embeddingProvider),
  }
}

export function rerankChunksWithVector(chunks: RagChunkCitation[], vectorCandidates: RagVectorCandidate[]): RagChunkCitation[] {
  const vectorScoreByChunk = new Map(vectorCandidates.map((candidate) => [candidate.chunkId, candidate.score]))
  return chunks
    .map((chunk) => {
      const vectorScore = vectorScoreByChunk.get(chunk.id)
      if (vectorScore === undefined) return chunk
      const score = Number(Math.min(1, chunk.score * 0.72 + vectorScore * 0.28).toFixed(3))
      return {
        ...chunk,
        score,
        reason: chunk.reason.includes('deterministic-vector') ? chunk.reason : `${chunk.reason}+deterministic-vector`,
      }
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, 'zh-CN'))
}

function searchLocalChunks(query: string, limit: number, embeddingProvider: RagEmbeddingProvider): RagVectorCandidate[] {
  if (!publicKnowledgeV2 || !query.trim()) return []
  const queryEmbedding = embeddingProvider.embed(query)
  return publicKnowledgeV2.knowledge_chunks
    .map((chunk) => {
      const text = [chunk.section, chunk.text, ...chunk.metadata.tags].join('\n')
      return {
        chunkId: chunk.id,
        documentId: chunk.documentId,
        score: cosineSimilarity(queryEmbedding, embeddingProvider.embed(text)),
        reason: 'deterministic-vector' as const,
      }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.chunkId.localeCompare(b.chunkId, 'zh-CN'))
    .slice(0, Math.max(1, Math.min(24, Math.trunc(limit))))
}

function embedDeterministically(text: string, dimensions: number) {
  const vector = Array.from({ length: dimensions }, () => 0)
  for (const token of tokenize(text)) {
    const hash = hashToken(token)
    const index = Math.abs(hash) % dimensions
    const sign = hash % 2 === 0 ? 1 : -1
    vector[index] += sign / Math.sqrt(Math.max(1, token.length))
  }
  return normalizeVector(vector)
}

function tokenize(text: string) {
  const normalized = text.trim().toLowerCase()
  const asciiTerms = normalized.match(/[a-z0-9+#.]+/g) ?? []
  const cjkTerms = Array.from(normalized.matchAll(/[\u4e00-\u9fff]/g)).map((match) => match[0])
  return [...asciiTerms, ...cjkTerms].filter(Boolean)
}

function hashToken(token: string) {
  let hash = 5381
  for (const char of token) hash = (hash * 33) ^ char.charCodeAt(0)
  return hash | 0
}

function normalizeVector(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (magnitude === 0) return vector
  return vector.map((value) => value / magnitude)
}

function cosineSimilarity(a: number[], b: number[]) {
  return Number(a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0).toFixed(6))
}
