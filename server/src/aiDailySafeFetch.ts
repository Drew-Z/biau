import { lookup as dnsLookup } from 'node:dns/promises'
import { request as httpRequest, type ClientRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib'
import { load } from 'cheerio'
import ipaddr from 'ipaddr.js'
import * as robotsParserModule from 'robots-parser'
import {
  AiDailyAdapterError,
  type AiDailyIngestionErrorCategory,
  createAiDailyContentHash,
} from './aiDailyIngestion.js'

export interface AiDailyResolvedAddress {
  address: string
  family: 4 | 6
}

export interface AiDailyHttpRequest {
  url: URL
  address: AiDailyResolvedAddress
  headers: Record<string, string>
  connectTimeoutMs: number
  readTimeoutMs: number
  totalTimeoutMs: number
  maxCompressedBytes: number
}

export interface AiDailyHttpResponse {
  status: number
  headers: Record<string, string>
  body: Buffer
}

export interface AiDailyHttpTransport {
  request(input: AiDailyHttpRequest): Promise<AiDailyHttpResponse>
}

export interface AiDailyRobotsChecker {
  allowed(url: URL, userAgent: string): Promise<boolean>
}

export interface AiDailyExternalEvidencePayload {
  title: string
  publisher?: string
  author?: string | null
  publishedAt?: string | null
  locale?: string
  canonicalUrl?: string
  headings?: string[]
  text: string
  contentType?: string
}

export interface AiDailyExternalExtractor {
  id: 'firecrawl' | 'tavily-extract'
  extract(url: string): Promise<AiDailyExternalEvidencePayload>
}

export interface AiDailyEvidenceDocumentInput {
  extractionMethod: 'DIRECT' | 'FIRECRAWL' | 'TAVILY'
  originalUrl: string
  canonicalUrl: string
  title: string
  publisher: string
  author: string | null
  publishedAt: Date | null
  fetchedAt: Date
  locale: string
  contentType: string
  contentHash: string
  headings: string[]
  normalizedText: string
  excerpt: string
  normalizedBytes: number
  status: 'READY' | 'THIN'
  expiresAt: Date
}

export interface AiDailySafeFetchOptions {
  userAgent: string
  maxRedirects: number
  connectTimeoutMs: number
  readTimeoutMs: number
  totalTimeoutMs: number
  maxCompressedBytes: number
  maxDecodedBytes: number
  maxEvidenceBytes: number
  retentionDays: number
}

export const defaultAiDailySafeFetchOptions: AiDailySafeFetchOptions = {
  userAgent: 'BIAU-AI-Daily/1.0 (+https://biau.playlab.eu.cc)',
  maxRedirects: 5,
  connectTimeoutMs: 5_000,
  readTimeoutMs: 10_000,
  totalTimeoutMs: 15_000,
  maxCompressedBytes: 2 * 1024 * 1024,
  maxDecodedBytes: 4 * 1024 * 1024,
  maxEvidenceBytes: 64 * 1024,
  retentionDays: 30,
}

export class AiDailyFetchError extends AiDailyAdapterError {
  constructor(category: AiDailyIngestionErrorCategory) {
    super(category)
    this.name = 'AiDailyFetchError'
  }
}

interface AiDailyRobotsParser {
  isAllowed(url: string, userAgent?: string): boolean | undefined
}

const parseRobots = robotsParserModule as unknown as (url: string, content: string) => AiDailyRobotsParser

export async function fetchAiDailyEvidence(input: {
  url: string
  now: Date
  locale?: string
  preferRendered?: boolean
  resolveHost?: (hostname: string) => Promise<AiDailyResolvedAddress[]>
  transport?: AiDailyHttpTransport
  robots?: AiDailyRobotsChecker
  firecrawl?: AiDailyExternalExtractor | null
  tavily?: AiDailyExternalExtractor | null
  options?: Partial<AiDailySafeFetchOptions>
}): Promise<AiDailyEvidenceDocumentInput> {
  const options = { ...defaultAiDailySafeFetchOptions, ...input.options }
  const resolveHost = input.resolveHost ?? resolveAiDailyPublicHost
  const transport = input.transport ?? nodeAiDailyHttpTransport
  const robots = input.robots ?? createAiDailyRobotsChecker({ resolveHost, transport, options })
  const url = validateAiDailyTargetUrl(input.url)
  if (!(await robots.allowed(url, options.userAgent))) throw new AiDailyFetchError('robots_disallowed')

  if (!input.preferRendered) {
    try {
      const response = await requestAiDailyUrl({
        url,
        resolveHost,
        transport,
        options,
        redirectAllowed: (target) => robots.allowed(target, options.userAgent),
      })
      return extractAiDailyEvidenceFromResponse({
        originalUrl: input.url,
        finalUrl: response.url,
        response: response.response,
        now: input.now,
        locale: input.locale ?? 'zh',
        options,
      })
    } catch (error) {
      if (!shouldTryExternalExtractor(error)) throw error
    }
  }

  if (input.firecrawl) {
    try {
      return normalizeAiDailyExternalEvidence({
        originalUrl: input.url,
        payload: await input.firecrawl.extract(url.toString()),
        method: 'FIRECRAWL',
        now: input.now,
        locale: input.locale ?? 'zh',
        options,
      })
    } catch (error) {
      if (!input.tavily) throw normalizeExternalExtractorError(error)
    }
  }

  if (input.tavily) {
    try {
      return normalizeAiDailyExternalEvidence({
        originalUrl: input.url,
        payload: await input.tavily.extract(url.toString()),
        method: 'TAVILY',
        now: input.now,
        locale: input.locale ?? 'zh',
        options,
      })
    } catch (error) {
      throw normalizeExternalExtractorError(error)
    }
  }

  throw new AiDailyFetchError(input.preferRendered ? 'render_required' : 'fetch_empty')
}

export async function resolveAiDailyPublicHost(hostname: string): Promise<AiDailyResolvedAddress[]> {
  if (isUnsafeHostname(hostname)) throw new AiDailyFetchError('unsafe_url')
  if (isIP(hostname)) {
    if (!isPublicAddress(hostname)) throw new AiDailyFetchError('unsafe_url')
    return [{ address: hostname, family: isIP(hostname) as 4 | 6 }]
  }
  let addresses: Array<{ address: string; family: 4 | 6 }>
  try {
    addresses = (await dnsLookup(hostname, { all: true, verbatim: true })) as Array<{
      address: string
      family: 4 | 6
    }>
  } catch {
    throw new AiDailyFetchError('network_error')
  }
  if (addresses.length === 0 || addresses.some((entry) => !isPublicAddress(entry.address))) {
    throw new AiDailyFetchError('unsafe_url')
  }
  return addresses.map((entry) => ({ address: entry.address, family: entry.family as 4 | 6 }))
}

export function validateAiDailyTargetUrl(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new AiDailyFetchError('unsafe_url')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || isUnsafeHostname(url.hostname)) {
    throw new AiDailyFetchError('unsafe_url')
  }
  if (isIP(url.hostname) && !isPublicAddress(url.hostname)) throw new AiDailyFetchError('unsafe_url')
  return url
}

export function isPublicAddress(value: string) {
  try {
    let address = ipaddr.parse(value)
    if (address.kind() === 'ipv6') {
      const ipv6 = address as ipaddr.IPv6
      if (ipv6.isIPv4MappedAddress()) address = ipv6.toIPv4Address()
    }
    return address.range() === 'unicast'
  } catch {
    return false
  }
}

export const nodeAiDailyHttpTransport: AiDailyHttpTransport = {
  request(input) {
    return new Promise((resolve, reject) => {
      const requestFn = input.url.protocol === 'https:' ? httpsRequest : httpRequest
      let request: ClientRequest | null = null
      const totalTimer = setTimeout(() => {
        const error = new AiDailyFetchError('timeout')
        request?.destroy(error)
        reject(error)
      }, input.totalTimeoutMs)
      request = requestFn(
        input.url,
        {
          method: 'GET',
          headers: input.headers,
          lookup: (_hostname, _options, callback) => {
            callback(null, input.address.address, input.address.family)
          },
        },
        (response) => {
          const chunks: Buffer[] = []
          let received = 0
          response.on('data', (chunk: Buffer | string) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            received += buffer.length
            if (received > input.maxCompressedBytes) {
              request?.destroy(new AiDailyFetchError('evidence_rejected'))
              return
            }
            chunks.push(buffer)
          })
          response.on('end', () => {
            clearTimeout(totalTimer)
            resolve({
              status: response.statusCode ?? 0,
              headers: normalizeHeaders(response.headers),
              body: Buffer.concat(chunks),
            })
          })
        },
      )
      request.setTimeout(input.readTimeoutMs, () => request.destroy(new AiDailyFetchError('timeout')))
      request.on('socket', (socket) => {
        if (!socket.connecting) return
        const connectTimer = setTimeout(() => request.destroy(new AiDailyFetchError('timeout')), input.connectTimeoutMs)
        const clear = () => clearTimeout(connectTimer)
        socket.once('connect', clear)
        socket.once('secureConnect', clear)
        socket.once('error', clear)
      })
      request.on('error', (error) => {
        clearTimeout(totalTimer)
        reject(error instanceof AiDailyFetchError ? error : new AiDailyFetchError('network_error'))
      })
      request.end()
    })
  },
}

export function createAiDailyRobotsChecker(input: {
  resolveHost: (hostname: string) => Promise<AiDailyResolvedAddress[]>
  transport: AiDailyHttpTransport
  options?: Partial<AiDailySafeFetchOptions>
}): AiDailyRobotsChecker {
  const options = { ...defaultAiDailySafeFetchOptions, ...input.options }
  const cache = new Map<string, AiDailyRobotsParser | null>()
  return {
    async allowed(url, userAgent) {
      const origin = url.origin
      let parser = cache.get(origin)
      if (parser === undefined) {
        const robotsUrl = new URL('/robots.txt', origin)
        try {
          const result = await requestAiDailyUrl({
            url: robotsUrl,
            resolveHost: input.resolveHost,
            transport: input.transport,
            options: { ...options, maxCompressedBytes: 256 * 1024, maxDecodedBytes: 256 * 1024 },
          })
          if (result.response.status === 404) {
            parser = null
          } else if (result.response.status >= 200 && result.response.status < 300) {
            const body = decodeAiDailyBody(result.response, options.maxDecodedBytes).toString('utf8')
            parser = parseRobots(robotsUrl.toString(), body)
          } else {
            parser = null
          }
        } catch (error) {
          if (error instanceof AiDailyFetchError && error.category === 'unsafe_url') throw error
          parser = null
        }
        cache.set(origin, parser)
      }
      return parser ? parser.isAllowed(url.toString(), userAgent) !== false : true
    },
  }
}

async function requestAiDailyUrl(input: {
  url: URL
  resolveHost: (hostname: string) => Promise<AiDailyResolvedAddress[]>
  transport: AiDailyHttpTransport
  options: AiDailySafeFetchOptions
  redirectAllowed?: (url: URL) => Promise<boolean>
}) {
  let current = input.url
  for (let redirect = 0; redirect <= input.options.maxRedirects; redirect += 1) {
    validateAiDailyTargetUrl(current.toString())
    if (redirect > 0 && input.redirectAllowed && !(await input.redirectAllowed(current))) {
      throw new AiDailyFetchError('robots_disallowed')
    }
    const addresses = await input.resolveHost(current.hostname)
    const address = addresses[0]
    if (!address) throw new AiDailyFetchError('network_error')
    const response = await input.transport.request({
      url: current,
      address,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml,text/xml,text/plain,application/json;q=0.9,*/*;q=0.1',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': input.options.userAgent,
      },
      connectTimeoutMs: input.options.connectTimeoutMs,
      readTimeoutMs: input.options.readTimeoutMs,
      totalTimeoutMs: input.options.totalTimeoutMs,
      maxCompressedBytes: input.options.maxCompressedBytes,
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location
      if (!location || redirect === input.options.maxRedirects) throw new AiDailyFetchError('invalid_response')
      current = validateAiDailyTargetUrl(new URL(location, current).toString())
      continue
    }
    return { url: current, response }
  }
  throw new AiDailyFetchError('invalid_response')
}

function extractAiDailyEvidenceFromResponse(input: {
  originalUrl: string
  finalUrl: URL
  response: AiDailyHttpResponse
  now: Date
  locale: string
  options: AiDailySafeFetchOptions
}) {
  if (input.response.status < 200 || input.response.status >= 300) throw new AiDailyFetchError('invalid_response')
  const contentType = normalizeContentType(input.response.headers['content-type'])
  if (!isAllowedEvidenceContentType(contentType)) throw new AiDailyFetchError('invalid_response')
  const body = decodeAiDailyBody(input.response, input.options.maxDecodedBytes)
  const text = body.toString(readCharset(input.response.headers['content-type']))
  if (!text.trim()) throw new AiDailyFetchError('fetch_empty')
  if (contentType.includes('html') || contentType.includes('xhtml')) {
    return extractHtmlEvidence({ ...input, contentType, text })
  }
  return normalizePlainEvidence({
    originalUrl: input.originalUrl,
    canonicalUrl: input.finalUrl.toString(),
    title: input.finalUrl.pathname.split('/').filter(Boolean).at(-1) ?? input.finalUrl.hostname,
    publisher: input.finalUrl.hostname,
    author: null,
    publishedAt: null,
    fetchedAt: input.now,
    locale: input.locale,
    contentType,
    headings: [],
    text,
    method: 'DIRECT',
    options: input.options,
  })
}

function extractHtmlEvidence(input: {
  originalUrl: string
  finalUrl: URL
  now: Date
  locale: string
  options: AiDailySafeFetchOptions
  contentType: string
  text: string
}) {
  const $ = load(input.text)
  const scriptCount = $('script').length
  $('script, style, noscript, svg, template, nav, footer').remove()
  const main = $('article').first().length
    ? $('article').first()
    : $('main').first().length
      ? $('main').first()
      : $('[role="main"]').first().length
        ? $('[role="main"]').first()
        : $('body').first()
  const normalizedText = normalizeEvidenceText(main.text())
  if (normalizedText.length < 200 && scriptCount >= 3) throw new AiDailyFetchError('render_required')
  const title =
    readMeta($, 'property', 'og:title') ||
    normalizeEvidenceText($('title').first().text()) ||
    normalizeEvidenceText($('h1').first().text())
  if (!title) throw new AiDailyFetchError('fetch_empty')
  const publisher = readMeta($, 'property', 'og:site_name') || input.finalUrl.hostname
  const author =
    readMeta($, 'name', 'author') ||
    readMeta($, 'property', 'article:author') ||
    null
  const publishedAt = readPublishedDate(
    readMeta($, 'property', 'article:published_time') ||
      readMeta($, 'name', 'date') ||
      $('time[datetime]').first().attr('datetime'),
  )
  const headings = $('h1, h2, h3')
    .map((_index, element) => normalizeEvidenceText($(element).text()))
    .get()
    .filter(Boolean)
    .slice(0, 40)
  return normalizePlainEvidence({
    originalUrl: input.originalUrl,
    canonicalUrl: input.finalUrl.toString(),
    title,
    publisher,
    author,
    publishedAt,
    fetchedAt: input.now,
    locale: input.locale,
    contentType: input.contentType,
    headings,
    text: normalizedText,
    method: 'DIRECT',
    options: input.options,
  })
}

function normalizeAiDailyExternalEvidence(input: {
  originalUrl: string
  payload: AiDailyExternalEvidencePayload
  method: 'FIRECRAWL' | 'TAVILY'
  now: Date
  locale: string
  options: AiDailySafeFetchOptions
}) {
  const canonicalUrl = validateAiDailyTargetUrl(input.payload.canonicalUrl || input.originalUrl).toString()
  return normalizePlainEvidence({
    originalUrl: input.originalUrl,
    canonicalUrl,
    title: input.payload.title,
    publisher: input.payload.publisher || new URL(canonicalUrl).hostname,
    author: input.payload.author ?? null,
    publishedAt: readPublishedDate(input.payload.publishedAt),
    fetchedAt: input.now,
    locale: input.payload.locale || input.locale,
    contentType: normalizeContentType(input.payload.contentType || 'text/html'),
    headings: input.payload.headings ?? [],
    text: input.payload.text,
    method: input.method,
    options: input.options,
  })
}

function normalizePlainEvidence(input: {
  originalUrl: string
  canonicalUrl: string
  title: string
  publisher: string
  author: string | null
  publishedAt: Date | null
  fetchedAt: Date
  locale: string
  contentType: string
  headings: string[]
  text: string
  method: AiDailyEvidenceDocumentInput['extractionMethod']
  options: AiDailySafeFetchOptions
}): AiDailyEvidenceDocumentInput {
  const normalizedText = truncateUtf8(normalizeEvidenceText(input.text), input.options.maxEvidenceBytes)
  if (!normalizedText) throw new AiDailyFetchError('fetch_empty')
  const normalizedBytes = Buffer.byteLength(normalizedText)
  return {
    extractionMethod: input.method,
    originalUrl: validateAiDailyTargetUrl(input.originalUrl).toString(),
    canonicalUrl: validateAiDailyTargetUrl(input.canonicalUrl).toString(),
    title: truncateUtf8(normalizeEvidenceText(input.title), 300),
    publisher: truncateUtf8(normalizeEvidenceText(input.publisher), 200),
    author: input.author ? truncateUtf8(normalizeEvidenceText(input.author), 160) || null : null,
    publishedAt: input.publishedAt,
    fetchedAt: input.fetchedAt,
    locale: normalizeLocale(input.locale),
    contentType: input.contentType,
    contentHash: createAiDailyContentHash(normalizedText),
    headings: input.headings.map(normalizeEvidenceText).filter(Boolean).slice(0, 40),
    normalizedText,
    excerpt: truncateUtf8(normalizedText, 1024),
    normalizedBytes,
    status: normalizedBytes >= 300 ? 'READY' : 'THIN',
    expiresAt: new Date(input.fetchedAt.getTime() + input.options.retentionDays * 86_400_000),
  }
}

function decodeAiDailyBody(response: AiDailyHttpResponse, maxDecodedBytes: number) {
  const encoding = (response.headers['content-encoding'] ?? '').toLowerCase().trim()
  try {
    const options = { maxOutputLength: maxDecodedBytes }
    const decoded =
      encoding === 'gzip'
        ? gunzipSync(response.body, options)
        : encoding === 'deflate'
          ? inflateSync(response.body, options)
          : encoding === 'br'
            ? brotliDecompressSync(response.body, options)
            : response.body
    if (decoded.length > maxDecodedBytes) throw new AiDailyFetchError('evidence_rejected')
    return decoded
  } catch (error) {
    if (error instanceof AiDailyFetchError) throw error
    throw new AiDailyFetchError('evidence_rejected')
  }
}

function shouldTryExternalExtractor(error: unknown) {
  return error instanceof AiDailyFetchError && ['render_required', 'fetch_empty', 'invalid_response', 'timeout', 'network_error'].includes(error.category)
}

function normalizeExternalExtractorError(error: unknown) {
  return error instanceof AiDailyFetchError || error instanceof AiDailyAdapterError
    ? error
    : new AiDailyFetchError('invalid_response')
}

function isUnsafeHostname(value: string) {
  const hostname = value.toLowerCase().replace(/\.$/u, '')
  return (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.home') ||
    hostname.endsWith('.invalid') ||
    hostname.endsWith('.test')
  )
}

function isAllowedEvidenceContentType(value: string) {
  return [
    'text/html',
    'application/xhtml+xml',
    'application/xml',
    'text/xml',
    'text/plain',
    'application/json',
    'application/rss+xml',
    'application/atom+xml',
  ].includes(value)
}

function normalizeContentType(value: string | undefined) {
  return (value ?? '').split(';')[0]?.trim().toLowerCase() || 'application/octet-stream'
}

function readCharset(value: string | undefined): BufferEncoding {
  const charset = /charset=([^;\s]+)/iu.exec(value ?? '')?.[1]?.toLowerCase()
  return charset === 'latin1' || charset === 'ascii' || charset === 'utf8' || charset === 'utf-8'
    ? charset === 'utf-8'
      ? 'utf8'
      : charset
    : 'utf8'
}

function readMeta(
  $: ReturnType<typeof load>,
  attribute: 'name' | 'property',
  value: string,
) {
  return normalizeEvidenceText($(`meta[${attribute}="${value}"]`).first().attr('content') ?? '')
}

function readPublishedDate(value: unknown) {
  if (typeof value !== 'string' || value.length > 80) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeLocale(value: string) {
  const locale = value.trim().replace(/_/gu, '-')
  return /^[a-z]{2,3}(?:-[A-Z]{2})?$/u.test(locale) ? locale : 'zh'
}

function normalizeEvidenceText(value: string) {
  return value.normalize('NFKC').replace(/\u00a0/gu, ' ').replace(/\s+/gu, ' ').trim()
}

function truncateUtf8(value: string, maxBytes: number) {
  if (Buffer.byteLength(value) <= maxBytes) return value
  let end = Math.min(value.length, maxBytes)
  while (end > 0 && Buffer.byteLength(value.slice(0, end)) > maxBytes) end -= 1
  return value.slice(0, end).trim()
}

function normalizeHeaders(headers: import('node:http').IncomingHttpHeaders) {
  const output: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') output[key.toLowerCase()] = value
    else if (Array.isArray(value)) output[key.toLowerCase()] = value.join(', ')
  }
  return output
}
