import cors from 'cors'
import express from 'express'
import { env, hasDatabase } from './env.js'
import { safeEqualHash, sha256 } from './crypto.js'
import { getPrisma, getStudioPrisma } from './db.js'
import { hasConfiguredModelChannel, listSafeModelChannels } from './model.js'
import { createMetricsMiddleware, renderPrometheusMetrics } from './metrics.js'
import {
  loadAiDailyOperationsSnapshot,
  renderAiDailyOperationsPrometheus,
  toAiDailyOperationsDiagnostics,
} from './aiDailyOperations.js'
import { normalizePublicAssistantPayload, runPublicAssistantAgent } from './publicAssistantAgent.js'
import type { PublicAssistantProgress, PublicAssistantRequest } from './publicAssistantRuntime.js'
import {
  deletePublicAssistantSession,
  loadPublicAssistantInsights,
  loadPublicAssistantSession,
  loadPublicAssistantSessions,
  normalizePublicAssistantFeedback,
  normalizePublicAssistantSessionAccess,
  normalizePublicAssistantSessionList,
  persistPublicAssistantTurn,
  savePublicAssistantFeedback,
} from './publicAssistantPersistence.js'
import { toPublicAssistantHttpResponse } from './publicAssistantProjection.js'
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
  const defaultModelChannel = listSafeModelChannels()[0]
  const modelConfigured = hasConfiguredModelChannel()
  return {
    ok: true,
    service: serviceMode === 'public' ? 'biau-public-assistant-api' : 'biau-assistant-api',
    serviceMode,
    database: hasDatabase(),
    mode: modelConfigured ? 'model' : 'fallback',
    modelConfigured,
    model: defaultModelChannel?.configured ? defaultModelChannel.model : 'fallback',
    provider: defaultModelChannel?.configured ? defaultModelChannel.provider : 'local-public-knowledge',
    ...(serviceMode === 'public' || serviceMode === 'all' ? { webSearchConfigured: isPublicWebSearchConfigured() } : {}),
  }
}

function registerPublicAssistantRoutes(app: express.Express) {
  app.post('/chat/public', async (req, res, next) => {
    try {
      const request = acceptPublicAssistantRequest(req, res)
      if (!request) return
      const abort = new AbortController()
      const timeout = setTimeout(() => abort.abort(), env.publicAssistantRequestTimeoutMs)
      const onClose = () => {
        if (!res.writableEnded) abort.abort()
      }
      res.once('close', onClose)
      try {
        const response = await runAndPersistPublicAssistant(request, abort.signal)
        res.json(response)
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
    res.status(200)
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    })
    res.flushHeaders()
    writePublicAssistantSse(res, 'ready', { version: 1 })
    const heartbeat = setInterval(() => {
      if (!res.writableEnded && !res.destroyed) res.write(': heartbeat\n\n')
    }, PUBLIC_ASSISTANT_SSE_HEARTBEAT_MS)

    try {
      const response = await runAndPersistPublicAssistant(request, abort.signal, (progress) => {
        writePublicAssistantSse(res, 'progress', progress)
      })
      writePublicAssistantSse(res, 'result', response)
      writePublicAssistantSse(res, 'done', { ok: true })
      res.end()
    } catch {
      if (!res.writableEnded && !res.destroyed) {
        writePublicAssistantSse(res, 'error', {
          code: deadlineExceeded ? 'public-assistant-stream-timeout' : 'public-assistant-stream-failed',
        })
        res.end()
      }
    } finally {
      clearInterval(heartbeat)
      clearTimeout(timeout)
      req.off('aborted', onDisconnect)
      res.off('close', onDisconnect)
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
      if (result.status === 'turn-not-found') {
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
      res.json({ session: result.session, turns: result.turns, truncated: result.truncated })
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

type PublicAssistantRunResponse = Awaited<ReturnType<typeof runPublicAssistantAgent>>

interface PublicAssistantRunDependencies {
  runAgent: (request: PublicAssistantRequest) => Promise<PublicAssistantRunResponse>
  persistTurn: (
    request: PublicAssistantRequest,
    response: PublicAssistantRunResponse,
  ) => ReturnType<typeof persistPublicAssistantTurn>
}

const defaultPublicAssistantRunDependencies: PublicAssistantRunDependencies = {
  runAgent: runPublicAssistantAgent,
  persistTurn: persistPublicAssistantTurn,
}

export async function runAndPersistPublicAssistant(
  request: PublicAssistantRequest,
  signal: AbortSignal,
  onProgress?: (progress: PublicAssistantProgress) => void,
  dependencies: PublicAssistantRunDependencies = defaultPublicAssistantRunDependencies,
) {
  signal.throwIfAborted()
  const agentRequest = { ...request, signal, onProgress }
  const response = await dependencies.runAgent(agentRequest)
  signal.throwIfAborted()
  onProgress?.({ stage: 'saving' })
  const persisted = await dependencies.persistTurn(request, response).catch(() => null)
  if (persisted) {
    response.sessionId = persisted.sessionId
    response.messageId = persisted.turnId
  }
  return toPublicAssistantHttpResponse(response)
}

function writePublicAssistantSse(res: express.Response, event: string, payload: unknown) {
  if (res.writableEnded || res.destroyed) return
  res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
}

function readBearerToken(value: string | undefined) {
  const match = value?.match(/^Bearer\s+(.+)$/iu)
  return match?.[1]?.trim() ?? ''
}
