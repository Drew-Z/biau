import { env } from './env.js'
import { createDeterministicEmbeddingProvider } from './ragAdapters.js'

export interface RagEmbeddingResult {
  vector: number[]
  model: string
  dimensions: number
  modelCalls: number
}

export class EmbeddingDimensionMismatchError extends Error {
  readonly expectedDimensions: number
  readonly actualDimensions: number

  constructor(expectedDimensions: number, actualDimensions: number) {
    super('embedding-dimension-mismatch')
    this.name = 'EmbeddingDimensionMismatchError'
    this.expectedDimensions = expectedDimensions
    this.actualDimensions = actualDimensions
  }
}

export class EmbeddingProviderError extends Error {
  readonly reason: string
  readonly httpStatus?: number
  readonly attemptedEndpoints: number
  readonly timeoutMs: number

  constructor(reason: string, details: { httpStatus?: number; attemptedEndpoints?: number; timeoutMs?: number } = {}) {
    super(reason)
    this.name = 'EmbeddingProviderError'
    this.reason = reason
    this.httpStatus = details.httpStatus
    this.attemptedEndpoints = details.attemptedEndpoints ?? 0
    this.timeoutMs = details.timeoutMs ?? env.embeddingTimeoutMs
  }
}

interface EmbedTextOptions {
  expectedDimensions?: number
}

const deterministicEmbeddingProvider = createDeterministicEmbeddingProvider()

export function isExternalEmbeddingConfigured() {
  return Boolean(env.embeddingApiKey && env.embeddingBaseUrl && env.embeddingModel !== 'deterministic-local')
}

export async function embedText(text: string, options: EmbedTextOptions = {}): Promise<RagEmbeddingResult> {
  const result = isExternalEmbeddingConfigured()
    ? {
        vector: await requestEmbedding(text),
        model: env.embeddingModel,
        modelCalls: 1,
      }
    : {
        vector: deterministicEmbeddingProvider.embed(text),
        model: deterministicEmbeddingProvider.kind,
        modelCalls: 0,
      }
  const dimensions = result.vector.length
  const expectedDimensions = options.expectedDimensions ?? env.embeddingDimension
  if (expectedDimensions > 0 && dimensions !== expectedDimensions) {
    throw new EmbeddingDimensionMismatchError(expectedDimensions, dimensions)
  }
  return {
    ...result,
    dimensions,
  }
}

export function formatVector(vector: number[]) {
  return `[${vector.map((value) => Number(value.toFixed(6))).join(',')}]`
}

async function requestEmbedding(text: string) {
  const endpoints = getEmbeddingEndpoints(env.embeddingBaseUrl)
  let response: Response | null = null
  let attemptedEndpoints = 0
  for (const endpoint of endpoints) {
    attemptedEndpoints += 1
    const attempt = await requestEmbeddingEndpoint(endpoint, text).catch((error: unknown) => {
      throw new EmbeddingProviderError(isAbortError(error) ? 'embedding_timeout' : 'embedding_network_error', {
        attemptedEndpoints,
        timeoutMs: env.embeddingTimeoutMs,
      })
    })
    response = attempt
    if (response?.ok) break
    if (!response || ![404, 405].includes(response.status)) break
  }
  if (!response?.ok) {
    throw new EmbeddingProviderError('embedding_provider_error', {
      httpStatus: response?.status,
      attemptedEndpoints,
      timeoutMs: env.embeddingTimeoutMs,
    })
  }
  const payload = (await response.json().catch(() => null)) as unknown
  const embedding = readEmbedding(payload)
  if (!embedding) {
    throw new EmbeddingProviderError('embedding_empty_response', {
      attemptedEndpoints,
      timeoutMs: env.embeddingTimeoutMs,
    })
  }
  return embedding
}

async function requestEmbeddingEndpoint(endpoint: string, text: string) {
  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), env.embeddingTimeoutMs)
  try {
    return await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.embeddingApiKey}`,
        'Content-Type': 'application/json',
      },
      signal: abort.signal,
      body: JSON.stringify({
        model: env.embeddingModel,
        input: text,
        ...(env.embeddingDimension > 0 ? { dimensions: env.embeddingDimension } : {}),
      }),
    })
  } finally {
    clearTimeout(timeout)
  }
}

function readEmbedding(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.data)) return null
  const first = value.data[0]
  if (!isRecord(first) || !Array.isArray(first.embedding)) return null
  const vector = first.embedding.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
  return vector.length === first.embedding.length && vector.length > 0 ? vector : null
}

function getEmbeddingEndpoints(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, '')
  if (!normalized) return []
  if (normalized.endsWith('/embeddings')) return [normalized]
  if (normalized.endsWith('/v1')) return [`${normalized}/embeddings`]
  return Array.from(new Set([`${normalized}/embeddings`, `${normalized}/v1/embeddings`]))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}
