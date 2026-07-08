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

const EMBEDDING_BATCH_SIZE = 8
const EMBEDDING_MAX_RETRIES = 2
const EMBEDDING_RETRY_BASE_MS = 1500
const EMBEDDING_RETRY_MAX_MS = 6000
const deterministicEmbeddingProvider = createDeterministicEmbeddingProvider()

export function isExternalEmbeddingConfigured() {
  return Boolean(env.embeddingApiKey && env.embeddingBaseUrl && env.embeddingModel !== 'deterministic-local')
}

export async function embedText(text: string, options: EmbedTextOptions = {}): Promise<RagEmbeddingResult> {
  const [result] = await embedTexts([text], options)
  return result
}

export async function embedTexts(texts: string[], options: EmbedTextOptions = {}): Promise<RagEmbeddingResult[]> {
  const normalizedTexts = texts.map((text) => text.trim()).filter(Boolean)
  if (normalizedTexts.length === 0) return []

  if (!isExternalEmbeddingConfigured()) {
    return normalizedTexts.map((text) =>
      buildEmbeddingResult(deterministicEmbeddingProvider.embed(text), deterministicEmbeddingProvider.kind, 0, options.expectedDimensions),
    )
  }

  const results: RagEmbeddingResult[] = []
  for (let index = 0; index < normalizedTexts.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = normalizedTexts.slice(index, index + EMBEDDING_BATCH_SIZE)
    const vectors = await requestEmbeddingBatch(batch)
    results.push(...vectors.map((vector) => buildEmbeddingResult(vector, env.embeddingModel, 1, options.expectedDimensions)))
  }
  return results
}

function buildEmbeddingResult(vector: number[], model: string, modelCalls: number, expectedDimensionsOverride?: number): RagEmbeddingResult {
  const dimensions = vector.length
  const expectedDimensions = expectedDimensionsOverride ?? env.embeddingDimension
  if (expectedDimensions > 0 && dimensions !== expectedDimensions) {
    throw new EmbeddingDimensionMismatchError(expectedDimensions, dimensions)
  }
  return {
    vector,
    model,
    dimensions,
    modelCalls,
  }
}

export function formatVector(vector: number[]) {
  return `[${vector.map((value) => Number(value.toFixed(6))).join(',')}]`
}

async function requestEmbeddingBatch(texts: string[]): Promise<number[][]> {
  try {
    return await requestEmbeddingBatchOnce(texts)
  } catch (error) {
    if (texts.length > 1 && error instanceof EmbeddingProviderError && shouldSplitEmbeddingBatch(error)) {
      const middle = Math.ceil(texts.length / 2)
      const left = await requestEmbeddingBatch(texts.slice(0, middle))
      const right = await requestEmbeddingBatch(texts.slice(middle))
      return [...left, ...right]
    }
    throw error
  }
}

async function requestEmbeddingBatchOnce(texts: string[]): Promise<number[][]> {
  const endpoints = getEmbeddingEndpoints(env.embeddingBaseUrl)
  let response: Response | null = null
  let attemptedEndpoints = 0
  const input = texts.length === 1 ? texts[0] : texts
  for (const endpoint of endpoints) {
    attemptedEndpoints += 1
    const attempt = await requestEmbeddingEndpoint(endpoint, input).catch((error: unknown) => {
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
    throw new EmbeddingProviderError(response?.status === 429 ? 'embedding_rate_limited' : 'embedding_provider_error', {
      httpStatus: response?.status,
      attemptedEndpoints,
      timeoutMs: env.embeddingTimeoutMs,
    })
  }
  const payload = (await response.json().catch(() => null)) as unknown
  const embeddings = readEmbeddings(payload)
  if (!embeddings || embeddings.length !== texts.length) {
    throw new EmbeddingProviderError('embedding_empty_response', {
      attemptedEndpoints,
      timeoutMs: env.embeddingTimeoutMs,
    })
  }
  return embeddings
}

async function requestEmbeddingEndpoint(endpoint: string, input: string | string[]) {
  let lastError: unknown
  for (let attempt = 0; attempt <= EMBEDDING_MAX_RETRIES; attempt += 1) {
    const abort = new AbortController()
    const timeout = setTimeout(() => abort.abort(), env.embeddingTimeoutMs)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.embeddingApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: abort.signal,
        body: JSON.stringify({
          model: env.embeddingModel,
          input,
          ...(env.embeddingDimension > 0 ? { dimensions: env.embeddingDimension } : {}),
        }),
      })
      if (!isRetryableEmbeddingStatus(response.status) || attempt === EMBEDDING_MAX_RETRIES) return response
      await delay(getEmbeddingRetryDelayMs(response, attempt))
    } catch (error) {
      lastError = error
      if (attempt === EMBEDDING_MAX_RETRIES) throw error
      await delay(getEmbeddingRetryDelayMs(null, attempt))
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('embedding-network-error')
}

function readEmbeddings(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.data)) return null
  const data = value.data
    .map((item, fallbackIndex) => ({ item, fallbackIndex }))
    .sort((left, right) => readEmbeddingIndex(left.item, left.fallbackIndex) - readEmbeddingIndex(right.item, right.fallbackIndex))
  const vectors = data.map(({ item }) => {
    if (!isRecord(item) || !Array.isArray(item.embedding)) return null
    const vector = item.embedding.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
    return vector.length === item.embedding.length && vector.length > 0 ? vector : null
  })
  return vectors.every((vector): vector is number[] => Array.isArray(vector)) ? vectors : null
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

function isRetryableEmbeddingStatus(status: number) {
  return status === 429 || status >= 500
}

function isBatchFallbackStatus(status: number | undefined) {
  return status === 400 || status === 413 || status === 422
}

function shouldSplitEmbeddingBatch(error: EmbeddingProviderError) {
  return isBatchFallbackStatus(error.httpStatus) || error.reason === 'embedding_empty_response'
}

function getEmbeddingRetryDelayMs(response: Response | null, attempt: number) {
  const retryAfter = response ? readRetryAfterMs(response.headers.get('retry-after')) : null
  if (typeof retryAfter === 'number') return Math.min(EMBEDDING_RETRY_MAX_MS, retryAfter)
  return Math.min(EMBEDDING_RETRY_MAX_MS, EMBEDDING_RETRY_BASE_MS * 2 ** attempt)
}

function readRetryAfterMs(value: string | null) {
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return null
  return Math.max(0, timestamp - Date.now())
}

function readEmbeddingIndex(value: unknown, fallbackIndex: number) {
  if (!isRecord(value) || typeof value.index !== 'number' || !Number.isFinite(value.index)) return fallbackIndex
  return value.index
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
