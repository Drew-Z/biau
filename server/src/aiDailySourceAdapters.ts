import { load } from 'cheerio'
import { XMLParser } from 'fast-xml-parser'
import {
  type AiDailyCandidateLeadInput,
  type AiDailyCollectionWindow,
  type AiDailySourceFeedDefinition,
} from './aiDailyIngestion.js'

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
})

export function collectAiDailySourcePayload(input: {
  feed: AiDailySourceFeedDefinition
  payload: unknown
  window: AiDailyCollectionWindow
}): AiDailyCandidateLeadInput[] {
  const { feed, payload, window } = input
  switch (feed.kind) {
    case 'RSS':
      return parseSyndicationPayload(feed, payload, window, 'rss')
    case 'GITHUB_RELEASES':
      return parseSyndicationPayload(feed, payload, window, 'github-release')
    case 'OFFICIAL_PAGE':
      return parseOfficialPagePayload(feed, payload, window)
    case 'HACKER_NEWS':
      return parseHackerNewsPayload(feed, payload, window)
    case 'API':
      return parseGenericApiPayload(feed, payload, window)
    case 'MANUAL':
      return parseManualPayload(feed, payload, window)
    case 'SEARCH':
      return []
  }
}

function parseSyndicationPayload(
  feed: AiDailySourceFeedDefinition,
  payload: unknown,
  window: AiDailyCollectionWindow,
  providerKind: string,
) {
  if (typeof payload !== 'string' || payload.length > 2_000_000) return []
  let parsed: unknown
  try {
    parsed = xmlParser.parse(payload)
  } catch {
    return []
  }
  const record = asRecord(parsed)
  const rssChannel = asRecord(asRecord(record.rss).channel)
  const feedRecord = asRecord(record.feed)
  const items = rssChannel.item
    ? asArray(rssChannel.item)
    : asArray(feedRecord.entry)
  const publisher = readText(rssChannel.title) || readText(feedRecord.title) || feed.name
  const results: AiDailyCandidateLeadInput[] = []
  items.forEach((item, index) => {
    const entry = asRecord(item)
    const url = readSyndicationLink(entry.link)
    const originalUrl = resolvePublicUrl(url, feed.canonicalUrl)
    const title = readText(entry.title)
    const publishedAt = readDate(entry.pubDate ?? entry.published ?? entry.updated ?? entry.date)
    if (!originalUrl || !title || !insideWindow(publishedAt, window)) return
    results.push({
      providerKind,
      providerRole: 'stable',
      sourceExternalId: readText(entry.guid ?? entry.id) || null,
      observationKey: readText(entry.guid ?? entry.id) || `entry-${index}`,
      observedAt: window.scheduledAt,
      originalUrl,
      title,
      publisher,
      publishedAt,
      locale: feed.locale,
      sourceTier: feed.tier,
      topics: feed.topics,
      leadOnly: feed.tier === 'TIER_3',
      snippet: readText(entry.description ?? entry.summary ?? entry.content) || null,
    })
  })
  return results
}

function parseOfficialPagePayload(
  feed: AiDailySourceFeedDefinition,
  payload: unknown,
  window: AiDailyCollectionWindow,
) {
  if (typeof payload !== 'string' || payload.length > 4_000_000) return []
  const $ = load(payload)
  const pagePublisher =
    readCheerioMeta($, 'property', 'og:site_name') ||
    readCheerioMeta($, 'name', 'application-name') ||
    feed.name
  const results: AiDailyCandidateLeadInput[] = []
  const seen = new Set<string>()
  $('article a[href], main a[href], [role="main"] a[href], a[rel="bookmark"][href]').each((index, element) => {
    const href = $(element).attr('href') ?? ''
    const originalUrl = resolvePublicUrl(href, feed.canonicalUrl)
    if (!originalUrl || seen.has(originalUrl) || !matchesOfficialDomain(originalUrl, feed)) return
    const title = normalizeText($(element).attr('title') || $(element).text())
    if (!title || title.length > 300) return
    const timeValue = $(element).closest('article').find('time[datetime]').first().attr('datetime')
    const publishedAt = readDate(timeValue)
    if (!insideWindow(publishedAt, window)) return
    seen.add(originalUrl)
    results.push({
      providerKind: 'official-page',
      providerRole: 'stable',
      sourceExternalId: null,
      observationKey: `link-${index}`,
      observedAt: window.scheduledAt,
      originalUrl,
      title,
      publisher: pagePublisher,
      publishedAt,
      locale: feed.locale,
      sourceTier: feed.tier,
      topics: feed.topics,
      leadOnly: false,
      snippet: normalizeText($(element).closest('article').find('p').first().text()) || null,
    })
  })
  return results
}

function parseHackerNewsPayload(
  feed: AiDailySourceFeedDefinition,
  payload: unknown,
  window: AiDailyCollectionWindow,
) {
  const items = Array.isArray(payload) ? payload : asArray(asRecord(payload).hits ?? asRecord(payload).items)
  const results: AiDailyCandidateLeadInput[] = []
  for (const value of items) {
    const item = asRecord(value)
    const id = readText(item.objectID ?? item.id)
    const url = readText(item.url) || (id ? `https://news.ycombinator.com/item?id=${encodeURIComponent(id)}` : '')
    const title = readText(item.title ?? item.story_title)
    const publishedAt = readDate(item.created_at ?? item.time)
    if (!url || !title || !insideWindow(publishedAt, window)) continue
    results.push({
      providerKind: 'hacker-news',
      providerRole: 'stable',
      sourceExternalId: id || null,
      observationKey: id || url,
      observedAt: window.scheduledAt,
      originalUrl: url,
      title,
      publisher: 'Hacker News',
      publishedAt,
      locale: feed.locale,
      sourceTier: 'TIER_3',
      topics: feed.topics,
      leadOnly: true,
      snippet: readText(item.story_text ?? item.comment_text) || null,
    })
  }
  return results
}

function parseGenericApiPayload(
  feed: AiDailySourceFeedDefinition,
  payload: unknown,
  window: AiDailyCollectionWindow,
) {
  const items = Array.isArray(payload) ? payload : asArray(asRecord(payload).items ?? asRecord(payload).results)
  const results: AiDailyCandidateLeadInput[] = []
  items.forEach((value, index) => {
    const item = asRecord(value)
    const originalUrl = resolvePublicUrl(readText(item.url ?? item.link), feed.canonicalUrl)
    const title = readText(item.title ?? item.name)
    const publishedAt = readDate(item.publishedAt ?? item.published_at ?? item.date)
    if (!originalUrl || !title || !insideWindow(publishedAt, window)) return
    results.push({
      providerKind: 'api',
      providerRole: 'stable',
      sourceExternalId: readText(item.id) || null,
      observationKey: readText(item.id) || `item-${index}`,
      observedAt: window.scheduledAt,
      originalUrl,
      title,
      publisher: readText(item.publisher ?? item.source) || feed.name,
      publishedAt,
      locale: feed.locale,
      sourceTier: feed.tier,
      topics: feed.topics,
      leadOnly: feed.tier === 'TIER_3',
      snippet: readText(item.summary ?? item.description) || null,
    })
  })
  return results
}

function parseManualPayload(
  feed: AiDailySourceFeedDefinition,
  payload: unknown,
  window: AiDailyCollectionWindow,
) {
  const record = typeof payload === 'string' ? { url: payload } : asRecord(payload)
  const originalUrl = resolvePublicUrl(readText(record.url) || feed.url, feed.canonicalUrl)
  if (!originalUrl) return []
  return [
    {
      providerKind: 'manual',
      providerRole: 'manual' as const,
      sourceExternalId: null,
      observationKey: readText(record.observationKey) || 'manual',
      observedAt: window.scheduledAt,
      originalUrl,
      title: readText(record.title) || feed.name,
      publisher: readText(record.publisher) || feed.name,
      publishedAt: readDate(record.publishedAt),
      locale: feed.locale,
      sourceTier: feed.tier,
      topics: feed.topics,
      leadOnly: false,
      snippet: readText(record.summary) || null,
    },
  ]
}

function readSyndicationLink(value: unknown) {
  if (typeof value === 'string') return value.trim()
  const links = asArray(value)
  for (const link of links) {
    const record = asRecord(link)
    const rel = readText(record['@_rel'])
    const href = readText(record['@_href'] ?? record['#text'])
    if (href && (!rel || rel === 'alternate')) return href
  }
  return ''
}

function readCheerioMeta(
  $: ReturnType<typeof load>,
  attribute: 'name' | 'property',
  value: string,
) {
  return normalizeText($(`meta[${attribute}="${value}"]`).first().attr('content') ?? '')
}

function matchesOfficialDomain(value: string, feed: AiDailySourceFeedDefinition) {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    const official = feed.officialDomain ?? new URL(feed.canonicalUrl).hostname.toLowerCase()
    return hostname === official || hostname.endsWith(`.${official}`)
  } catch {
    return false
  }
}

function insideWindow(publishedAt: Date | null, window: AiDailyCollectionWindow) {
  if (!publishedAt) return true
  return publishedAt.getTime() >= window.windowStart.getTime() && publishedAt.getTime() <= window.windowEnd.getTime()
}

function resolvePublicUrl(value: string, base: string) {
  if (!value) return ''
  try {
    const url = new URL(value, base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

function readDate(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const milliseconds = value < 10_000_000_000 ? value * 1000 : value
    const date = new Date(milliseconds)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const text = readText(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function readText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return normalizeText(String(value))
  if (value && typeof value === 'object') return normalizeText(readText(asRecord(value)['#text']))
  return ''
}

function normalizeText(value: string) {
  return value.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ').trim()
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function asArray(value: unknown) {
  if (Array.isArray(value)) return value
  return value === undefined || value === null ? [] : [value]
}
