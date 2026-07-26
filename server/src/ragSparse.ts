import { createHash } from 'node:crypto'

export interface RagSparseVector {
  indices: number[]
  values: number[]
}

export interface RagSparseCorpus {
  documentCount: number
  documentFrequency: Map<number, number>
}

export function buildRagSparseCorpus(texts: string[]): RagSparseCorpus {
  const documentFrequency = new Map<number, number>()
  for (const text of texts) {
    const indices = new Set(tokenizeSparse(text).map(tokenIndex))
    for (const index of indices) documentFrequency.set(index, (documentFrequency.get(index) ?? 0) + 1)
  }
  return { documentCount: Math.max(1, texts.length), documentFrequency }
}

export function buildRagSparseVector(text: string, corpus: RagSparseCorpus): RagSparseVector {
  const frequencies = new Map<number, number>()
  for (const token of tokenizeSparse(text)) {
    const index = tokenIndex(token)
    frequencies.set(index, (frequencies.get(index) ?? 0) + 1)
  }
  const entries = [...frequencies.entries()].map(([index, frequency]) => {
    const documentFrequency = corpus.documentFrequency.get(index) ?? 0
    const idf = Math.log(1 + (corpus.documentCount - documentFrequency + 0.5) / (documentFrequency + 0.5))
    const termWeight = (frequency * 2.2) / (frequency + 1.2)
    return [index, Number((idf * termWeight).toFixed(6))] as const
  }).filter(([, value]) => value > 0).sort((a, b) => a[0] - b[0])
  return {
    indices: entries.map(([index]) => index),
    values: entries.map(([, value]) => value),
  }
}

export function buildPublicKnowledgeSparseCorpus(chunks: Array<{ section: string; text: string; metadata: { tags: string[] } }>) {
  return buildRagSparseCorpus(chunks.map((chunk) => [chunk.section, chunk.text, ...chunk.metadata.tags].join('\n')))
}

function tokenizeSparse(value: string) {
  const normalized = value.normalize('NFKC').toLowerCase()
  const ascii = normalized.match(/[a-z0-9][a-z0-9._+-]{1,48}/gu) ?? []
  const hanTokens: string[] = []
  for (const sequence of normalized.match(/[\p{Script=Han}]{2,}/gu) ?? []) {
    const chars = [...sequence]
    for (let index = 0; index < chars.length - 1; index += 1) hanTokens.push(chars.slice(index, index + 2).join(''))
    for (let index = 0; index < chars.length - 2; index += 1) hanTokens.push(chars.slice(index, index + 3).join(''))
  }
  return [...ascii, ...hanTokens].slice(0, 2_000)
}

function tokenIndex(token: string) {
  return createHash('sha256').update(token).digest().readUInt32BE(0) & 0x7fffffff
}
