import cors from 'cors'
import express from 'express'
import { env, hasDatabase } from './env.js'
import { safeEqualHash, sha256 } from './crypto.js'
import { getPrisma, getStudioPrisma } from './db.js'
import { hasConfiguredModelChannel } from './model.js'
import { createMetricsMiddleware, renderPrometheusMetrics } from './metrics.js'
import {
  loadAiDailyOperationsSnapshot,
  renderAiDailyOperationsPrometheus,
  toAiDailyOperationsDiagnostics,
} from './aiDailyOperations.js'
import { normalizePublicAssistantPayload } from './publicAssistantAgent.js'
import {
  cancelPublicAssistantRequest,
  deletePublicAssistantSession,
  loadPublicAssistantInsights,
  loadPublicAssistantSession,
  loadPublicAssistantSessions,
  normalizePublicAssistantBranchAction,
  normalizePublicAssistantFeedback,
  normalizePublicAssistantSessionAccess,
  normalizePublicAssistantSessionList,
  savePublicAssistantFeedback,
  selectPublicAssistantBranch,
} from './publicAssistantPersistence.js'
import {
  executePublicAssistantRequest,
  PublicAssistantExecutionError,
} from './publicAssistantExecution.js'
import { consumePublicAssistantRateLimit } from './publicAssistantRateLimit.js'
import { isPublicWebSearchConfigured } from './publicWebResearch.js'
import { createRagOrchestratorRouter } from './ragRoutes.js'
import { createStudioRouter } from './studioRoutes.js'
import { createAiDailyPublicRouter } from './aiDailyPublicRoutes.js'
import { startAiDailyStudioProductionWorker } from './aiDailyStudioProduction.js'
import { startAiDailyStudioIngestionWorker } from './aiDailyStudioIngestion.js'
import type { AssistantServiceMode, ChatPayload } from './types.js'

const PUBLIC_ASSISTANT_SSE_HEARTBEAT_MS = 8_000

export function createApp(options: { publicFeedEnabled?: boolean } = {}) {
  const app = express()
  const serviceMode = env.assistantServiceMode
  const publicFeedEnabled = options.publicFeedEnabled ?? env.aiDailyPublicFeedEnabled
  app.set('trust proxy', env.trustProxy ? 1 : false)
  app.use(express.json({ limit: '1mb' }))
  if (env.metricsEnabled) app.use(createMetricsMiddleware())

  if (publicFeedEnabled && (serviceMode === 'studio' || serviceMode === 'all')) app.use(createAiDailyPublicRouter())
  app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin }))

  app.get('/metrics', async (_req, res) => {
    if (!env.metricsEnabled) {
      res.status(404).json({ error: 'metrics-disabled' })
      return
    }

    let aiDailyMetrics = ''
    if (env.aiDailyOperationsMetricsEnabled && (serviceMode === 'studio' || serviceMode === 'all')) {
      const studioPrisma = getStudioPrisma()
      if (!studioPrisma) {
        aiDailyMetrics = renderAiDailyOperationsPrometheus(null)
      } else {
        try {
          const snapshot = await loadAiDailyOperationsSnapshot(studioPrisma, new Date(), env.aiDailyPublicStaleMinutes)
          aiDailyMetrics = renderAiDailyOperationsPrometheus(toAiDailyOperationsDiagnostics(snapshot))
        } catch {
          aiDailyMetrics = renderAiDailyOperationsPrometheus(null)
        }
      }
    }

    const metrics = aiDailyMetrics ? `${renderPrometheusMetrics()}${aiDailyMetrics}\n` : renderPrometheusMetrics()
    res.type('text/plain; version=0.0.4; charset=utf-8').send(metrics)
  })

  if (serviceMode === 'rag') {
    app.use(createRagOrchestratorRouter({ requireAuth: true }))
  } else if (serviceMode === 'studio') {
    app.get('/health', (_req, res) => {
      res.json(buildStudioHealth())
    })
    app.use('/studio/api', createStudioRouter())
  } else {
    app.get('/health', (_req, res) => {
      res.json(buildAssistantHealth(serviceMode))
    })

    if (serviceMode === 'all' || serviceMode === 'public') registerPublicAssistantRoutes(app)
    if (serviceMode === 'all') app.use('/studio/api', createStudioRouter())
    if (serviceMode === 'all') app.use('/rag', createRagOrchestratorRouter({ requireAuth: false }))
  }

  if (serviceMode === 'studio' || serviceMode === 'all') {
    const studioPrisma = getStudioPrisma()
    if (studioPrisma) {
      startAiDailyStudioIngestionWorker(studioPrisma)
      if (env.aiDailyProductionGenerationEnabled) startAiDailyStudioProductionWorker(studioPrisma)
    }
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    void next
    const name = error instanceof Error ? error.name : ''
    const message = error instanceof Error ? error.message : 'unknown-error'
    if (name === 'DatabaseNotConfigured') {
      res.status(503).json({ error: message })
      return
    }
    console.error(error)
    res.status(500).json({ error: 'assistant-api-error' })
  })

  return app
}

function buildStudioHealth() {
  return {
    ok: true,
    service: 'biau-content-studio-api',
    serviceMode: 'studio',
    database: Boolean(env.studioDatabaseUrl),
    authConfigured: Boolean(env.studioAdminToken),
  }
}

function buildAssistantHealth(serviceMode: AssistantServiceMode) {
  const modelConfigured = hasConfiguredModelChannel()
  return {
    ok: true,
    service: serviceMode === 'public' ? 'biau-public-assistant-api' : 'biau-assistant-api',
    serviceMode,
    database: hasDatabase(),
    mode: modelConfigured ? 'model' : 'fallback',
    modelConfigured,
    ...(serviceMode === 'public' || serviceMode === 'all' ? { webSearchConfigured: isPublicWebSearchConfigured() } : {}),
  }
}

function registerPublicAssistantRoutes(app: express.Express) {
  app.post('/chat/public', async (req, res, next) => {
    try {
      const request = acceptPublicAssistantRequest(req, res)
      if (!request) return
      const abort = new AbortController()
      let deadlineExceeded = false
      const timeout = setTimeout(() => {
        deadlineExceeded = true
        abort.abort()
      }, env.publicAssistantRequestTimeoutMs)
      const onClose = () => {
        if (!res.writableEnded) abort.abort()
      }
      res.once('close', onClose)
      try {
        const response = await executePublicAssistantRequest(request, { signal: abort.signal })
        res.json(response)
      } catch (error) {
        if (!res.writableEnded && !res.destroyed) {
          sendPublicAssistantExecutionError(res, error, request.requestId, deadlineExceeded)
        }
      } finally {
        clearTimeout(timeout)
        res.off('close', onClose)
      }
    } catch (error) {
      next(error)
    }
  })

  app.post('/chat/public/stream', async (req, res) => {
    const request = acceptPublicAssistantRequest(req, res)
    if (!request) return

    const abort = new AbortController()
    let deadlineExceeded = false
    const timeout = setTimeout(() => {
      deadlineExceeded = true
      abort.abort()
    }, env.publicAssistantRequestTimeoutMs)
    const onDisconnect = () => {
      if (!res.writableEnded) abort.abort()
    }
    req.once('aborted', onDisconnect)
    res.once('close', onDisconnect)
    let heartbeat: ReturnType<typeof setInterval> | null = null
    const startStream = () => {
      if (res.headersSent) return
      res.status(200)
      res.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
      })
      res.flushHeaders()
      writePublicAssistantSse(res, 'ready', { version: 1, requestId: request.requestId })
      heartbeat = setInterval(() => {
        if (!res.writableEnded && !res.destroyed) res.write(': heartbeat\n\n')
      }, PUBLIC_ASSISTANT_SSE_HEARTBEAT_MS)
    }

    try {
      const response = await executePublicAssistantRequest(request, {
        signal: abort.signal,
        onExecutionStart: startStream,
        onProgress: (progress) => {
          writePublicAssistantSse(res, 'progress', progress)
        },
      })
      startStream()
      writePublicAssistantSse(res, 'result', response)
      writePublicAssistantSse(res, 'done', { ok: true, requestId: request.requestId })
      res.end()
    } catch (error) {
      if (!res.writableEnded && !res.destroyed) {
        if (!res.headersSent) {
          sendPublicAssistantExecutionError(res, error, request.requestId, deadlineExceeded)
        } else {
          const executionError = error instanceof PublicAssistantExecutionError ? error : null
          writePublicAssistantSse(res, 'error', {
            code: deadlineExceeded
              ? 'public-assistant-stream-timeout'
              : executionError?.code ?? 'public-assistant-stream-failed',
            requestId: request.requestId,
            ...(executionError?.retryAfterSeconds === null || executionError?.retryAfterSeconds === undefined
              ? {}
              : { retryAfterSeconds: executionError.retryAfterSeconds }),
          })
          res.end()
        }
      }
    } finally {
      if (heartbeat) clearInterval(heartbeat)
      clearTimeout(timeout)
      req.off('aborted', onDisconnect)
      res.off('close', onDisconnect)
    }
  })

  app.post('/chat/public/cancel', async (req, res, next) => {
    try {
      const input = normalizePublicAssistantCancellation(req.body)
      if (!input) {
        res.status(400).json({ error: 'invalid-public-assistant-cancellation' })
        return
      }
      if (!acceptPublicAssistantHistoryRequest(req, res)) return
      const result = await cancelPublicAssistantRequest(input.requestId, input.sessionId)
      if (result.status === 'database-not-configured') {
        res.status(503).json({ error: result.status, requestId: input.requestId })
        return
      }
      if (result.status === 'request-not-found') {
        res.status(404).json({ error: result.status, requestId: input.requestId })
        return
      }
      res.json({ ok: true, requestId: input.requestId, status: result.status })
    } catch (error) {
      next(error)
    }
  })

  app.post('/chat/public/feedback', async (req, res, next) => {
    try {
      const input = normalizePublicAssistantFeedback(req.body)
      if (!input) {
        res.status(400).json({ error: 'invalid-public-assistant-feedback' })
        return
      }
      const rateLimit = consumePublicAssistantRateLimit(`feedback:${req.ip ?? 'unknown'}`)
      if (!rateLimit.allowed) {
        res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
        res.status(429).json({ error: 'public-assistant-rate-limited' })
        return
      }
      const result = await savePublicAssistantFeedback(input)
      if (result.status === 'database-not-configured') {
        res.status(503).json({ error: result.status })
        return
      }
      if (result.status === 'revision-not-found') {
        res.status(404).json({ error: result.status })
        return
      }
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post('/chat/public/sessions', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store')
      const input = normalizePublicAssistantSessionList(req.body)
      if (!input) {
        res.status(400).json({ error: 'invalid-public-assistant-session-list' })
        return
      }
      if (!acceptPublicAssistantHistoryRequest(req, res)) return
      const sessions = await loadPublicAssistantSessions(input.sessionIds)
      if (!sessions) {
        res.status(503).json({ error: 'database-not-configured' })
        return
      }
      res.json({ sessions })
    } catch (error) {
      next(error)
    }
  })

  app.post('/chat/public/session', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store')
      const input = normalizePublicAssistantSessionAccess(req.body)
      if (!input) {
        res.status(400).json({ error: 'invalid-public-assistant-session' })
        return
      }
      if (!acceptPublicAssistantHistoryRequest(req, res)) return
      const result = await loadPublicAssistantSession(input.sessionId)
      if (result.status === 'database-not-configured') {
        res.status(503).json({ error: result.status })
        return
      }
      if (result.status === 'session-not-found') {
        res.status(404).json({ error: result.status })
        return
      }
      if (result.status === 'history-invalid') {
        res.status(409).json({ error: 'public-assistant-history-invalid' })
        return
      }
      res.json(toPublicAssistantHistoryResponse(result))
    } catch (error) {
      next(error)
    }
  })

  app.post('/chat/public/branch', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store')
      const input = normalizePublicAssistantBranchAction(req.body)
      if (!input) {
        res.status(400).json({ error: 'invalid-public-assistant-branch-action' })
        return
      }
      if (!acceptPublicAssistantHistoryRequest(req, res)) return
      const selected = await selectPublicAssistantBranch(input)
      if (selected.status === 'database-not-configured') {
        res.status(503).json({ error: selected.status })
        return
      }
      if (
        selected.status === 'session-not-found'
        || selected.status === 'branch-not-found'
        || selected.status === 'revision-not-found'
      ) {
        res.status(404).json({ error: selected.status })
        return
      }
      if (selected.status === 'branch-limit') {
        res.status(409).json({ error: 'public-assistant-branch-limit' })
        return
      }
      const history = await loadPublicAssistantSession(input.sessionId)
      if (history.status === 'database-not-configured') {
        res.status(503).json({ error: history.status })
        return
      }
      if (history.status === 'session-not-found') {
        res.status(404).json({ error: history.status })
        return
      }
      if (history.status === 'history-invalid') {
        res.status(409).json({ error: 'public-assistant-history-invalid' })
        return
      }
      res.json(toPublicAssistantHistoryResponse(history))
    } catch (error) {
      next(error)
    }
  })

  app.delete('/chat/public/session', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store')
      const input = normalizePublicAssistantSessionAccess(req.body)
      if (!input) {
        res.status(400).json({ error: 'invalid-public-assistant-session' })
        return
      }
      if (!acceptPublicAssistantHistoryRequest(req, res)) return
      const result = await deletePublicAssistantSession(input.sessionId)
      if (result.status === 'database-not-configured') {
        res.status(503).json({ error: result.status })
        return
      }
      if (result.status === 'session-not-found') {
        res.status(404).json({ error: result.status })
        return
      }
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.get('/operations/public-assistant/insights', async (req, res, next) => {
    try {
      if (!env.publicAssistantOperationsToken) {
        res.status(404).json({ error: 'not-found' })
        return
      }
      const token = readBearerToken(req.headers.authorization)
      if (!token || !safeEqualHash(sha256(token), sha256(env.publicAssistantOperationsToken))) {
        res.status(401).json({ error: 'public-assistant-operations-auth-required' })
        return
      }
      const insights = await loadPublicAssistantInsights(getPrisma())
      if (!insights) {
        res.status(503).json({ error: 'database-not-configured' })
        return
      }
      res.json(insights)
    } catch (error) {
      next(error)
    }
  })
}

function acceptPublicAssistantRequest(req: express.Request, res: express.Response) {
  const request = normalizePublicAssistantPayload(req.body as ChatPayload)
  if (!request) {
    res.status(400).json({ error: 'missing-message' })
    return null
  }
  const rateLimit = consumePublicAssistantRateLimit(`chat:${req.ip ?? 'unknown'}`)
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
    res.status(429).json({ error: 'public-assistant-rate-limited' })
    return null
  }
  return request
}

function acceptPublicAssistantHistoryRequest(req: express.Request, res: express.Response) {
  const rateLimit = consumePublicAssistantRateLimit(`history:${req.ip ?? 'unknown'}`)
  if (rateLimit.allowed) return true
  res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
  res.status(429).json({ error: 'public-assistant-rate-limited' })
  return false
}

function writePublicAssistantSse(res: express.Response, event: string, payload: unknown) {
  if (res.writableEnded || res.destroyed) return
  res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
}

function toPublicAssistantHistoryResponse(
  result: Extract<Awaited<ReturnType<typeof loadPublicAssistantSession>>, { status: 'loaded' }>,
) {
  return {
    session: result.session,
    branches: result.branches,
    turns: result.turns,
    hasEarlierTurns: result.hasEarlierTurns,
    revisionsTruncated: result.revisionsTruncated,
    branchesTruncated: result.branchesTruncated,
    truncated: result.truncated,
  }
}

function normalizePublicAssistantCancellation(value: unknown) {
  if (typeof value !== 'object' || value === null) return null
  const requestId = 'requestId' in value && typeof value.requestId === 'string' ? value.requestId.trim().toLowerCase() : ''
  const sessionId = 'sessionId' in value && typeof value.sessionId === 'string' ? value.sessionId.trim() : ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(requestId)) return null
  if (!/^[a-zA-Z0-9_-]{12,80}$/u.test(sessionId)) return null
  return { requestId, sessionId }
}

function sendPublicAssistantExecutionError(
  res: express.Response,
  error: unknown,
  requestId: string,
  deadlineExceeded: boolean,
) {
  const executionError = error instanceof PublicAssistantExecutionError ? error : null
  const status = deadlineExceeded ? 504 : executionError?.status ?? 503
  const code = deadlineExceeded ? 'public-assistant-request-timeout' : executionError?.code ?? 'public-assistant-generation-failed'
  const retryAfterSeconds = executionError?.retryAfterSeconds
  if (retryAfterSeconds !== null && retryAfterSeconds !== undefined) {
    res.setHeader('Retry-After', String(retryAfterSeconds))
  }
  res.status(status).json({
    error: code,
    requestId,
    ...(retryAfterSeconds === null || retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  })
}

function readBearerToken(value: string | undefined) {
  const match = value?.match(/^Bearer\s+(.+)$/iu)
  return match?.[1]?.trim() ?? ''
}
