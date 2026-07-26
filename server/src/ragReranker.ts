import { env } from './env.js'

export interface RagRerankCandidate {
  id: string
  text: string
  score: number
}

export interface RagRerankResult {
  candidates: RagRerankCandidate[]
  mode: 'provider' | 'deterministic'
}

export function isExternalRerankerConfigured() {
  return Boolean(env.rerankerBaseUrl && env.rerankerApiKey && env.rerankerModel)
}

export async function rerankRagCandidates(
  query: string,
  candidates: RagRerankCandidate[],
  options: { allowProvider?: boolean } = {},
): Promise<RagRerankResult> {
  const bounded = candidates.slice(0, 32)
  if (bounded.length < 2 || options.allowProvider === false || !isExternalRerankerConfigured()) {
    return { candidates: deterministicRerank(query, bounded), mode: 'deterministic' }
  }
  const provider = await providerRerank(query, bounded).catch(() => null)
  return provider ?? { candidates: deterministicRerank(query, bounded), mode: 'deterministic' }
}

async function providerRerank(query: string, candidates: RagRerankCandidate[]): Promise<RagRerankResult | null> {
  const endpoint = env.rerankerBaseUrl.endsWith('/rerank') ? env.rerankerBaseUrl : `${env.rerankerBaseUrl}/rerank`
  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), env.rerankerTimeoutMs)
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.rerankerApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.rerankerModel,
        query: query.slice(0, 1_000),
        documents: candidates.map((candidate) => candidate.text.slice(0, 4_000)),
        top_n: candidates.length,
      }),
      signal: abort.signal,
    })
    if (!response.ok) return null
    const payload = await response.json().catch(() => null)
    const results = readRerankerResults(payload)
    if (results.length === 0) return null
    const seen = new Set<number>()
    const ordered = results.map((result) => {
      const candidate = candidates[result.index]
      if (!candidate || seen.has(result.index)) return null
      seen.add(result.index)
      return { ...candidate, score: normalizeScore(result.score) }
    }).filter((candidate): candidate is RagRerankCandidate => candidate !== null)
    for (const [index, candidate] of candidates.entries()) {
      if (!seen.has(index)) ordered.push(candidate)
    }
    return ordered.length > 0 ? { candidates: ordered, mode: 'provider' } : null
  } finally {
    clearTimeout(timeout)
  }
}

function deterministicRerank(query: string, candidates: RagRerankCandidate[]) {
  const queryTerms = lexicalTerms(query)
  return candidates.map((candidate) => {
    const terms = lexicalTerms(candidate.text)
    const overlap = queryTerms.size === 0 ? 0 : [...queryTerms].filter((term) => terms.has(term)).length / queryTerms.size
    return { ...candidate, score: normalizeScore(candidate.score * 0.72 + overlap * 0.28) }
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
}

function readRerankerResults(value: unknown): Array<{ index: number; score: number }> {
  if (!isRecord(value)) return []
  const items = Array.isArray(value.results) ? value.results : Array.isArray(value.data) ? value.data : []
  return items.map((item) => {
    if (!isRecord(item)) return null
    const index = typeof item.index === 'number' ? item.index : null
    const score = typeof item.relevance_score === 'number' ? item.relevance_score : typeof item.score === 'number' ? item.score : null
    return index !== null && Number.isInteger(index) && score !== null && Number.isFinite(score) ? { index, score } : null
  }).filter((item): item is { index: number; score: number } => item !== null).sort((a, b) => b.score - a.score || a.index - b.index)
}

function lexicalTerms(value: string) {
  return new Set(value.normalize('NFKC').toLowerCase().match(/[a-z0-9]{2,}|[\p{Script=Han}]{2,}/gu) ?? [])
}

function normalizeScore(value: number) {
  return Number(Math.max(0.001, Math.min(1, value)).toFixed(4))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
