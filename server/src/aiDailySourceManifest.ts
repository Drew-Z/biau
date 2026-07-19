import { readFile } from 'node:fs/promises'
import {
  aiDailySourceFeedKinds,
  aiDailySourceTiers,
  normalizeAiDailyDomain,
  normalizeAiDailyLocale,
  normalizeAiDailySourceFeedDefinition,
  type AiDailySourceFeedKindName,
  type AiDailySourceTierName,
} from './aiDailyIngestion.js'

export const aiDailySourceManifestSchemaVersion = 'ai-daily-source-curation-v1'
export const aiDailyManifestReviewStatuses = ['candidate', 'hold', 'approved', 'rejected'] as const
export type AiDailyManifestReviewStatus = (typeof aiDailyManifestReviewStatuses)[number]
export type AiDailyManifestReadiness = 'pending-human-review' | 'approved'

export interface AiDailyManifestReview {
  status: AiDailyManifestReviewStatus
  reviewedAt: string | null
  reviewedBy: string | null
  notes: string
}

export interface AiDailyCuratedSource {
  id: string
  name: string
  rationale: string
  kind: AiDailySourceFeedKindName
  url: string
  canonicalUrl: string
  canonicalKey: string
  locale: string
  tier: AiDailySourceTierName
  topics: string[]
  enabled: boolean
  intervalMinutes: number
  lookbackMinutes: number
  officialDomain: string
  review: AiDailyManifestReview
}

export interface AiDailyManifestBudget {
  maxRequests: number
  maxResults: number
  timeoutMs: number
  maxRetries: number
  maxCostUnits: number
}

export interface AiDailyCuratedQueryGroup {
  id: string
  label: string
  rationale: string
  locale: string
  queries: string[]
  includeDomains: string[]
  excludeDomains: string[]
  budget: AiDailyManifestBudget
  minimumPrimaryResults: number
  includeSignal: boolean
  enabled: boolean
  review: AiDailyManifestReview
}

export interface AiDailySourceManifest {
  schemaVersion: typeof aiDailySourceManifestSchemaVersion
  readiness: AiDailyManifestReadiness
  review: AiDailyManifestReview
  sources: AiDailyCuratedSource[]
  queryGroups: AiDailyCuratedQueryGroup[]
}

export type AiDailySourceManifestParseResult =
  | { ok: true; manifest: AiDailySourceManifest }
  | { ok: false; error: 'invalid-ai-daily-source-manifest'; issues: string[] }

const manifestUrl = new URL('../data/ai-daily-source-manifest.v1.json', import.meta.url)

export async function loadAiDailySourceManifest(): Promise<AiDailySourceManifest> {
  const text = await readFile(manifestUrl, 'utf8')
  let value: unknown
  try {
    value = JSON.parse(text) as unknown
  } catch {
    throw new Error('invalid-ai-daily-source-manifest-json')
  }
  const result = parseAiDailySourceManifest(value)
  if (!result.ok) throw new Error(`${result.error}: ${result.issues.join(', ')}`)
  return result.manifest
}

export function parseAiDailySourceManifest(value: unknown): AiDailySourceManifestParseResult {
  const issues: string[] = []
  const root = asRecord(value)
  if (!root) return invalid(['manifest-object-required'])

  if (root.schemaVersion !== aiDailySourceManifestSchemaVersion) issues.push('schema-version-invalid')
  const readiness = readEnum(root.readiness, ['pending-human-review', 'approved'] as const, 'readiness', issues)
  const review = parseReview(root.review, 'review', issues)
  const sources = parseSources(root.sources, issues)
  const queryGroups = parseQueryGroups(root.queryGroups, issues)

  if (sources && (sources.length < 30 || sources.length > 80)) issues.push('sources-count-out-of-range')
  if (queryGroups && queryGroups.length < 4) issues.push('query-groups-too-small')
  if (readiness === 'pending-human-review') {
    if (review?.status !== 'candidate') issues.push('pending-manifest-review-status-invalid')
    if (sources?.some((source) => source.enabled)) issues.push('pending-manifest-has-enabled-source')
    if (queryGroups?.some((group) => group.enabled)) issues.push('pending-manifest-has-enabled-query-group')
  }
  if (readiness === 'approved') {
    if (review?.status !== 'approved') issues.push('approved-manifest-review-status-invalid')
    if (sources?.some((source) => source.review.status === 'candidate')) {
      issues.push('approved-sources-review-incomplete')
    }
    if (sources && sources.filter((source) => source.review.status === 'approved').length < 12) {
      issues.push('approved-sources-count-too-small')
    }
    if (queryGroups?.some((group) => group.review.status === 'candidate')) {
      issues.push('approved-query-groups-review-incomplete')
    }
    if (queryGroups && queryGroups.filter((group) => group.review.status === 'approved').length < 4) {
      issues.push('approved-query-groups-count-too-small')
    }
  }
  if (!readiness || !review || !sources || !queryGroups || issues.length > 0) return invalid(issues)

  return { ok: true, manifest: { schemaVersion: aiDailySourceManifestSchemaVersion, readiness, review, sources, queryGroups } }
}

function parseSources(value: unknown, issues: string[]) {
  if (!Array.isArray(value)) {
    issues.push('sources-array-required')
    return null
  }
  const ids = new Set<string>()
  const canonicalUrls = new Set<string>()
  const sources: AiDailyCuratedSource[] = []
  value.forEach((entry, index) => {
    const path = `sources[${index}]`
    const source = asRecord(entry)
    if (!source) {
      issues.push(`${path}-object-required`)
      return
    }
    const id = readId(source.id, `${path}.id`, issues)
    const name = readText(source.name, `${path}.name`, 160, issues)
    const rationale = readText(source.rationale, `${path}.rationale`, 500, issues)
    const kind = readEnum(source.kind, aiDailySourceFeedKinds, `${path}.kind`, issues)
    const tier = readEnum(source.tier, aiDailySourceTiers, `${path}.tier`, issues)
    const url = readText(source.url, `${path}.url`, 500, issues)
    const locale = readText(source.locale, `${path}.locale`, 20, issues)
    const topics = readTextList(source.topics, `${path}.topics`, 1, 12, 80, issues)
    const officialDomain = readText(source.officialDomain, `${path}.officialDomain`, 253, issues)
    const enabled = readBoolean(source.enabled, `${path}.enabled`, issues)
    const review = parseReview(source.review, `${path}.review`, issues)
    if (!id || !name || !rationale || !kind || !tier || !url || !locale || !topics || !officialDomain || enabled === null || !review) return
    if (ids.has(id)) issues.push(`${path}.id-duplicate`)
    ids.add(id)
    if (enabled && review.status !== 'approved') issues.push(`${path}.enabled-requires-approved-review`)
    if (!isPublicHttpsUrl(url)) issues.push(`${path}.url-not-public-https`)
    if (normalizeAiDailyLocale(locale) !== locale) issues.push(`${path}.locale-not-canonical`)
    if (normalizeAiDailyDomain(officialDomain) !== officialDomain) issues.push(`${path}.official-domain-not-canonical`)
    if (tier === 'TIER_1' && !officialDomain) issues.push(`${path}.official-domain-required`)
    const normalized = normalizeAiDailySourceFeedDefinition({
      id,
      name,
      kind,
      tier,
      url,
      locale,
      topics,
      enabled,
      officialDomain,
    })
    if (!normalized.ok) {
      normalized.issues.forEach((issue) => issues.push(`${path}.feed.${issue}`))
      return
    }
    if (canonicalUrls.has(normalized.feed.canonicalUrl)) issues.push(`${path}.canonical-url-duplicate`)
    canonicalUrls.add(normalized.feed.canonicalUrl)
    sources.push({
      id,
      name,
      rationale,
      kind,
      url: normalized.feed.url,
      canonicalUrl: normalized.feed.canonicalUrl,
      canonicalKey: normalized.feed.canonicalKey,
      locale: normalized.feed.locale,
      tier,
      topics: normalized.feed.topics,
      enabled,
      intervalMinutes: normalized.feed.intervalMinutes,
      lookbackMinutes: normalized.feed.lookbackMinutes,
      officialDomain,
      review,
    })
  })
  return sources
}

function parseQueryGroups(value: unknown, issues: string[]) {
  if (!Array.isArray(value)) {
    issues.push('query-groups-array-required')
    return null
  }
  const ids = new Set<string>()
  const groups: AiDailyCuratedQueryGroup[] = []
  value.forEach((entry, index) => {
    const path = `queryGroups[${index}]`
    const group = asRecord(entry)
    if (!group) {
      issues.push(`${path}-object-required`)
      return
    }
    const id = readId(group.id, `${path}.id`, issues)
    const label = readText(group.label, `${path}.label`, 160, issues)
    const rationale = readText(group.rationale, `${path}.rationale`, 500, issues)
    const locale = readText(group.locale, `${path}.locale`, 20, issues)
    const queries = readTextList(group.queries, `${path}.queries`, 2, 8, 160, issues)
    const includeDomains = readDomainList(group.includeDomains, `${path}.includeDomains`, issues)
    const excludeDomains = readDomainList(group.excludeDomains, `${path}.excludeDomains`, issues)
    const budget = parseBudget(group.budget, `${path}.budget`, issues)
    const minimumPrimaryResults = readInteger(group.minimumPrimaryResults, `${path}.minimumPrimaryResults`, 1, 100, issues)
    const includeSignal = readBoolean(group.includeSignal, `${path}.includeSignal`, issues)
    const enabled = readBoolean(group.enabled, `${path}.enabled`, issues)
    const review = parseReview(group.review, `${path}.review`, issues)
    if (!id || !label || !rationale || !locale || !queries || !includeDomains || !excludeDomains || !budget || minimumPrimaryResults === null || includeSignal === null || enabled === null || !review) return
    if (ids.has(id)) issues.push(`${path}.id-duplicate`)
    ids.add(id)
    if (enabled && review.status !== 'approved') issues.push(`${path}.enabled-requires-approved-review`)
    if (normalizeAiDailyLocale(locale) !== locale) issues.push(`${path}.locale-not-canonical`)
    const excluded = new Set(excludeDomains)
    if (includeDomains.some((domain) => excluded.has(domain))) issues.push(`${path}.domain-in-include-and-exclude`)
    if (minimumPrimaryResults > budget.maxResults) issues.push(`${path}.minimum-primary-results-too-large`)
    groups.push({ id, label, rationale, locale, queries, includeDomains, excludeDomains, budget, minimumPrimaryResults, includeSignal, enabled, review })
  })
  return groups
}

function parseBudget(value: unknown, path: string, issues: string[]): AiDailyManifestBudget | null {
  const record = asRecord(value)
  if (!record) {
    issues.push(`${path}-object-required`)
    return null
  }
  const maxRequests = readInteger(record.maxRequests, `${path}.maxRequests`, 1, 20, issues)
  const maxResults = readInteger(record.maxResults, `${path}.maxResults`, 1, 100, issues)
  const timeoutMs = readInteger(record.timeoutMs, `${path}.timeoutMs`, 1_000, 60_000, issues)
  const maxRetries = readInteger(record.maxRetries, `${path}.maxRetries`, 0, 3, issues)
  const maxCostUnits = readInteger(record.maxCostUnits, `${path}.maxCostUnits`, 1, 100, issues)
  if (maxRequests === null || maxResults === null || timeoutMs === null || maxRetries === null || maxCostUnits === null) return null
  return { maxRequests, maxResults, timeoutMs, maxRetries, maxCostUnits }
}

function parseReview(value: unknown, path: string, issues: string[]): AiDailyManifestReview | null {
  const record = asRecord(value)
  if (!record) {
    issues.push(`${path}-object-required`)
    return null
  }
  const status = readEnum(record.status, aiDailyManifestReviewStatuses, `${path}.status`, issues)
  const reviewedAt = record.reviewedAt === null ? null : readText(record.reviewedAt, `${path}.reviewedAt`, 80, issues)
  const reviewedBy = record.reviewedBy === null ? null : readText(record.reviewedBy, `${path}.reviewedBy`, 160, issues)
  const notes = readText(record.notes, `${path}.notes`, 500, issues)
  if (!status || notes === null || reviewedAt === null && record.reviewedAt !== null || reviewedBy === null && record.reviewedBy !== null) return null
  if (reviewedAt && Number.isNaN(Date.parse(reviewedAt))) issues.push(`${path}.reviewedAt-invalid`)
  if (status === 'candidate' && (reviewedAt !== null || reviewedBy !== null)) issues.push(`${path}.candidate-needs-empty-reviewer`)
  if (status !== 'candidate' && (!reviewedAt || !reviewedBy)) issues.push(`${path}.reviewer-required`)
  return { status, reviewedAt, reviewedBy, notes }
}

function readDomainList(value: unknown, path: string, issues: string[]) {
  if (!Array.isArray(value)) {
    issues.push(`${path}-array-required`)
    return null
  }
  const domains: string[] = []
  const seen = new Set<string>()
  value.forEach((item, index) => {
    const domain = readText(item, `${path}[${index}]`, 253, issues)
    if (!domain) return
    if (normalizeAiDailyDomain(domain) !== domain) issues.push(`${path}[${index}]-not-canonical`)
    if (seen.has(domain)) issues.push(`${path}[${index}]-duplicate`)
    seen.add(domain)
    domains.push(domain)
  })
  return domains
}

function readTextList(value: unknown, path: string, minItems: number, maxItems: number, maxLength: number, issues: string[]) {
  if (!Array.isArray(value)) {
    issues.push(`${path}-array-required`)
    return null
  }
  if (value.length < minItems || value.length > maxItems) issues.push(`${path}-count-out-of-range`)
  const values: string[] = []
  const seen = new Set<string>()
  value.forEach((item, index) => {
    const text = readText(item, `${path}[${index}]`, maxLength, issues)
    if (!text) return
    if (seen.has(text)) issues.push(`${path}[${index}]-duplicate`)
    seen.add(text)
    values.push(text)
  })
  return values
}

function readId(value: unknown, path: string, issues: string[]) {
  const id = readText(value, path, 80, issues)
  if (id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) issues.push(`${path}-format-invalid`)
  return id
}

function readText(value: unknown, path: string, maxLength: number, issues: string[]) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength) {
    issues.push(`${path}-invalid`)
    return null
  }
  return value.trim()
}

function readBoolean(value: unknown, path: string, issues: string[]) {
  if (typeof value !== 'boolean') {
    issues.push(`${path}-boolean-required`)
    return null
  }
  return value
}

function readInteger(value: unknown, path: string, min: number, max: number, issues: string[]) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    issues.push(`${path}-out-of-range`)
    return null
  }
  return value
}

function readEnum<T extends readonly string[]>(value: unknown, allowed: T, path: string, issues: string[]): T[number] | null {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    issues.push(`${path}-invalid`)
    return null
  }
  return value as T[number]
}

function isPublicHttpsUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && Boolean(normalizeAiDailyDomain(parsed.hostname))
  } catch {
    return false
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function invalid(issues: string[]): AiDailySourceManifestParseResult {
  return { ok: false, error: 'invalid-ai-daily-source-manifest', issues: Array.from(new Set(issues)) }
}
