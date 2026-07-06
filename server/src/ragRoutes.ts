import express from 'express'
import { env } from './env.js'
import { getRagOrchestratorHealth, retrieveRagContext, syncRagStore } from './ragOrchestrator.js'
import type { AssistantScope, RagRetrievePayload, RagSyncPayload } from './types.js'

interface RagOrchestratorRouterOptions {
  requireAuth: boolean
}

export function createRagOrchestratorRouter(options: RagOrchestratorRouterOptions = { requireAuth: false }) {
  const router = express.Router()

  router.get('/health', async (_req, res, next) => {
    try {
      res.json(await getRagOrchestratorHealth())
    } catch (error) {
      next(error)
    }
  })

  router.post('/v1/retrieve', async (req, res, next) => {
    const payload = req.body as RagRetrievePayload
    const query = typeof payload?.query === 'string' ? payload.query.trim() : ''
    if (!query) {
      res.status(400).json({ error: 'missing-query' })
      return
    }

    const scope = payload.scope ?? 'public'
    if (!isAssistantScope(scope)) {
      res.status(400).json({ error: 'unsupported-scope' })
      return
    }

    if (!authorizeRetrieve(req.headers.authorization, scope, options.requireAuth, res)) return

    try {
      res.json(await retrieveRagContext({ ...payload, query, scope }))
    } catch (error) {
      next(error)
    }
  })

  router.post('/v1/sync', async (req, res, next) => {
    if (!authorizeSync(req.headers.authorization, options.requireAuth, res)) return

    const payload = req.body as RagSyncPayload
    if (payload?.scope !== undefined && !isAssistantScope(payload.scope)) {
      res.status(400).json({ error: 'unsupported-scope' })
      return
    }

    try {
      res.json(await syncRagStore(payload))
    } catch (error) {
      next(error)
    }
  })

  return router
}

function authorizeRetrieve(header: string | undefined, scope: AssistantScope, requireAuth: boolean, res: express.Response) {
  if (!requireAuth) return true
  const expectedKey = scope === 'public' ? env.ragPublicApiKey : env.ragInternalApiKey
  if (!expectedKey) {
    res.status(503).json({ error: 'rag-auth-not-configured' })
    return false
  }
  if (readBearerToken(header) !== expectedKey) {
    res.status(401).json({ error: 'missing-or-invalid-rag-key' })
    return false
  }
  return true
}

function authorizeSync(header: string | undefined, requireAuth: boolean, res: express.Response) {
  if (!requireAuth) return true
  if (!env.ragSyncToken) {
    res.status(503).json({ error: 'rag-sync-not-configured' })
    return false
  }
  if (readBearerToken(header) !== env.ragSyncToken) {
    res.status(401).json({ error: 'missing-or-invalid-sync-token' })
    return false
  }
  return true
}

function readBearerToken(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) return ''
  return header.slice('Bearer '.length).trim()
}

function isAssistantScope(value: unknown): value is AssistantScope {
  return value === 'public' || value === 'internal'
}
