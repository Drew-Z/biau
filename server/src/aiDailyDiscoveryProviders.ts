import {
  AiDailyAdapterError,
  type AiDailyCandidateLeadInput,
  type AiDailyDiscoveryAdapter,
  type AiDailyDiscoveryRequest,
} from './aiDailyIngestion.js'
import { AiDailyFetchError, fetchAiDailySourcePayload } from './aiDailySafeFetch.js'

const theNewsApiEndpoint = 'https://api.thenewsapi.com/v1/news/all'
const gdeltEndpoint = 'https://api.gdeltproject.org/api/v2/doc/doc'
const hackerNewsAlgoliaEndpoint = 'https://hn.algolia.com/api/v1/search_by_date'
const hotDailyEndpoint = 'https://api.hotdaily.top/v1/digests/today'

type DiscoverySlot = AiDailyDiscoveryAdapter['slot']

export type AiDailyDiscoveryPayloadFetcher = (input: {
  url: string
  timeoutMs: number
}) => Promise<unknown>

export interface AiDailyDiscoveryRuntime {
  primary: AiDailyDiscoveryAdapter
  fallback: AiDailyDiscoveryAdapter | null
  signals: AiDailyDiscoveryAdapter[]
  diagnostics: string[]
}

export function createAiDailyDiscoveryRuntime(input: {
  theNewsApiEnabled: boolean
  theNewsApiToken: string
  hotDailyEnabled?: boolean
  fetchPayload?: AiDailyDiscoveryPayloadFetcher
}): AiDailyDiscoveryRuntime {
  const fetchPayload = input.fetchPayload ?? fetchDiscoveryPayload
  const gdelt = createGdeltDiscoveryAdapter({ slot: input.theNewsApiEnabled ? 'fallback' : 'primary', fetchPayload })
  const diagnostics: string[] = []
  let primary: AiDailyDiscoveryAdapter = gdelt
  let fallback: AiDailyDiscoveryAdapter | null = null

  if (input.theNewsApiEnabled && input.theNewsApiToken.trim()) {
    primary = createTheNewsApiDiscoveryAdapter({ token: input.theNewsApiToken, slot: 'primary', fetchPayload })
    fallback = gdelt
  } else if (input.theNewsApiEnabled) {
    diagnostics.push('the-news-api-token-missing')
  }

  const signals = [createHackerNewsAlgoliaDiscoveryAdapter({ slot: 'signal', fetchPayload })]
  if (input.hotDailyEnabled ?? true) {
    signals.push(createHotDailyDiscoveryAdapter({ slot: 'signal', fetchPayload }))
  }

  return {
    primary,
    fallback,
    signals,
    diagnostics,
  }
}

export function createTheNewsApiDiscoveryAdapter(input: {
  token: string
  slot?: DiscoverySlot
  fetchPayload?: AiDailyDiscoveryPayloadFetcher
}): AiDailyDiscoveryAdapter {
  const token = input.token.trim()
  const fetchPayload = input.fetchPayload ?? fetchDiscoveryPayload
  return {
    id: 'the-news-api',
    slot: input.slot ?? 'primary',
    async discover(request) {
      if (!token) throw new AiDailyAdapterError('config_error')
      const candidates: AiDailyCandidateLeadInput[] = []
      const seen = new Set<string>()
      for (const query of selectBoundedRotatingQueries(request)) {
        if (candidates.length >= request.budget.maxResults) break
        const url = new URL(theNewsApiEndpoint)
        url.searchParams.set('api_token', token)
        url.searchParams.set('search', query)
        url.searchParams.set('search_fields', 'title,description,keywords')
        url.searchParams.set('categories', 'tech,science')
        url.searchParams.set('language', request.locale.toLowerCase().startsWith('zh') ? 'zh,en' : 'en')
        url.searchParams.set('published_after', formatIsoSeconds(request.windowStart))
        url.searchParams.set('published_before', formatIsoSeconds(request.windowEnd))
        url.searchParams.set('sort', 'published_at')
        url.searchParams.set('limit', String(Math.max(1, Math.min(3, request.budget.maxResults - candidates.length))))
        if (request.includeDomains.length > 0) url.searchParams.set('domains', request.includeDomains.join(','))
        if (request.excludeDomains.length > 0) url.searchParams.set('exclude_domains', request.excludeDomains.join(','))

        const payload = asRecord(await fetchPayload({ url: url.toString(), timeoutMs: request.budget.timeoutMs }))
        for (const value of asArray(payload.data)) {
          const candidate = toTheNewsApiCandidate(value, request)
          if (!candidate) continue
          const dedupeKey = candidate.observationKey || candidate.originalUrl
          if (seen.has(dedupeKey)) continue
          seen.add(dedupeKey)
          candidates.push(candidate)
          if (candidates.length >= request.budget.maxResults) break
        }
      }
      return candidates
    },
  }
}

export function createGdeltDiscoveryAdapter(input: {
  slot?: DiscoverySlot
  fetchPayload?: AiDailyDiscoveryPayloadFetcher
} = {}): AiDailyDiscoveryAdapter {
  const fetchPayload = input.fetchPayload ?? fetchDiscoveryPayload
  return {
    id: 'gdelt-doc',
    slot: input.slot ?? 'primary',
    async discover(request) {
      const url = new URL(gdeltEndpoint)
      url.searchParams.set('query', selectRotatingQuery(request))
      url.searchParams.set('mode', 'artlist')
      url.searchParams.set('format', 'json')
      url.searchParams.set('sort', 'datedesc')
      url.searchParams.set('maxrecords', String(Math.max(1, Math.min(request.budget.maxResults, 75))))
      url.searchParams.set('startdatetime', formatGdeltDate(request.windowStart))
      url.searchParams.set('enddatetime', formatGdeltDate(request.windowEnd))

      const payload = asRecord(await fetchPayload({ url: url.toString(), timeoutMs: request.budget.timeoutMs }))
      return asArray(payload.articles)
        .map((value) => toGdeltCandidate(value, request))
        .filter((candidate): candidate is AiDailyCandidateLeadInput => candidate !== null)
    },
  }
}

export function createHackerNewsAlgoliaDiscoveryAdapter(input: {
  slot?: DiscoverySlot
  fetchPayload?: AiDailyDiscoveryPayloadFetcher
} = {}): AiDailyDiscoveryAdapter {
  const fetchPayload = input.fetchPayload ?? fetchDiscoveryPayload
  return {
    id: 'hacker-news-algolia',
    slot: input.slot ?? 'signal',
    async discover(request) {
      const url = new URL(hackerNewsAlgoliaEndpoint)
      url.searchParams.set('query', selectRotatingQuery(request))
      url.searchParams.set('tags', 'story')
      url.searchParams.set(
        'numericFilters',
        `created_at_i>=${Math.floor(request.windowStart.getTime() / 1000)},created_at_i<=${Math.floor(request.windowEnd.getTime() / 1000)}`,
      )
      url.searchParams.set('hitsPerPage', String(Math.max(1, Math.min(request.budget.maxResults, 20))))

      const payload = asRecord(await fetchPayload({ url: url.toString(), timeoutMs: request.budget.timeoutMs }))
      return asArray(payload.hits)
        .map((value) => toHackerNewsCandidate(value, request))
        .filter((candidate): candidate is AiDailyCandidateLeadInput => candidate !== null)
    },
  }
}

export function createHotDailyDiscoveryAdapter(input: {
  slot?: DiscoverySlot
  fetchPayload?: AiDailyDiscoveryPayloadFetcher
} = {}): AiDailyDiscoveryAdapter {
  const fetchPayload = input.fetchPayload ?? fetchDiscoveryPayload
  let cachedPayload: unknown = null
  let cachedUntil = 0
  return {
    id: 'hotdaily-public-api',
    slot: input.slot ?? 'signal',
    async discover(request) {
      if (Date.now() >= cachedUntil) {
        cachedPayload = await fetchPayload({ url: hotDailyEndpoint, timeoutMs: request.budget.timeoutMs })
        cachedUntil = Date.now() + 10 * 60_000
      }
      const payload = asRecord(cachedPayload)
      return asArray(payload.items)
        .map((value) => toHotDailyCandidate(value, request))
        .filter((candidate): candidate is AiDailyCandidateLeadInput => candidate !== null)
    },
  }
}

async function fetchDiscoveryPayload(input: { url: string; timeoutMs: number }) {
  try {
    const payload = await fetchAiDailySourcePayload({
      url: input.url,
      options: {
        connectTimeoutMs: Math.min(input.timeoutMs, 8_000),
        totalTimeoutMs: input.timeoutMs,
        maxCompressedBytes: 2 * 1024 * 1024,
        maxDecodedBytes: 4 * 1024 * 1024,
      },
    })
    return JSON.parse(payload.text) as unknown
  } catch (error) {
    if (error instanceof AiDailyFetchError) throw new AiDailyAdapterError(error.category)
    if (error instanceof SyntaxError) throw new AiDailyAdapterError('invalid_response')
    throw new AiDailyAdapterError('network_error')
  }
}

function toTheNewsApiCandidate(value: unknown, request: AiDailyDiscoveryRequest): AiDailyCandidateLeadInput | null {
  const item = asRecord(value)
  const originalUrl = readText(item.url)
  const title = readText(item.title)
  const publishedAt = readDate(item.published_at)
  if (!originalUrl || !title || !publishedAt || !insideWindow(publishedAt, request)) return null
  if (!domainAllowed(originalUrl, request)) return null
  return {
    providerKind: 'the-news-api',
    sourceExternalId: readText(item.uuid) || null,
    observationKey: readText(item.uuid) || originalUrl,
    observedAt: request.windowEnd,
    originalUrl,
    title,
    publisher: readText(item.source) || hostnameOf(originalUrl),
    publishedAt,
    locale: readText(item.language) || request.locale,
    sourceTier: 'TIER_2',
    topics: [request.queryGroup],
    leadOnly: false,
    snippet: readText(item.description ?? item.snippet) || null,
  }
}

function toGdeltCandidate(value: unknown, request: AiDailyDiscoveryRequest): AiDailyCandidateLeadInput | null {
  const item = asRecord(value)
  const originalUrl = readText(item.url)
  const title = readText(item.title)
  if (!originalUrl || !title || !domainAllowed(originalUrl, request)) return null
  return {
    providerKind: 'gdelt-doc',
    sourceExternalId: null,
    observationKey: originalUrl,
    observedAt: request.windowEnd,
    originalUrl,
    title,
    publisher: readText(item.domain) || hostnameOf(originalUrl),
    publishedAt: null,
    locale: request.locale,
    sourceTier: 'TIER_3',
    topics: [request.queryGroup],
    leadOnly: true,
    snippet: null,
  }
}

function toHackerNewsCandidate(value: unknown, request: AiDailyDiscoveryRequest): AiDailyCandidateLeadInput | null {
  const item = asRecord(value)
  const objectId = readText(item.objectID)
  const originalUrl = readText(item.url)
  const title = readText(item.title)
  if (!originalUrl || !title || !domainAllowed(originalUrl, request)) return null
  return {
    providerKind: 'hacker-news-algolia',
    sourceExternalId: objectId || null,
    observationKey: objectId || originalUrl,
    observedAt: request.windowEnd,
    originalUrl,
    title,
    publisher: hostnameOf(originalUrl),
    publishedAt: null,
    locale: request.locale,
    sourceTier: 'TIER_3',
    topics: [request.queryGroup],
    leadOnly: true,
    snippet: null,
  }
}

function toHotDailyCandidate(value: unknown, request: AiDailyDiscoveryRequest): AiDailyCandidateLeadInput | null {
  const item = asRecord(value)
  const originalUrl = readText(item.url)
  const title = readText(item.title)
  const routedQueryGroup = routeHotDailyTitle(title)
  if (!originalUrl || !title || routedQueryGroup !== request.queryGroup || !domainAllowed(originalUrl, request)) return null
  const communitySource = readText(item.source).toLowerCase()
  const itemId = readText(item.externalId ?? item.id)
  const sourceExternalId = [communitySource, itemId].filter(Boolean).join(':')
  return {
    providerKind: 'hotdaily-public-api',
    sourceExternalId: sourceExternalId || null,
    observationKey: readText(item.id) || sourceExternalId || originalUrl,
    observedAt: request.windowEnd,
    originalUrl,
    title,
    publisher: hostnameOf(originalUrl),
    publishedAt: null,
    locale: request.locale,
    sourceTier: 'TIER_3',
    topics: [request.queryGroup],
    leadOnly: true,
    // HotDaily's generated summaries and value judgments are intentionally not
    // imported. BIAU fetches and evaluates the original article independently.
    snippet: null,
  }
}

function routeHotDailyTitle(title: string) {
  const normalized = title.normalize('NFKC').toLowerCase()
  if (!hotDailyAiTitlePattern.test(normalized)) return null
  if (hotDailyChinaTitlePattern.test(normalized)) return 'china-ai-releases'
  if (hotDailyOpenSourceTitlePattern.test(normalized)) return 'open-source-ai'
  return 'frontier-model-releases'
}

const hotDailyAiTitlePattern = /(?:\bai\b|\bllm\b|\bagents?\b|\bopenai\b|\banthropic\b|\bclaude\b|\bgemini\b|\bgrok\b|\bllama\b|\bmistral\b|\bqwen\b|\bdeepseek\b|\bkimi\b|\bglm\b|\binference\b|\bmachine learning\b|\bartificial intelligence\b|人工智能|大模型|智能体|机器学习|模型推理)/iu
const hotDailyChinaTitlePattern = /(?:\bqwen\b|\bdeepseek\b|\bkimi\b|\bmoonshot\b|\bminimax\b|\bglm\b|\bzhipu\b|\bernie\b|\bdoubao\b|\bhunyuan\b|通义|千问|智谱|豆包|混元|文心|月之暗面|大模型\s*(?:发布|更新|开源))/iu
const hotDailyOpenSourceTitlePattern = /(?:\bopen[ -](?:source|weight)\b|\bhugging face\b|\bllama\b|\bmistral\b|开源\s*(?:ai|模型|大模型))/iu

function selectRotatingQuery(request: AiDailyDiscoveryRequest) {
  return selectBoundedRotatingQueries(request, 1)[0] ?? request.queryGroup
}

function selectBoundedRotatingQueries(request: AiDailyDiscoveryRequest, limit = request.budget.maxRequests) {
  const queries = [...new Set(request.queries.map((query) => query.trim()).filter(Boolean))]
  if (queries.length === 0) queries.push(request.queryGroup)
  const start = Math.abs(hashText(request.queryGroup) + Math.floor(request.windowEnd.getTime() / (6 * 60 * 60_000))) % queries.length
  const boundedCount = Math.max(0, Math.min(limit, request.budget.maxRequests, queries.length))
  return Array.from({ length: boundedCount }, (_, offset) => queries[(start + offset) % queries.length]!)
}

function domainAllowed(value: string, request: AiDailyDiscoveryRequest) {
  const hostname = hostnameOf(value)
  if (!hostname) return false
  if (request.excludeDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return false
  if (request.includeDomains.length === 0) return true
  return request.includeDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
}

function hostnameOf(value: string) {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function insideWindow(value: Date, request: AiDailyDiscoveryRequest) {
  return value.getTime() >= request.windowStart.getTime() && value.getTime() <= request.windowEnd.getTime()
}

function readDate(value: unknown) {
  const text = readText(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatIsoSeconds(value: Date) {
  return value.toISOString().slice(0, 19)
}

function formatGdeltDate(value: Date) {
  return value.toISOString().replace(/[-:T]/gu, '').slice(0, 14)
}

function hashText(value: string) {
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.codePointAt(0)!) | 0
  return hash
}

function readText(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).replace(/\s+/gu, ' ').trim() : ''
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : []
}
