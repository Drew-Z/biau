import { DAILY_INDEX_MAX_BYTES, DAILY_MARKDOWN_MAX_BYTES, decodeDailyDetail, decodeDailyIndex, type DailyEditionDetail, type DailyEditionIndex } from '../data/aiDailyEditions'

export const dailyEditionsEnabled = import.meta.env?.VITE_AI_DAILY_EDITIONS_ENABLED === 'true'
export type DailyReadResult<T> = { payload: T | null; etag: string | null; status: number; notModified: boolean }

async function read<T>(path: string, decode: (value: unknown) => T | null | Promise<T | null>, maxBytes: number, signal: AbortSignal, etag?: string | null): Promise<DailyReadResult<T>> {
  const response = await fetch(path, { signal, headers: { Accept: 'application/json', ...(etag ? { 'If-None-Match': etag } : {}) } })
  const result = { payload: null, etag: response.headers.get('etag'), status: response.status, notModified: response.status === 304 }
  if (response.status === 304 || !response.ok) return result
  const reader = response.body?.getReader()
  if (!reader) return { ...result, status: 502 }
  const decoder = new TextDecoder()
  let body = ''
  let bytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    if (bytes > maxBytes) {
      await reader.cancel()
      return { ...result, status: 502 }
    }
    body += decoder.decode(value, { stream: true })
  }
  body += decoder.decode()
  try {
    const payload = await decode(JSON.parse(body))
    return { ...result, payload, status: payload ? 200 : 502 }
  } catch { return { ...result, status: 502 } }
}

export function readDailyIndex(signal: AbortSignal, etag?: string | null) {
  return read<DailyEditionIndex>('/api/ai-daily', decodeDailyIndex, DAILY_INDEX_MAX_BYTES, signal, etag)
}
export function readDailyEdition(editionId: string, signal: AbortSignal, etag?: string | null) {
  return read<DailyEditionDetail>(`/api/ai-daily/editions/${encodeURIComponent(editionId)}`, decodeDailyDetail, DAILY_MARKDOWN_MAX_BYTES * 2, signal, etag)
}
