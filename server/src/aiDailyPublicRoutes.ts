import express from 'express'
import { requireStudioDatabase } from './db.js'
import { env } from './env.js'
import {
  buildAiDailyPublicDetailPayload,
  buildAiDailyPublicFeedPayload,
  createAiDailyPublicRateLimiter,
  createAiDailyPublicRepository,
  createPublicEtag,
  decodeAiDailyPublicCursor,
  encodeAiDailyPublicCursor,
  parsePublicFeedLimit,
  type AiDailyPublicRateLimiter,
  type AiDailyPublicRepository,
} from './aiDailyPublic.js'

interface AiDailyPublicRouterOptions {
  repository?: AiDailyPublicRepository
  now?: () => Date
  rateLimiter?: AiDailyPublicRateLimiter
  corsOrigins?: string[]
}

export function createAiDailyPublicRouter(options: AiDailyPublicRouterOptions = {}) {
  const router = express.Router()
  const now = options.now ?? (() => new Date())
  const rateLimiter = options.rateLimiter ?? createAiDailyPublicRateLimiter()
  const corsOrigins = options.corsOrigins ?? env.aiDailyPublicCorsOrigins

  router.use('/public/ai-daily', (req, res, next) => {
    const origin = req.headers.origin
    res.setHeader('Vary', 'Origin')
    if (!origin) {
      next()
      return
    }
    if (!corsOrigins.includes(origin)) {
      res.status(403).json({ error: 'ai-daily-public-origin-not-allowed' })
      return
    }
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'If-None-Match, Content-Type')
    res.setHeader('Access-Control-Max-Age', '600')
    next()
  })

  router.options('/public/ai-daily/feed', (_req, res) => res.status(204).end())
  router.options('/public/ai-daily/events/:publicId', (_req, res) => res.status(204).end())

  router.get('/public/ai-daily/feed', async (req, res, next) => {
    if (!applyRateLimit(req, res, rateLimiter, now)) return
    try {
      const limit = parsePublicFeedLimit(req.query.limit)
      const cursor = decodeAiDailyPublicCursor(req.query.cursor)
      const repository = options.repository ?? createAiDailyPublicRepository(requireStudioDatabase())
      const current = now()
      const result = await repository.list({
        limit,
        cursor,
        now: current,
        windowHours: env.aiDailyPublicWindowHours,
      })
      const lastRow = result.rows.at(-1)
      const nextCursor = result.hasMore && lastRow?.lastApprovedAt
        ? encodeAiDailyPublicCursor({ lastApprovedAt: lastRow.lastApprovedAt.toISOString(), publicId: lastRow.publicId })
        : null
      const payload = buildAiDailyPublicFeedPayload(result.rows, nextCursor, current, env.aiDailyPublicWindowHours)
      sendPublicJson(req, res, payload)
    } catch (error) {
      if (isKnownPublicInputError(error)) {
        res.status(400).json({ error: error.message })
        return
      }
      next(error)
    }
  })

  router.get('/public/ai-daily/events/:publicId', async (req, res, next) => {
    if (!applyRateLimit(req, res, rateLimiter, now)) return
    try {
      const publicId = req.params.publicId?.trim()
      if (!publicId || publicId.length > 120 || !/^[a-zA-Z0-9_-]+$/u.test(publicId)) {
        res.status(404).json({ error: 'ai-daily-public-item-not-found' })
        return
      }
      const repository = options.repository ?? createAiDailyPublicRepository(requireStudioDatabase())
      const current = now()
      const row = await repository.findByPublicId(publicId)
      if (!row) {
        res.status(404).json({ error: 'ai-daily-public-item-not-found' })
        return
      }
      if (row.lifecycleState === 'WITHDRAWN' || row.withdrawnAt) {
        res.status(410).json({ error: 'ai-daily-public-item-withdrawn' })
        return
      }
      if (
        (row.retentionUntil && row.retentionUntil.getTime() <= current.getTime()) ||
        (row.lastApprovedAt && row.lastApprovedAt.getTime() < current.getTime() - env.aiDailyPublicWindowHours * 60 * 60 * 1000)
      ) {
        res.status(410).json({ error: 'ai-daily-public-item-expired' })
        return
      }
      const payload = buildAiDailyPublicDetailPayload(row, current, env.aiDailyPublicWindowHours)
      if (!payload) {
        res.status(404).json({ error: 'ai-daily-public-item-not-found' })
        return
      }
      sendPublicJson(req, res, payload)
    } catch (error) {
      next(error)
    }
  })

  return router
}

function applyRateLimit(
  req: express.Request,
  res: express.Response,
  limiter: AiDailyPublicRateLimiter,
  now: () => Date,
) {
  const key = req.ip || req.socket.remoteAddress || 'unknown'
  const result = limiter.check(key, now().getTime())
  res.setHeader('RateLimit-Limit', String(result.limit))
  res.setHeader('RateLimit-Remaining', String(result.remaining))
  res.setHeader('RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))
  if (result.allowed) return true
  res.setHeader('Retry-After', String(Math.max(1, Math.ceil((result.resetAt - now().getTime()) / 1000))))
  res.status(429).json({ error: 'ai-daily-public-rate-limit' })
  return false
}

function sendPublicJson(req: express.Request, res: express.Response, payload: unknown) {
  const body = JSON.stringify(payload)
  const etag = createPublicEtag(payload)
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300')
  res.setHeader('ETag', etag)
  if (etagMatches(req.headers['if-none-match'], etag)) {
    res.status(304).end()
    return
  }
  res.type('application/json').send(body)
}

function etagMatches(header: string | undefined, etag: string) {
  if (!header) return false
  return header.split(',').some((candidate) => candidate.trim().replace(/^W\//u, '') === etag)
}

function isKnownPublicInputError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    ['invalid-ai-daily-public-limit', 'invalid-ai-daily-public-cursor'].includes(error.message)
  )
}
