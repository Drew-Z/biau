import cors from 'cors'
import express from 'express'
import {
  Prisma,
  type InternalKnowledgeDocument,
  type InternalKnowledgeSyncRun,
  type OperatorMemory,
} from '@prisma/client'
import { env, hasDatabase } from './env.js'
import { sha256 } from './crypto.js'
import { hasOperatorAuth, requireDatabase, requireOperator } from './auth.js'
import { getStudioPrisma } from './db.js'
import { generateAnswer, hasConfiguredModelChannel, listSafeModelChannels, normalizeModelChannelId } from './model.js'
import { createMetricsMiddleware, renderPrometheusMetrics } from './metrics.js'
import {
  loadAiDailyOperationsSnapshot,
  renderAiDailyOperationsPrometheus,
  toAiDailyOperationsDiagnostics,
} from './aiDailyOperations.js'
import { retrievePublicAssistantContext } from './ragClient.js'
import { createRagOrchestratorRouter } from './ragRoutes.js'
import { createStudioRouter } from './studioRoutes.js'
import { createAiDailyPublicRouter } from './aiDailyPublicRoutes.js'
import { runOperatorAgent } from './agentOrchestrator.js'
import type { AssistantServiceMode, ChatPayload, ChatResponse, RagCollectionHealth, RagHealthResponse } from './types.js'

type InternalKnowledgeStatusValue = 'DRAFT' | 'REVIEWED' | 'ACTIVE' | 'ARCHIVED'
type AdminRagSyncStatus = 'COMPLETED' | 'FAILED' | 'SKIPPED'
type SanitizedAgentToolTrace = NonNullable<NonNullable<ChatResponse['meta']>['tools']>[number]
type SanitizedAgentToolArtifact = NonNullable<SanitizedAgentToolTrace['artifacts']>[number]

const ADMIN_RAG_SYNC_TIMEOUT_MS = 120000

export function createApp(options: { publicFeedEnabled?: boolean } = {}) {
  const app = express()
  const serviceMode = env.assistantServiceMode
  const publicFeedEnabled = options.publicFeedEnabled ?? env.aiDailyPublicFeedEnabled
  app.set('trust proxy', env.trustProxy && (serviceMode === 'studio' || serviceMode === 'all') ? 1 : false)
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
    if (serviceMode === 'all' || serviceMode === 'operator') registerOperatorRoutes(app)
    if (serviceMode === 'all') app.use('/studio/api', createStudioRouter())
    if (serviceMode === 'all') app.use('/rag', createRagOrchestratorRouter({ requireAuth: false }))
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    void next
    const name = error instanceof Error ? error.name : ''
    const message = error instanceof Error ? error.message : 'unknown-error'
    if (name === 'DatabaseNotConfigured') {
      res.status(503).json({ error: message })
      return
    }
    if (name === 'OperatorAuthNotConfigured') {
      res.status(503).json({ error: message })
      return
    }
    if (name === 'OperatorUnauthorized') {
      res.status(401).json({ error: message })
      return
    }
    if (name === 'OperatorForbidden') {
      res.status(403).json({ error: message })
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
    service: serviceMode === 'public' ? 'biau-public-assistant-api' : serviceMode === 'operator' ? 'biau-operator-api' : 'biau-assistant-api',
    serviceMode,
    database: hasDatabase(),
    mode: modelConfigured ? 'model' : 'fallback',
    modelConfigured,
    model: defaultModelChannel?.configured ? defaultModelChannel.model : 'fallback',
    provider: defaultModelChannel?.configured ? defaultModelChannel.provider : 'local-public-knowledge',
    ...(serviceMode === 'operator' || serviceMode === 'all' ? { operatorAuthConfigured: hasOperatorAuth() } : {}),
  }
}

function registerPublicAssistantRoutes(app: express.Express) {
  app.post('/chat/public', async (req, res, next) => {
    try {
      const { message } = req.body as ChatPayload
      const question = message?.trim()
      if (!question) {
        res.status(400).json({ error: 'missing-message' })
        return
      }

      const context = await retrievePublicAssistantContext(question)
      const citations = context.citations
      const generated = await generateAnswer(question, citations, 'public', { chunks: context.chunks })
      const response: ChatResponse = {
        answer: generated.answer,
        citations,
        meta: {
          mode: generated.mode,
          model: generated.model,
          provider: generated.provider,
          reason: generated.reason,
          diagnostic: generated.diagnostic,
          modelChannel: generated.modelChannel,
          citationCount: citations.length,
          retrieval: context.retrieval,
        },
      }
      res.json(response)
    } catch (error) {
      next(error)
    }
  })
}

function registerOperatorRoutes(app: express.Express) {
  app.get('/operator/me', async (req, res, next) => {
    try {
      const operator = requireOperator(req)
      res.json({
        operator: {
          id: operator.id,
          name: operator.name,
          role: operator.role,
          modelChannelId: operator.modelChannelId,
          modelChannel: getOperatorModelChannel(operator.modelChannelId),
        },
      })
    } catch (error) {
      next(error)
    }
  })

  app.get('/operator/sessions', async (req, res, next) => {
    try {
      const operator = requireOperator(req)

      const prisma = requireDatabase()
      const includeArchived = req.query.includeArchived === 'true'
      const sessions = await prisma.operatorSession.findMany({
        where: {
          ownerId: operator.id,
          ...(includeArchived ? {} : { archivedAt: null }),
        },
        orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
        take: 100,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })
      res.json({ sessions: sessions.map(serializeChatSession) })
    } catch (error) {
      next(error)
    }
  })

  app.post('/operator/sessions', async (req, res, next) => {
    try {
      const operator = requireOperator(req)

      const prisma = requireDatabase()
      const title = readBoundedString(req.body?.title, 60) || '新的站务会话'
      const session = await prisma.operatorSession.create({
        data: {
          ownerId: operator.id,
          title,
        },
        include: { messages: true },
      })
      res.json({ session: serializeChatSession(session) })
    } catch (error) {
      next(error)
    }
  })

  app.get('/operator/sessions/:id/messages', async (req, res, next) => {
    try {
      const operator = requireOperator(req)

      const prisma = requireDatabase()
      const session = await prisma.operatorSession.findFirst({
        where: { id: req.params.id, ownerId: operator.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })
      if (!session) {
        res.status(404).json({ error: 'session-not-found' })
        return
      }

      res.json({
        session: serializeChatSession(session),
        messages: session.messages.map(serializeChatMessage),
      })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/operator/sessions/:id', async (req, res, next) => {
    try {
      const operator = requireOperator(req)

      const prisma = requireDatabase()
      const session = await prisma.operatorSession.findFirst({ where: { id: req.params.id, ownerId: operator.id } })
      if (!session) {
        res.status(404).json({ error: 'session-not-found' })
        return
      }

      const title = req.body?.title === undefined ? undefined : readBoundedString(req.body?.title, 60)
      if (req.body?.title !== undefined && !title) {
        res.status(400).json({ error: 'missing-title' })
        return
      }

      const data: Prisma.OperatorSessionUpdateInput = {}
      if (title) data.title = title
      if (typeof req.body?.archived === 'boolean') data.archivedAt = req.body.archived ? new Date() : null

      const updated = await prisma.operatorSession.update({
        where: { id: session.id },
        data,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })
      res.json({ session: serializeChatSession(updated) })
    } catch (error) {
      next(error)
    }
  })

  app.get('/operator/memories', async (req, res, next) => {
    try {
      const operator = requireOperator(req)

      const prisma = requireDatabase()
      const includeArchived = req.query.includeArchived === 'true'
      const memories = await prisma.operatorMemory.findMany({
        where: {
          ownerId: operator.id,
          ...(includeArchived ? {} : { status: 'ACTIVE' }),
        },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        take: 100,
      })
      res.json({ memories: memories.map(serializeAgentMemory) })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/operator/memories/:id', async (req, res, next) => {
    try {
      const operator = requireOperator(req)
      if (typeof req.body?.archived !== 'boolean') {
        res.status(400).json({ error: 'invalid-memory-action' })
        return
      }

      const prisma = requireDatabase()
      const memory = await prisma.operatorMemory.findFirst({
        where: { id: req.params.id, ownerId: operator.id },
      })
      if (!memory) {
        res.status(404).json({ error: 'memory-not-found' })
        return
      }

      const archived = req.body.archived
      const updated = await prisma.operatorMemory.update({
        where: { id: memory.id },
        data: {
          status: archived ? 'ARCHIVED' : 'ACTIVE',
          archivedAt: archived ? new Date() : null,
        },
      })
      res.json({ memory: serializeAgentMemory(updated) })
    } catch (error) {
      next(error)
    }
  })

  app.post('/operator/chat', async (req, res, next) => {
    try {
      const operator = requireOperator(req)

      const { message, sessionId } = req.body as ChatPayload
      const question = message?.trim()
      if (!question) {
        res.status(400).json({ error: 'missing-message' })
        return
      }

      const prisma = requireDatabase()
      const now = new Date()
      const session = sessionId ? await prisma.operatorSession.findFirst({ where: { id: sessionId, ownerId: operator.id } }) : null
      if (sessionId && !session) {
        res.status(404).json({ error: 'session-not-found' })
        return
      }

      const activeSession =
        session ??
        (await prisma.operatorSession.create({
          data: {
            ownerId: operator.id,
            title: question.slice(0, 36),
            lastMessageAt: now,
          },
        }))

      const sourceMessage = await prisma.operatorMessage.create({
        data: {
          ownerId: operator.id,
          sessionId: activeSession.id,
          role: 'USER',
          content: question,
        },
      })

      const agentResult = await runOperatorAgent({
        question,
        operator,
        sessionId: activeSession.id,
        sourceMessageId: sourceMessage.id,
        prisma,
      })
      const citations = agentResult.citations
      const answerMeta = buildAssistantAnswerMeta(agentResult.meta)
      const reply = await prisma.operatorMessage.create({
        data: {
          ownerId: operator.id,
          sessionId: activeSession.id,
          role: 'ASSISTANT',
          content: agentResult.answer,
          citations: citations as unknown as Prisma.InputJsonValue,
          meta: answerMeta as unknown as Prisma.InputJsonValue,
        },
      })
      await prisma.operatorUsageLog.create({
        data: {
          ownerId: operator.id,
          scope: 'operator-chat',
          model: agentResult.meta.model,
          modelChannelId: agentResult.meta.modelChannel?.id ?? null,
        },
      })
      await prisma.operatorSession.update({
        where: { id: activeSession.id },
        data: { lastMessageAt: now },
      })

      res.json({
        answer: agentResult.answer,
        citations,
        meta: {
          ...answerMeta,
          diagnostic: agentResult.meta.diagnostic,
        },
        sessionId: activeSession.id,
        messageId: reply.id,
      } satisfies ChatResponse)
    } catch (error) {
      next(error)
    }
  })

  app.get('/operator/summary', async (req, res, next) => {
    try {
      const operator = requireOperator(req)

      const prisma = requireDatabase()
      const [sessions, messages, memories, usage, internalKnowledgeDocuments, lastInternalKnowledgeSync] = await Promise.all([
        prisma.operatorSession.count({ where: { ownerId: operator.id } }),
        prisma.operatorMessage.count({ where: { ownerId: operator.id } }),
        prisma.operatorMemory.count({ where: { ownerId: operator.id, status: 'ACTIVE' } }),
        prisma.operatorUsageLog.count({ where: { ownerId: operator.id } }),
        prisma.internalKnowledgeDocument.count(),
        prisma.internalKnowledgeSyncRun.findFirst({ orderBy: { startedAt: 'desc' } }),
      ])
      res.json({
        sessions,
        messages,
        memories,
        usage,
        internalKnowledgeDocuments,
        lastInternalKnowledgeSync: lastInternalKnowledgeSync ? serializeInternalKnowledgeSyncRun(lastInternalKnowledgeSync) : null,
        operator: serializeOperator(operator),
        modelChannels: listSafeModelChannels(),
      })
    } catch (error) {
      next(error)
    }
  })

  app.get('/operator/rag/status', async (req, res, next) => {
    try {
      requireOperator(req)
      res.json(await getAdminRagStatus())
    } catch (error) {
      next(error)
    }
  })

  app.post('/operator/rag/sync-public', async (req, res, next) => {
    try {
      requireOperator(req)
      res.json({ sync: await syncPublicRagKnowledge() })
    } catch (error) {
      next(error)
    }
  })

  app.get('/operator/model-channels', async (req, res, next) => {
    try {
      const operator = requireOperator(req)
      res.json({
        modelChannels: listSafeModelChannels(),
        selectedModelChannel: getOperatorModelChannel(operator.modelChannelId),
      })
    } catch (error) {
      next(error)
    }
  })

  app.get('/operator/usage', async (req, res, next) => {
    try {
      const operator = requireOperator(req)

      const prisma = requireDatabase()
      const usage = await prisma.operatorUsageLog.findMany({
        where: { ownerId: operator.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      res.json({ usage: usage.map(serializeUsageLog) })
    } catch (error) {
      next(error)
    }
  })

  app.get('/operator/knowledge-documents', async (req, res, next) => {
    try {
      requireOperator(req)

      const prisma = requireDatabase()
      const [documents, lastSyncRun] = await Promise.all([
        prisma.internalKnowledgeDocument.findMany({
          orderBy: { updatedAt: 'desc' },
          take: 100,
        }),
        prisma.internalKnowledgeSyncRun.findFirst({ orderBy: { startedAt: 'desc' } }),
      ])
      res.json({
        documents: documents.map(serializeInternalKnowledgeDocument),
        lastSyncRun: lastSyncRun ? serializeInternalKnowledgeSyncRun(lastSyncRun) : null,
      })
    } catch (error) {
      next(error)
    }
  })

  app.post('/operator/knowledge-documents', async (req, res, next) => {
    try {
      const operator = requireOperator(req)

      const payload = readInternalKnowledgePayload(req.body)
      if (!payload.title || !payload.body) {
        res.status(400).json({ error: 'missing-knowledge-document-fields' })
        return
      }

      const prisma = requireDatabase()
      const slug = payload.slug || toSlug(payload.title)
      const existing = await prisma.internalKnowledgeDocument.findUnique({ where: { slug } })
      if (existing) {
        res.status(409).json({ error: 'knowledge-slug-exists' })
        return
      }

      const document = await prisma.internalKnowledgeDocument.create({
        data: {
          slug,
          title: payload.title,
          summary: payload.summary,
          body: payload.body,
          tags: payload.tags as Prisma.InputJsonValue,
          status: payload.status,
          sourceType: payload.sourceType,
          safetyNotes: payload.safetyNotes,
          contentHash: hashInternalKnowledgeContent(payload),
          createdByOperatorId: operator.id,
        },
      })
      res.json({ document: serializeInternalKnowledgeDocument(document) })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/operator/knowledge-documents/:id', async (req, res, next) => {
    try {
      requireOperator(req)

      const prisma = requireDatabase()
      const document = await prisma.internalKnowledgeDocument.findUnique({ where: { id: req.params.id } })
      if (!document) {
        res.status(404).json({ error: 'knowledge-document-not-found' })
        return
      }

      const payload = readInternalKnowledgePayload(req.body, document)
      if (!payload.title || !payload.body) {
        res.status(400).json({ error: 'missing-knowledge-document-fields' })
        return
      }

      const slug = payload.slug || document.slug
      if (slug !== document.slug) {
        const existing = await prisma.internalKnowledgeDocument.findUnique({ where: { slug } })
        if (existing) {
          res.status(409).json({ error: 'knowledge-slug-exists' })
          return
        }
      }

      const updated = await prisma.internalKnowledgeDocument.update({
        where: { id: document.id },
        data: {
          slug,
          title: payload.title,
          summary: payload.summary,
          body: payload.body,
          tags: payload.tags as Prisma.InputJsonValue,
          status: payload.status,
          sourceType: payload.sourceType,
          safetyNotes: payload.safetyNotes,
          contentHash: hashInternalKnowledgeContent(payload),
          ...(payload.contentChanged ? { lastSyncedAt: null } : {}),
        },
      })
      res.json({ document: serializeInternalKnowledgeDocument(updated) })
    } catch (error) {
      next(error)
    }
  })

  app.post('/operator/knowledge/sync', async (req, res, next) => {
    try {
      requireOperator(req)

      const prisma = requireDatabase()
      const documents = await prisma.internalKnowledgeDocument.findMany({
        where: { status: { in: ['REVIEWED', 'ACTIVE'] } },
        orderBy: { updatedAt: 'desc' },
      })
      const syncPlan = buildInternalKnowledgeSyncDocuments(documents)
      const started = await prisma.internalKnowledgeSyncRun.create({
        data: {
          status: 'STARTED',
          documentCount: documents.length,
          chunkCount: syncPlan.chunkCount,
          issueCount: 0,
          diagnostic: {
            mode: 'started',
            scope: 'internal',
            documentCount: documents.length,
            chunkCount: syncPlan.chunkCount,
          } as Prisma.InputJsonValue,
        },
      })

      const syncResult = await syncInternalKnowledgeDocuments(syncPlan.documents)
      const finishedAt = new Date()
      const finalStatus = syncResult.accepted ? 'COMPLETED' : syncResult.status
      const updatedRun = await prisma.internalKnowledgeSyncRun.update({
        where: { id: started.id },
        data: {
          status: finalStatus,
          finishedAt,
          documentCount: documents.length,
          chunkCount: syncPlan.chunkCount,
          issueCount: syncResult.issueCount,
          diagnostic: syncResult.diagnostic as Prisma.InputJsonValue,
        },
      })

      if (syncResult.accepted && documents.length > 0) {
        await prisma.$transaction(
          documents.map((document) =>
            prisma.internalKnowledgeDocument.updateMany({
              where: {
                id: document.id,
                contentHash: document.contentHash,
                updatedAt: document.updatedAt,
              },
              data: {
                lastSyncedAt: finishedAt,
                updatedAt: document.updatedAt,
              },
            }),
          ),
        )
      }

      res.json({ syncRun: serializeInternalKnowledgeSyncRun(updatedRun), accepted: syncResult.accepted })
    } catch (error) {
      next(error)
    }
  })

}

function serializeOperator(operator: ReturnType<typeof requireOperator>) {
  return {
    id: operator.id,
    name: operator.name,
    role: operator.role,
    modelChannelId: operator.modelChannelId,
    modelChannel: getOperatorModelChannel(operator.modelChannelId),
  }
}

function serializeInternalKnowledgeDocument(
  document: Pick<
    InternalKnowledgeDocument,
    | 'id'
    | 'slug'
    | 'title'
    | 'summary'
    | 'body'
    | 'tags'
    | 'status'
    | 'sourceType'
    | 'safetyNotes'
    | 'contentHash'
    | 'lastSyncedAt'
    | 'createdAt'
    | 'updatedAt'
  >,
) {
  return {
    id: document.id,
    slug: document.slug,
    title: document.title,
    summary: document.summary,
    body: document.body,
    tags: readStringArray(document.tags),
    status: document.status,
    sourceType: document.sourceType,
    safetyNotes: document.safetyNotes ?? '',
    contentHash: document.contentHash,
    lastSyncedAt: document.lastSyncedAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  }
}

function serializeInternalKnowledgeSyncRun(
  syncRun: Pick<
    InternalKnowledgeSyncRun,
    'id' | 'status' | 'documentCount' | 'chunkCount' | 'issueCount' | 'startedAt' | 'finishedAt' | 'diagnostic'
  >,
) {
  return {
    id: syncRun.id,
    status: syncRun.status,
    documentCount: syncRun.documentCount,
    chunkCount: syncRun.chunkCount,
    issueCount: syncRun.issueCount,
    startedAt: syncRun.startedAt.toISOString(),
    finishedAt: syncRun.finishedAt?.toISOString() ?? null,
    diagnostic: sanitizeInternalSyncDiagnostic(syncRun.diagnostic),
  }
}

function serializeUsageLog(
  usage: Prisma.OperatorUsageLogGetPayload<Record<string, never>>,
) {
  const modelChannel = getOperatorModelChannel(usage.modelChannelId ?? env.operatorModelChannelId)
  return {
    id: usage.id,
    scope: usage.scope,
    model: usage.model ?? 'fallback',
    modelChannelId: usage.modelChannelId ?? null,
    modelChannel,
    tokensIn: usage.tokensIn,
    tokensOut: usage.tokensOut,
    createdAt: usage.createdAt.toISOString(),
  }
}

function readInternalKnowledgePayload(value: unknown, current?: InternalKnowledgeDocument) {
  const record = isPlainRecord(value) ? value : {}
  const title = readBoundedString(record.title ?? current?.title, 120)
  const summary = readBoundedString(record.summary ?? current?.summary, 500)
  const body = readBoundedString(record.body ?? current?.body, 20000)
  const tags = readStringArray(record.tags ?? current?.tags).slice(0, 16)
  const status = readInternalKnowledgeStatus(record.status ?? current?.status)
  const sourceType = readBoundedString(record.sourceType ?? current?.sourceType ?? 'manual', 40) || 'manual'
  const safetyNotes = readBoundedString(record.safetyNotes ?? current?.safetyNotes ?? '', 1000)
  const slug = record.slug === undefined ? current?.slug ?? '' : toSlug(String(record.slug))
  const contentChanged =
    !current ||
    title !== current.title ||
    summary !== current.summary ||
    body !== current.body ||
    JSON.stringify(tags) !== JSON.stringify(readStringArray(current.tags)) ||
    status !== current.status ||
    sourceType !== current.sourceType ||
    safetyNotes !== (current.safetyNotes ?? '')

  return {
    slug,
    title,
    summary,
    body,
    tags,
    status,
    sourceType,
    safetyNotes,
    contentChanged,
  }
}

function readInternalKnowledgeStatus(value: unknown): InternalKnowledgeStatusValue {
  if (value === 'DRAFT' || value === 'REVIEWED' || value === 'ACTIVE' || value === 'ARCHIVED') return value
  return 'DRAFT'
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .map((item) => item.slice(0, 80))
}

function toSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return normalized || `internal-knowledge-${Date.now()}`
}

function hashInternalKnowledgeContent(payload: ReturnType<typeof readInternalKnowledgePayload>) {
  return sha256(
    JSON.stringify({
      title: payload.title,
      summary: payload.summary,
      body: payload.body,
      tags: payload.tags,
      status: payload.status,
      sourceType: payload.sourceType,
      safetyNotes: payload.safetyNotes,
    }),
  )
}

function buildInternalKnowledgeSyncDocuments(documents: InternalKnowledgeDocument[]) {
  return {
    documents: documents.map((document) => ({
      id: document.id,
      slug: document.slug,
      title: document.title,
      summary: document.summary,
      body: document.body,
      tags: readStringArray(document.tags),
      status: document.status,
      sourceType: document.sourceType,
      updatedAt: document.updatedAt.toISOString(),
    })),
    chunkCount: documents.reduce((total, document) => total + countInternalKnowledgeChunks(document.body), 0),
  }
}

function countInternalKnowledgeChunks(body: string) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (paragraphs.length === 0) return 0
  return paragraphs.reduce((total, paragraph) => total + Math.max(1, Math.ceil(paragraph.length / 1200)), 0)
}

async function getAdminRagStatus() {
  const diagnosticBase = {
    mode: 'external-rag',
    configured: Boolean(env.assistantRagApiBaseUrl),
    syncConfigured: Boolean(env.ragSyncToken),
  }

  if (!env.assistantRagApiBaseUrl) {
    return {
      ok: true,
      configured: false,
      syncConfigured: Boolean(env.ragSyncToken),
      health: null,
      diagnostic: { ...diagnosticBase, reason: 'rag-sync-not-configured' },
    }
  }

  try {
    const response = await fetch(`${env.assistantRagApiBaseUrl.replace(/\/+$/, '')}/health`, {
      signal: AbortSignal.timeout(10000),
    })
    const payload = (await response.json().catch(() => null)) as unknown
    if (!response.ok) {
      return {
        ok: true,
        configured: true,
        syncConfigured: Boolean(env.ragSyncToken),
        health: null,
        diagnostic: { ...diagnosticBase, reason: 'http_status', httpStatus: response.status },
      }
    }

    return {
      ok: true,
      configured: true,
      syncConfigured: Boolean(env.ragSyncToken),
      health: normalizeRagHealth(payload),
      diagnostic: { ...diagnosticBase, reason: 'ok' },
    }
  } catch (error) {
    return {
      ok: true,
      configured: true,
      syncConfigured: Boolean(env.ragSyncToken),
      health: null,
      diagnostic: {
        ...diagnosticBase,
        reason: error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'network_error',
      },
    }
  }
}

async function syncPublicRagKnowledge() {
  const diagnosticBase = {
    mode: 'external-rag',
    scope: 'public',
    documentCount: 0,
    chunkCount: 0,
  }

  if (!env.assistantRagApiBaseUrl || !env.ragSyncToken) {
    return {
      accepted: false,
      status: 'SKIPPED' as AdminRagSyncStatus,
      issueCount: 0,
      health: null,
      diagnostic: { ...diagnosticBase, reason: 'rag-sync-not-configured' },
    }
  }

  try {
    const response = await fetch(`${env.assistantRagApiBaseUrl.replace(/\/+$/, '')}/v1/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.ragSyncToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scope: 'public' }),
      signal: AbortSignal.timeout(ADMIN_RAG_SYNC_TIMEOUT_MS),
    })
    const payload = (await response.json().catch(() => ({}))) as unknown
    if (!response.ok) {
      return {
        accepted: false,
        status: 'FAILED' as AdminRagSyncStatus,
        issueCount: 1,
        health: null,
        diagnostic: { ...diagnosticBase, reason: 'http_status', httpStatus: response.status, issueCount: 1 },
      }
    }

    const accepted = isPlainRecord(payload) && payload.accepted === true
    const mode = isPlainRecord(payload) && typeof payload.mode === 'string' ? payload.mode : 'external-rag'
    const scope = isPlainRecord(payload) && typeof payload.scope === 'string' ? payload.scope : 'public'
    const diagnostic = sanitizeRagSyncDiagnostic(isPlainRecord(payload) ? payload.diagnostics : null)
    const issueCount = typeof diagnostic.issueCount === 'number' ? diagnostic.issueCount : accepted ? 0 : 1
    return {
      accepted,
      status: accepted ? ('COMPLETED' as AdminRagSyncStatus) : mode === 'local-readonly' ? ('SKIPPED' as AdminRagSyncStatus) : ('FAILED' as AdminRagSyncStatus),
      issueCount,
      health: normalizeRagHealth(isPlainRecord(payload) ? payload.health : null),
      diagnostic: { ...diagnosticBase, ...diagnostic, mode, scope, accepted, issueCount },
    }
  } catch (error) {
    return {
      accepted: false,
      status: 'FAILED' as AdminRagSyncStatus,
      issueCount: 1,
      health: null,
      diagnostic: {
        ...diagnosticBase,
        reason: error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'network_error',
        issueCount: 1,
      },
    }
  }
}

async function syncInternalKnowledgeDocuments(documents: ReturnType<typeof buildInternalKnowledgeSyncDocuments>['documents']) {
  const diagnosticBase = {
    scope: 'internal',
    documentCount: documents.length,
    chunkCount: documents.reduce((total, document) => total + countInternalKnowledgeChunks(document.body), 0),
  }

  if (documents.length === 0) {
    return {
      accepted: false,
      status: 'SKIPPED' as const,
      issueCount: 0,
      diagnostic: { ...diagnosticBase, mode: 'local-planned', reason: 'no-reviewed-internal-documents' },
    }
  }

  if (!env.assistantRagApiBaseUrl || !env.ragSyncToken) {
    return {
      accepted: false,
      status: 'SKIPPED' as const,
      issueCount: 0,
      diagnostic: { ...diagnosticBase, mode: 'local-planned', reason: 'rag-sync-not-configured' },
    }
  }

  try {
    const endpoint = `${env.assistantRagApiBaseUrl.replace(/\/+$/, '')}/v1/sync`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.ragSyncToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scope: 'internal', documents }),
      signal: AbortSignal.timeout(ADMIN_RAG_SYNC_TIMEOUT_MS),
    })
    const payload = (await response.json().catch(() => ({}))) as unknown
    if (!response.ok) {
      return {
        accepted: false,
        status: 'FAILED' as const,
        issueCount: 1,
        diagnostic: { ...diagnosticBase, mode: 'external-rag', reason: 'http_status', httpStatus: response.status },
      }
    }
    const accepted = isPlainRecord(payload) && payload.accepted === true
    const mode = isPlainRecord(payload) && typeof payload.mode === 'string' ? payload.mode : 'external-rag'
    const scope = isPlainRecord(payload) && typeof payload.scope === 'string' ? payload.scope : 'internal'
    const diagnostics = sanitizeRagSyncDiagnostic(isPlainRecord(payload) ? payload.diagnostics : null)
    const payloadIssueCount = typeof diagnostics.issueCount === 'number' && Number.isFinite(diagnostics.issueCount) ? diagnostics.issueCount : 0
    const issueCount = accepted ? payloadIssueCount : Math.max(1, payloadIssueCount)
    return {
      accepted,
      status: accepted ? ('COMPLETED' as const) : mode === 'local-readonly' ? ('SKIPPED' as const) : ('FAILED' as const),
      issueCount,
      diagnostic: { ...diagnosticBase, ...diagnostics, mode, scope, accepted, issueCount },
    }
  } catch (error) {
    return {
      accepted: false,
      status: 'FAILED' as const,
      issueCount: 1,
      diagnostic: {
        ...diagnosticBase,
        mode: 'external-rag',
        reason: error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'network_error',
      },
    }
  }
}

function normalizeRagHealth(value: unknown): RagHealthResponse | null {
  if (!isPlainRecord(value)) return null
  const {
    ok,
    service,
    store,
    vectorReady,
    keywordReady,
    rerankerReady,
    lastSyncAt,
    documentCount,
    chunkCount,
    entityCount,
    relationCount,
    collections,
  } = value
  if (
    ok !== true ||
    service !== 'biau-rag-orchestrator' ||
    typeof store !== 'string' ||
    typeof vectorReady !== 'boolean' ||
    typeof keywordReady !== 'boolean' ||
    typeof rerankerReady !== 'boolean' ||
    (typeof lastSyncAt !== 'string' && lastSyncAt !== null) ||
    typeof documentCount !== 'number' ||
    typeof chunkCount !== 'number' ||
    typeof entityCount !== 'number' ||
    typeof relationCount !== 'number'
  ) {
    return null
  }

  return {
    ok,
    service,
    store,
    vectorReady,
    keywordReady,
    rerankerReady,
    lastSyncAt,
    documentCount,
    chunkCount,
    entityCount,
    relationCount,
    collections: normalizeRagCollections(collections),
  }
}

function normalizeRagCollections(value: unknown): RagHealthResponse['collections'] | undefined {
  if (!isPlainRecord(value)) return undefined
  const publicCollection = normalizeRagCollection(value.public)
  const internalCollection = normalizeRagCollection(value.internal)
  if (!publicCollection && !internalCollection) return undefined
  return {
    ...(publicCollection ? { public: publicCollection } : {}),
    ...(internalCollection ? { internal: internalCollection } : {}),
  }
}

function normalizeRagCollection(value: unknown): RagCollectionHealth | null {
  if (!isPlainRecord(value)) return null
  const { name, scope, pointCount, vectorReady } = value
  if (
    typeof name !== 'string' ||
    (scope !== 'public' && scope !== 'internal') ||
    typeof pointCount !== 'number' ||
    typeof vectorReady !== 'boolean'
  ) {
    return null
  }
  return { name, scope, pointCount, vectorReady }
}

function sanitizeRagSyncDiagnostic(value: unknown) {
  if (!isPlainRecord(value)) return {}
  const result: Record<string, string | number | boolean> = {}
  for (const key of [
    'mode',
    'scope',
    'reason',
    'accepted',
    'documentCount',
    'chunkCount',
    'entityCount',
    'relationCount',
    'issueCount',
    'httpStatus',
    'expectedDimension',
    'actualDimension',
    'providerStep',
    'errorKind',
    'attemptedEndpoints',
    'timeoutMs',
    'sourceName',
    'sourceChecksum',
    'cleanupStatus',
    'cleanupReason',
    'cleanupProviderStep',
    'cleanupErrorKind',
    'cleanupHttpStatus',
    'cleanupTimeoutMs',
    'cleanupScannedPointCount',
    'cleanupStalePointCount',
    'cleanupDeletedPointCount',
    'cleanupIssueCount',
  ]) {
    if (typeof value[key] === 'string' || typeof value[key] === 'number' || typeof value[key] === 'boolean') {
      result[key] = value[key]
    }
  }
  return result
}

function sanitizeInternalSyncDiagnostic(value: unknown) {
  if (!isPlainRecord(value)) return null
  const result: Record<string, unknown> = {}
  for (const key of [
    'mode',
    'scope',
    'reason',
    'accepted',
    'documentCount',
    'chunkCount',
    'entityCount',
    'relationCount',
    'issueCount',
    'httpStatus',
    'expectedDimension',
    'actualDimension',
    'providerStep',
    'errorKind',
    'attemptedEndpoints',
    'timeoutMs',
    'sourceName',
    'sourceChecksum',
    'cleanupStatus',
    'cleanupReason',
    'cleanupProviderStep',
    'cleanupErrorKind',
    'cleanupHttpStatus',
    'cleanupTimeoutMs',
    'cleanupScannedPointCount',
    'cleanupStalePointCount',
    'cleanupDeletedPointCount',
    'cleanupIssueCount',
  ]) {
    if (typeof value[key] === 'string' || typeof value[key] === 'number' || typeof value[key] === 'boolean') {
      result[key] = value[key]
    }
  }
  return result
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function serializeAgentMemory(
  memory: Pick<
    OperatorMemory,
    'id' | 'sessionId' | 'kind' | 'title' | 'content' | 'status' | 'archivedAt' | 'createdAt' | 'updatedAt'
  >,
) {
  return {
    id: memory.id,
    sessionId: memory.sessionId,
    kind: memory.kind,
    title: memory.title,
    content: memory.content,
    status: memory.status,
    archivedAt: memory.archivedAt?.toISOString() ?? null,
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
  }
}

function serializeChatSession(
  session: {
    id: string
    title: string
    archivedAt: Date | null
    lastMessageAt: Date | null
    createdAt: Date
    updatedAt: Date
    messages?: Array<{ content: string; createdAt: Date }>
  },
) {
  const lastMessage = session.messages?.[0]
  const updatedAt = session.lastMessageAt ?? session.updatedAt
  return {
    id: session.id,
    title: session.title,
    archived: Boolean(session.archivedAt),
    archivedAt: session.archivedAt?.toISOString() ?? null,
    updatedAt: updatedAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    preview: lastMessage ? compactPreview(lastMessage.content) : '还没有消息，打开后可以开始新的站务任务。',
  }
}

function serializeChatMessage(message: {
  id: string
  role: string
  content: string
  citations: unknown
  meta?: unknown
  createdAt: Date
}) {
  const role = message.role === 'USER' ? 'user' : message.role === 'ASSISTANT' ? 'assistant' : 'assistant'
  return {
    id: message.id,
    role,
    content: message.content,
    citations: Array.isArray(message.citations) ? message.citations : [],
    meta: sanitizeAssistantAnswerMeta(message.meta),
    timestamp: message.createdAt.toISOString(),
  }
}

function buildAssistantAnswerMeta(meta: NonNullable<ChatResponse['meta']>) {
  return stripUndefinedJson({
    mode: meta.mode,
    model: meta.model,
    provider: meta.provider,
    reason: meta.reason,
    modelChannel: meta.modelChannel,
    citationCount: meta.citationCount,
    retrieval: meta.retrieval,
    intent: meta.intent,
    grounding: meta.grounding,
    agent: meta.agent,
    tools: meta.tools,
    guardrails: meta.guardrails,
    fallbackReason: meta.fallbackReason,
  } satisfies NonNullable<ChatResponse['meta']>)
}

function sanitizeAssistantAnswerMeta(value: unknown) {
  if (!isPlainRecord(value)) return null
  const mode = value.mode === 'model' || value.mode === 'fallback' ? value.mode : 'fallback'
  const model = typeof value.model === 'string' ? value.model : 'unknown'
  const reason =
    value.reason === 'not_configured' ||
    value.reason === 'provider_error' ||
    value.reason === 'empty_response' ||
    value.reason === 'no_public_context' ||
    value.reason === 'self_check_failed' ||
    value.reason === 'tool_error' ||
    value.reason === 'policy_blocked'
      ? value.reason
      : undefined

  return buildAssistantAnswerMeta({
    mode,
    model,
    provider: typeof value.provider === 'string' ? value.provider : undefined,
    reason,
    modelChannel: sanitizeModelChannelSummary(value.modelChannel),
    citationCount: typeof value.citationCount === 'number' ? value.citationCount : 0,
    retrieval: sanitizeAssistantRetrievalMeta(value.retrieval),
    intent: sanitizeAssistantAnswerIntent(value.intent),
    grounding: sanitizeAssistantGroundingMode(value.grounding),
    agent: sanitizeAgentRunMeta(value.agent),
    tools: sanitizeAgentToolTraces(value.tools),
    guardrails: sanitizeAgentGuardrails(value.guardrails),
    fallbackReason: sanitizeAssistantFallbackReason(value.fallbackReason),
  })
}

function sanitizeAssistantFallbackReason(value: unknown) {
  if (
    value === 'not_configured' ||
    value === 'provider_error' ||
    value === 'empty_response' ||
    value === 'no_public_context' ||
    value === 'self_check_failed' ||
    value === 'tool_error' ||
    value === 'policy_blocked'
  ) {
    return value
  }
  return undefined
}

function sanitizeAssistantAnswerIntent(value: unknown) {
  if (value === 'site_qa' || value === 'creative' || value === 'planning' || value === 'general') return value
  return undefined
}

function sanitizeAssistantGroundingMode(value: unknown) {
  if (value === 'strict' || value === 'background' || value === 'none') return value
  return undefined
}

function sanitizeModelChannelSummary(value: unknown) {
  if (!isPlainRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id : ''
  const label = typeof value.label === 'string' ? value.label : ''
  const provider = typeof value.provider === 'string' ? value.provider : ''
  const model = typeof value.model === 'string' ? value.model : ''
  if (!id || !label || !provider || !model) return undefined
  return {
    id,
    label,
    provider,
    model,
    configured: value.configured === true,
    isDefault: value.isDefault === true,
    isActive: value.isActive !== false,
  }
}

function sanitizeAssistantRetrievalMeta(value: unknown) {
  if (!isPlainRecord(value)) return undefined
  const sufficiency = value.sufficiency === 'enough' || value.sufficiency === 'weak' || value.sufficiency === 'none' ? value.sufficiency : 'none'
  return {
    source: typeof value.source === 'string' ? value.source : 'unknown',
    retrievalMode: typeof value.retrievalMode === 'string' ? value.retrievalMode : 'unknown',
    store: typeof value.store === 'string' ? value.store : 'unknown',
    candidateCount: typeof value.candidateCount === 'number' ? value.candidateCount : 0,
    citationCount: typeof value.citationCount === 'number' ? value.citationCount : 0,
    sufficient: value.sufficient === true,
    sufficiency,
    fallbackReason: sanitizeRagFallbackReason(value.fallbackReason),
    expandedEntityCount: typeof value.expandedEntityCount === 'number' ? value.expandedEntityCount : undefined,
    modelCalls: typeof value.modelCalls === 'number' ? value.modelCalls : undefined,
  } as NonNullable<ChatResponse['meta']>['retrieval']
}

function sanitizeAgentRunMeta(value: unknown): NonNullable<ChatResponse['meta']>['agent'] {
  if (!isPlainRecord(value)) return undefined
  const planner: NonNullable<NonNullable<ChatResponse['meta']>['agent']>['planner'] =
    value.planner === 'model' || value.planner === 'mock' || value.planner === 'fallback' ? value.planner : 'fallback'
  const status: NonNullable<NonNullable<ChatResponse['meta']>['agent']>['status'] =
    value.status === 'completed' || value.status === 'guarded' || value.status === 'degraded' || value.status === 'failed'
      ? value.status
      : 'degraded'
  const steps = Array.isArray(value.steps)
    ? value.steps.filter((step): step is NonNullable<NonNullable<ChatResponse['meta']>['agent']>['steps'][number] =>
        step === 'input_guard' ||
        step === 'plan' ||
        step === 'validate_plan' ||
        step === 'execute_tools' ||
        step === 'compose_answer' ||
        step === 'self_check' ||
        step === 'persist_trace',
      )
    : []
  return {
    mode: 'agentic-workspace' as const,
    planner,
    status,
    steps,
    toolCount: typeof value.toolCount === 'number' ? value.toolCount : 0,
    durationMs: typeof value.durationMs === 'number' ? value.durationMs : 0,
  }
}

function sanitizeAgentToolTraces(value: unknown): NonNullable<ChatResponse['meta']>['tools'] {
  if (!Array.isArray(value)) return undefined
  const traces: NonNullable<NonNullable<ChatResponse['meta']>['tools']> = []
  for (const item of value) {
    const trace = sanitizeAgentToolTrace(item)
    if (trace) traces.push(trace)
  }
  return traces.length > 0 ? traces : undefined
}

function sanitizeAgentToolTrace(value: unknown): NonNullable<NonNullable<ChatResponse['meta']>['tools']>[number] | null {
  if (!isPlainRecord(value)) return null
  const id = sanitizeAgentToolId(value.id)
  const permission = sanitizeAgentToolPermission(value.permission)
  const status = sanitizeAgentToolStatus(value.status)
  const label = typeof value.label === 'string' ? value.label : id ?? ''
  const summary = typeof value.summary === 'string' ? value.summary : ''
  if (!id || !permission || !status || !summary) return null
  return {
    id,
    label,
    permission,
    status,
    durationMs: typeof value.durationMs === 'number' ? value.durationMs : 0,
    summary,
    citationCount: typeof value.citationCount === 'number' ? value.citationCount : undefined,
    itemCount: typeof value.itemCount === 'number' ? value.itemCount : undefined,
    errorClass: value.errorClass === 'tool_error' || value.errorClass === 'policy_blocked' || value.errorClass === 'not_configured' ? value.errorClass : undefined,
    artifacts: sanitizeAgentToolArtifacts(value.artifacts),
  }
}

function sanitizeAgentToolArtifacts(value: unknown): SanitizedAgentToolTrace['artifacts'] {
  if (!Array.isArray(value)) return undefined
  const artifacts = value
    .map((item) => sanitizeAgentToolArtifact(item))
    .filter((item): item is SanitizedAgentToolArtifact => item !== null)
  return artifacts.length > 0 ? artifacts.slice(0, 4) : undefined
}

function sanitizeAgentToolArtifact(value: unknown): SanitizedAgentToolArtifact | null {
  if (!isPlainRecord(value)) return null
  if (value.kind !== 'studio-draft') return null
  const id = typeof value.id === 'string' ? value.id : ''
  const slug = typeof value.slug === 'string' ? value.slug : ''
  const title = readBoundedString(value.title, 120)
  const column = readBoundedString(value.column, 40)
  const href = sanitizeStudioDraftArtifactHref(value.href, id, slug)
  if (
    !/^[a-z0-9_-]+$/iu.test(id) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) ||
    id.length > 120 ||
    slug.length > 96 ||
    !title ||
    !column ||
    value.status !== 'review-needed' ||
    value.visibility !== 'hidden' ||
    value.reviewRequired !== true ||
    !href
  ) {
    return null
  }
  return {
    kind: 'studio-draft',
    id,
    slug,
    title,
    column,
    status: 'review-needed',
    visibility: 'hidden',
    reviewRequired: true,
    href,
  }
}

function sanitizeStudioDraftArtifactHref(
  value: unknown,
  id: string,
  slug: string,
): SanitizedAgentToolArtifact['href'] | null {
  if (value === '/studio') return '/studio'
  if (typeof value !== 'string' || !value.startsWith('/studio?')) return null

  const params = new URLSearchParams(value.slice('/studio?'.length))
  const draft = params.get('draft')
  if (!draft || draft.length > 120 || !/^[a-z0-9_-]+$/iu.test(draft)) return null
  if (draft !== id && draft !== slug) return null
  return `/studio?draft=${encodeURIComponent(draft)}`
}

function sanitizeAgentGuardrails(value: unknown): NonNullable<ChatResponse['meta']>['guardrails'] {
  if (!isPlainRecord(value)) return undefined
  const status: NonNullable<NonNullable<ChatResponse['meta']>['guardrails']>['status'] =
    value.status === 'passed' || value.status === 'warned' || value.status === 'blocked' ? value.status : 'warned'
  const citationSufficiency: NonNullable<NonNullable<ChatResponse['meta']>['guardrails']>['citationSufficiency'] =
    value.citationSufficiency === 'enough' || value.citationSufficiency === 'weak' || value.citationSufficiency === 'none'
      ? value.citationSufficiency
      : 'none'
  return {
    status,
    allowedPermissions: readAgentPermissions(value.allowedPermissions),
    blockedPermissions: readAgentPermissions(value.blockedPermissions),
    citationSufficiency,
    sensitiveOutputBlocked: value.sensitiveOutputBlocked === true,
    issues: readStringArray(value.issues).slice(0, 8),
  }
}

function sanitizeAgentToolId(value: unknown) {
  if (
    value === 'rag.retrieve' ||
    value === 'status.query' ||
    value === 'project.lookup' ||
    value === 'knowledge.search' ||
    value === 'studio.draft' ||
    value === 'memory.search' ||
    value === 'memory.write' ||
    value === 'answer.direct'
  ) {
    return value
  }
  return null
}

function sanitizeAgentToolPermission(value: unknown) {
  if (value === 'read' || value === 'draft-write' || value === 'admin-write' || value === 'external-live') return value
  return null
}

function sanitizeAgentToolStatus(value: unknown) {
  if (value === 'selected' || value === 'skipped' || value === 'completed' || value === 'failed' || value === 'blocked') return value
  return null
}

function readAgentPermissions(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is NonNullable<NonNullable<ChatResponse['meta']>['guardrails']>['allowedPermissions'][number] =>
      item === 'read' || item === 'draft-write' || item === 'admin-write' || item === 'external-live',
  )
}

function sanitizeRagFallbackReason(value: unknown) {
  if (
    value === 'not_configured' ||
    value === 'timeout' ||
    value === 'network_error' ||
    value === 'http_status' ||
    value === 'invalid_response' ||
    value === 'private-credential' ||
    value === 'no_public_context' ||
    value === null
  ) {
    return value
  }
  return undefined
}

function stripUndefinedJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function getOperatorModelChannel(modelChannelId: string | null | undefined) {
  const safeChannels = listSafeModelChannels()
  const normalized = normalizeModelChannelId(modelChannelId)
  if (!normalized) return safeChannels[0]
  return safeChannels.find((channel) => channel.id === normalized) ?? {
    id: normalized,
    label: `未知模型渠道 (${normalized})`,
    provider: 'unknown',
    model: 'fallback',
    configured: false,
    isDefault: false,
    isActive: false,
  }
}

function readBoundedString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function compactPreview(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 72 ? `${normalized.slice(0, 71)}…` : normalized
}
