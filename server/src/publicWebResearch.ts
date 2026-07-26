import { createHash } from 'node:crypto'
import { env } from './env.js'
import { fetchAiDailyEvidence, validateAiDailyTargetUrl } from './aiDailySafeFetch.js'
import type { PublicAssistantEvidence } from './publicAssistantRuntime.js'

interface PublicWebLead {
  title: string
  url: string
  publishedAt: string | null
}

export interface PublicWebResearchResult {
  evidence: PublicAssistantEvidence[]
  available: boolean
  diagnostic?: 'not_configured' | 'aborted' | 'timeout' | 'network_error' | 'http_status' | 'invalid_response' | 'evidence_unavailable'
}

export interface PublicWebResearchConfig {
  provider: string
  baseUrl: string
  apiKey: string
  timeoutMs: number
  maxResults: number
  maxPages: number
}

export interface PublicWebResearchDependencies {
  config?: PublicWebResearchConfig
  searchFetch?: typeof fetch
  fetchEvidence?: typeof fetchAiDailyEvidence
  now?: () => Date
}

const supportedSearchProviders = new Set(['brave', 'exa', 'tavily'])

export function isPublicWebSearchConfigured(config = getPublicWebResearchConfig()) {
  return supportedSearchProviders.has(config.provider) && Boolean(config.baseUrl && config.apiKey)
}

export async function researchPublicWeb(
  queries: string[],
  signal?: AbortSignal,
  dependencies: PublicWebResearchDependencies = {},
): Promise<PublicWebResearchResult> {
  const config = dependencies.config ?? getPublicWebResearchConfig()
  const searchFetch = dependencies.searchFetch ?? fetch
  const fetchEvidence = dependencies.fetchEvidence ?? fetchAiDailyEvidence
  const now = dependencies.now ?? (() => new Date())
  if (!isPublicWebSearchConfigured(config)) return { evidence: [], available: false, diagnostic: 'not_configured' }
  if (signal?.aborted) return { evidence: [], available: true, diagnostic: 'aborted' }
  const searchResults = await Promise.all(
    queries.slice(0, 3).map((query) => searchProvider(query, config, searchFetch, signal)),
  )
  const leads = searchResults.flatMap((result) => result.leads)
  if (leads.length === 0) {
    return {
      evidence: [],
      available: true,
      diagnostic: signal?.aborted ? 'aborted' : searchResults.find((result) => result.diagnostic)?.diagnostic ?? 'invalid_response',
    }
  }

  const deduped = dedupeLeads(leads).slice(0, config.maxResults)
  const fetchedEvidence = await Promise.all(deduped.slice(0, config.maxPages).map(async (lead): Promise<PublicAssistantEvidence | null> => {
    if (signal?.aborted) return null
    try {
      const fetched = await fetchEvidence({
        url: lead.url,
        now: now(),
        signal,
        options: {
          userAgent: 'BIAU-Public-Research/1.0',
          maxRedirects: 4,
          connectTimeoutMs: 3_000,
          readTimeoutMs: 5_000,
          totalTimeoutMs: 6_500,
          maxCompressedBytes: 512 * 1024,
          maxDecodedBytes: 2 * 1024 * 1024,
          maxEvidenceBytes: 32 * 1024,
        },
      })
      if (!fetched.canonicalUrl.startsWith('https://')) return null
      const excerpt = compact(fetched.excerpt || fetched.normalizedText, 900)
      const id = `web:${createHash('sha256').update(fetched.canonicalUrl).digest('hex').slice(0, 20)}`
      return {
        id,
        source: 'web',
        title: fetched.title || lead.title,
        canonicalUrl: fetched.canonicalUrl,
        section: fetched.headings[0] || '网页正文',
        excerpt,
        text: fetched.normalizedText.slice(0, 16_000),
        publishedAt: fetched.publishedAt?.toISOString() ?? lead.publishedAt,
        score: fetched.status === 'READY' ? 0.8 : 0.55,
        citation: {
          id,
          title: fetched.title || lead.title,
          summary: excerpt,
          href: fetched.canonicalUrl,
          visibility: 'public',
          source: 'web',
          canonicalUrl: fetched.canonicalUrl,
          section: fetched.headings[0] || '网页正文',
          excerpt,
          publishedAt: fetched.publishedAt?.toISOString() ?? lead.publishedAt,
          evidenceStatus: fetched.status === 'READY' ? 'verified' : 'partial',
        },
      } satisfies PublicAssistantEvidence
    } catch {
      return null
    }
  }))
  const evidence = fetchedEvidence.filter((item): item is PublicAssistantEvidence => item !== null)
  return {
    evidence,
    available: true,
    ...(signal?.aborted
      ? { diagnostic: 'aborted' as const }
      : evidence.length === 0
        ? { diagnostic: 'evidence_unavailable' as const }
        : {}),
  }
}

async function searchProvider(
  query: string,
  config: PublicWebResearchConfig,
  searchFetch: typeof fetch,
  signal?: AbortSignal,
): Promise<{ leads: PublicWebLead[]; diagnostic?: PublicWebResearchResult['diagnostic'] }> {
  const endpoint = searchEndpoint(config.baseUrl)
  if (config.provider === 'tavily') {
    return requestSearchLeads(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query.slice(0, 300),
        search_depth: 'basic',
        max_results: config.maxResults,
        auto_parameters: false,
        include_answer: false,
        include_raw_content: false,
        include_images: false,
      }),
    }, normalizeTavilyResults, config, searchFetch, signal)
  }

  if (config.provider === 'brave') {
    const url = new URL(endpoint)
    url.searchParams.set('q', query.slice(0, 300))
    url.searchParams.set('count', String(config.maxResults))
    url.searchParams.set('safesearch', 'moderate')
    url.searchParams.set('spellcheck', 'true')
    url.searchParams.set('text_decorations', 'false')
    return requestSearchLeads(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': config.apiKey,
      },
    }, normalizeBraveResults, config, searchFetch, signal)
  }

  return requestSearchLeads(endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: query.slice(0, 300), type: 'auto', numResults: config.maxResults }),
  }, normalizeExaResults, config, searchFetch, signal)
}

async function requestSearchLeads(
  endpoint: string | URL,
  init: RequestInit,
  normalize: (value: unknown) => PublicWebLead[],
  config: PublicWebResearchConfig,
  searchFetch: typeof fetch,
  signal?: AbortSignal,
): Promise<{ leads: PublicWebLead[]; diagnostic?: PublicWebResearchResult['diagnostic'] }> {
  const abort = new AbortController()
  let timedOut = false
  let externallyAborted = false
  const onAbort = () => {
    externallyAborted = true
    abort.abort()
  }
  signal?.addEventListener('abort', onAbort, { once: true })
  const timeout = setTimeout(() => {
    timedOut = true
    abort.abort()
  }, Math.min(config.timeoutMs, 7_000))
  try {
    const response = await searchFetch(endpoint, {
      ...init,
      signal: abort.signal,
    })
    if (!response.ok) return { leads: [], diagnostic: 'http_status' }
    const payload = await response.json().catch(() => null)
    const leads = normalize(payload)
    return leads.length > 0 ? { leads } : { leads: [], diagnostic: 'invalid_response' }
  } catch {
    return { leads: [], diagnostic: timedOut ? 'timeout' : externallyAborted ? 'aborted' : 'network_error' }
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', onAbort)
  }
}

function searchEndpoint(baseUrl: string) {
  return baseUrl.endsWith('/search') ? baseUrl : `${baseUrl.replace(/\/+$/u, '')}/search`
}

function normalizeExaResults(value: unknown): PublicWebLead[] {
  return normalizeFlatResults(value, ['publishedDate'])
}

function normalizeTavilyResults(value: unknown): PublicWebLead[] {
  return normalizeFlatResults(value, ['published_date', 'publishedDate'])
}

function normalizeFlatResults(value: unknown, dateKeys: string[]): PublicWebLead[] {
  if (!isRecord(value) || !Array.isArray(value.results)) return []
  return value.results.map((item) => {
    if (!isRecord(item)) return null
    const url = readPublicHttpsUrl(item.url)
    if (!url) return null
    const title = compact(item.title, 240) || new URL(url).hostname
    const publishedAt = dateKeys.map((key) => readIsoDate(item[key])).find((date) => date !== null) ?? null
    return { title, url, publishedAt }
  }).filter((item): item is PublicWebLead => item !== null)
}

function normalizeBraveResults(value: unknown): PublicWebLead[] {
  if (!isRecord(value) || !isRecord(value.web) || !Array.isArray(value.web.results)) return []
  return value.web.results.map((item) => {
    if (!isRecord(item)) return null
    const url = readPublicHttpsUrl(item.url)
    if (!url) return null
    const title = compact(item.title, 240) || new URL(url).hostname
    return { title, url, publishedAt: readIsoDate(item.page_age) ?? readIsoDate(item.age) }
  }).filter((item): item is PublicWebLead => item !== null)
}

function dedupeLeads(leads: PublicWebLead[]) {
  const seen = new Set<string>()
  return leads.filter((lead) => {
    const key = canonicalLeadKey(lead.url)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function canonicalLeadKey(value: string) {
  try {
    const url = new URL(value)
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|ref|source|fbclid|gclid)$/iu.test(key)) url.searchParams.delete(key)
    }
    return url.toString()
  } catch {
    return ''
  }
}

function readPublicHttpsUrl(value: unknown) {
  if (typeof value !== 'string') return ''
  try {
    const url = validateAiDailyTargetUrl(value)
    if (url.protocol !== 'https:' || url.username || url.password) return ''
    return url.toString()
  } catch {
    return ''
  }
}

function getPublicWebResearchConfig(): PublicWebResearchConfig {
  return {
    provider: env.publicWebSearchProvider,
    baseUrl: env.publicWebSearchBaseUrl,
    apiKey: env.publicWebSearchApiKey,
    timeoutMs: env.publicWebSearchTimeoutMs,
    maxResults: env.publicWebSearchMaxResults,
    maxPages: env.publicWebFetchMaxPages,
  }
}

function readIsoDate(value: unknown) {
  if (typeof value !== 'string') return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function compact(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  const normalized = value.replace(/\s+/gu, ' ').trim()
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
