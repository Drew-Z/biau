import { DAILY_INDEX_MAX_BYTES, DAILY_MARKDOWN_MAX_BYTES, dailySha256, decodeDailyIndex, isDailyEditionId } from '../../src/data/aiDailyEditions'
import { readBoundedTextBody } from './boundedBody'

export interface DailyEditionsEnv { AI_DAILY_EDITIONS_ENABLED?: string; AI_DAILY_CONTENT_REPOSITORY?: string }
interface Options { fetcher?: typeof fetch }

export async function readDailyEditions(request: Request, env: DailyEditionsEnv, editionId?: string, options: Options = {}) {
  const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
  if (env.AI_DAILY_EDITIONS_ENABLED !== 'true') return fail(503, 'daily-editions-disabled')
  if (editionId !== undefined && !isDailyEditionId(editionId)) return fail(404, 'daily-edition-not-found')
  const repository = env.AI_DAILY_CONTENT_REPOSITORY ?? ''
  if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/u.test(repository)) return fail(503, 'daily-editions-unconfigured')
  const fetcher = options.fetcher ?? fetch
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  // This is a fixed public repository and branch, never a caller-supplied proxy URL.
  const base = `https://raw.githubusercontent.com/${repository}/refs/heads/codex/ai-daily-content/`
  async function read(path: string, max: number) {
    // Workers supports manual/follow only. Reject 3xx via ok below, without following it.
    const response = await fetcher(`${base}${path}`, { signal: controller.signal, redirect: 'manual', headers: { Accept: 'text/plain' } })
    if (!response.ok) throw new Error('daily-upstream-unavailable')
    const body = await readBoundedTextBody(response.body, max)
    if (!body.ok) throw new Error('daily-upstream-too-large')
    return body.text
  }
  try {
    const index = decodeDailyIndex(JSON.parse(await read('index.json', DAILY_INDEX_MAX_BYTES)))
    if (!index) return fail(502, 'daily-editions-invalid')
    let payload: unknown = index
    if (editionId !== undefined) {
      const edition = index.editions.find((item) => item.editionId === editionId)
      if (!edition) return fail(404, 'daily-edition-not-found')
      const markdown = await read(edition.markdownPath, DAILY_MARKDOWN_MAX_BYTES)
      if (!markdown.trim() || await dailySha256(markdown) !== edition.contentSha256) return fail(502, 'daily-edition-invalid')
      payload = { edition, markdown }
    }
    const body = JSON.stringify(payload)
    const etag = `"${await dailySha256(body)}"`
    const headers = { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300', 'Content-Type': 'application/json; charset=utf-8', ETag: etag, 'X-Content-Type-Options': 'nosniff' }
    if (request.headers.get('If-None-Match')?.split(',').some((value) => value.trim().replace(/^W\//u, '') === etag)) return new Response(null, { status: 304, headers })
    return new Response(body, { headers })
  } catch { return fail(502, 'daily-editions-unavailable') }
  finally { clearTimeout(timeout) }
}
