/** Public edition contract shared by the publisher, Pages Function and browser. */
export const DAILY_SCHEMA_VERSION = 1
export const DAILY_MARKDOWN_MAX_BYTES = 256 * 1024
export const DAILY_INDEX_MAX_BYTES = 2 * 1024 * 1024
export const DAILY_MAX_EDITIONS = 2048
export const DAILY_STALE_MS = 18 * 60 * 60 * 1000

export interface DailySourceLink { title: string; publisher: string; url: string }
export interface DailyEdition {
  schemaVersion: 1
  editionId: string
  editionDate: string
  slot: 'morning' | 'evening'
  timezone: 'Asia/Shanghai'
  language: 'zh'
  title: string
  itemCount: number
  scheduledFor: string
  generatedAt: string
  publishedAt: string
  updatedAt: string
  windowStart: string
  windowEnd: string
  revision: number
  sourceLinks: DailySourceLink[]
  markdownPath: string
  contentSha256: string
}
export interface DailyEditionIndex { schemaVersion: 1; latestEditionId: string | null; editions: DailyEdition[] }
export interface DailyEditionDetail { edition: DailyEdition; markdown: string }

export function isDailyRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
export function isDailyEditionId(value: string) {
  return /^\d{4}-\d{2}-\d{2}-(morning|evening)$/u.test(value)
}
export function dailyPublicUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\\]/u.test(value)) return null
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/\.$/u, '')
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null
    // Public reading links only: reject literal addresses and private hostnames.
    if (!host.includes('.') || host.includes(':') || /^[\d.]+$/u.test(host) || /(?:^|\.)(localhost|local|internal|lan|home)$/u.test(host)) return null
    return url.href
  } catch { return null }
}
function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}
function iso(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u.test(value) && Number.isFinite(Date.parse(value))
}
export function decodeDailyEdition(value: unknown): DailyEdition | null {
  if (!isDailyRecord(value) || value.schemaVersion !== 1 || !text(value.editionId, 30) || !isDailyEditionId(value.editionId)) return null
  const { editionDate, slot } = value
  if (typeof editionDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(editionDate) || !['morning', 'evening'].includes(String(slot))) return null
  const date = new Date(`${editionDate}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== editionDate || value.editionId !== `${editionDate}-${slot}`) return null
  if (value.timezone !== 'Asia/Shanghai' || value.language !== 'zh' || !text(value.title, 180)) return null
  if (!Number.isSafeInteger(value.itemCount) || Number(value.itemCount) < 1 || Number(value.itemCount) > 15) return null
  if (!Number.isSafeInteger(value.revision) || Number(value.revision) < 1) return null
  const dates = ['scheduledFor', 'generatedAt', 'publishedAt', 'updatedAt', 'windowStart', 'windowEnd'] as const
  if (!dates.every((key) => iso(value[key]))) return null
  const times = Object.fromEntries(dates.map((key) => [key, Date.parse(String(value[key]))]))
  if (times.windowStart >= times.windowEnd || times.windowEnd > times.generatedAt || times.generatedAt > times.updatedAt || times.publishedAt > times.updatedAt) return null
  if (value.revision === 1 && times.generatedAt > times.publishedAt) return null
  if (times.scheduledFor !== Date.parse(`${editionDate}T${slot === 'morning' ? '08' : '20'}:00:00+08:00`)) return null
  if (!text(value.contentSha256, 64) || !/^[a-f0-9]{64}$/u.test(value.contentSha256)) return null
  if (value.markdownPath !== `editions/${value.editionId}/${value.contentSha256}.md`) return null
  if (!Array.isArray(value.sourceLinks) || value.sourceLinks.length !== value.itemCount) return null
  const sourceLinks: DailySourceLink[] = []
  for (const source of value.sourceLinks) {
    if (!isDailyRecord(source) || !text(source.title, 300) || !text(source.publisher, 160)) return null
    const url = dailyPublicUrl(source.url)
    if (!url) return null
    sourceLinks.push({ title: source.title, publisher: source.publisher, url })
  }
  return {
    schemaVersion: 1, editionId: value.editionId, editionDate, slot: slot as DailyEdition['slot'], timezone: 'Asia/Shanghai', language: 'zh',
    title: value.title, itemCount: Number(value.itemCount), revision: Number(value.revision), sourceLinks,
    scheduledFor: String(value.scheduledFor), generatedAt: String(value.generatedAt), publishedAt: String(value.publishedAt), updatedAt: String(value.updatedAt),
    windowStart: String(value.windowStart), windowEnd: String(value.windowEnd), markdownPath: String(value.markdownPath), contentSha256: value.contentSha256,
  }
}
export function decodeDailyIndex(value: unknown): DailyEditionIndex | null {
  if (!isDailyRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.editions) || value.editions.length > DAILY_MAX_EDITIONS) return null
  const editions: DailyEdition[] = []
  const ids = new Set<string>()
  for (const raw of value.editions) {
    const edition = decodeDailyEdition(raw)
    if (!edition || ids.has(edition.editionId)) return null
    if (editions.length && Date.parse(editions.at(-1)!.scheduledFor) <= Date.parse(edition.scheduledFor)) return null
    ids.add(edition.editionId)
    editions.push(edition)
  }
  if (value.latestEditionId !== (editions[0]?.editionId ?? null)) return null
  return { schemaVersion: 1, latestEditionId: editions[0]?.editionId ?? null, editions }
}
export async function dailySha256(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
export async function decodeDailyDetail(value: unknown): Promise<DailyEditionDetail | null> {
  if (!isDailyRecord(value) || !text(value.markdown, DAILY_MARKDOWN_MAX_BYTES)) return null
  if (new TextEncoder().encode(value.markdown).byteLength > DAILY_MARKDOWN_MAX_BYTES) return null
  const edition = decodeDailyEdition(value.edition)
  return edition && await dailySha256(value.markdown) === edition.contentSha256 ? { edition, markdown: value.markdown } : null
}
