import cors from 'cors'
import express from 'express'
import { Prisma, type InternalKnowledgeDocument, type InternalKnowledgeSyncRun, type Invite, type Member } from '@prisma/client'
import { env, hasDatabase } from './env.js'
import { sha256 } from './crypto.js'
import { issueMemberToken, readBearerMember, requireDatabase } from './auth.js'
import { generateAnswer, hasConfiguredModelChannel, listSafeModelChannels, resolveModelChannel, planAssistantAnswer } from './model.js'
import { createMetricsMiddleware, renderPrometheusMetrics } from './metrics.js'
import { retrieveAssistantContext, retrievePublicAssistantContext } from './ragClient.js'
import { createRagOrchestratorRouter } from './ragRoutes.js'
import { createStudioRouter } from './studioRoutes.js'
import type { AssistantServiceMode, ChatPayload, ChatResponse } from './types.js'

type InternalKnowledgeStatusValue = 'DRAFT' | 'REVIEWED' | 'ACTIVE' | 'ARCHIVED'

export function createApp() {
  const app = express()
  app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin }))
  app.use(express.json({ limit: '1mb' }))
  if (env.metricsEnabled) app.use(createMetricsMiddleware())
  const serviceMode = env.assistantServiceMode

  app.get('/metrics', (_req, res) => {
    if (!env.metricsEnabled) {
      res.status(404).json({ error: 'metrics-disabled' })
      return
    }

    res.type('text/plain; version=0.0.4; charset=utf-8').send(renderPrometheusMetrics())
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
    if (serviceMode === 'all' || serviceMode === 'internal') registerInternalAssistantRoutes(app)
    if (serviceMode === 'all' || serviceMode === 'internal') app.use('/studio/api', createStudioRouter())
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
    service: serviceMode === 'public' ? 'biau-public-assistant-api' : serviceMode === 'internal' ? 'biau-internal-assistant-api' : 'biau-assistant-api',
    serviceMode,
    database: hasDatabase(),
    mode: modelConfigured ? 'model' : 'fallback',
    modelConfigured,
    model: defaultModelChannel?.configured ? defaultModelChannel.model : 'fallback',
    provider: defaultModelChannel?.configured ? defaultModelChannel.provider : 'local-public-knowledge',
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

function registerInternalAssistantRoutes(app: express.Express) {
  app.get('/me', async (req, res, next) => {
    try {
      const member = await readBearerMember(req)
      if (!member) {
        res.status(401).json({ error: 'missing-or-invalid-token' })
        return
      }
      if (!isActiveMember(member)) {
        res.status(403).json({ error: 'member-disabled' })
        return
      }

      const prisma = requireDatabase()
      const updated = await prisma.member.update({
        where: { id: member.id },
        data: { lastSeenAt: new Date() },
      })
      res.json({ member: serializeMember(updated) })
    } catch (error) {
      next(error)
    }
  })

  app.post('/auth/redeem-invite', async (req, res, next) => {
    try {
      const code = String(req.body?.code ?? '').trim()
      const name = String(req.body?.name ?? '内部成员').trim().slice(0, 80)
      if (!code) {
        res.status(400).json({ error: 'missing-code' })
        return
      }

      const prisma = requireDatabase()
      const issued = issueMemberToken()
      const member = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const invite = await tx.invite.findUnique({ where: { codeHash: sha256(code) } })
        if (!invite || invite.revokedAt || invite.usedCount >= invite.maxUses || (invite.expiresAt && invite.expiresAt < new Date())) {
          return null
        }

        const claimedInvite = await tx.invite.updateMany({
          where: {
            id: invite.id,
            usedCount: { lt: invite.maxUses },
          },
          data: { usedCount: { increment: 1 } },
        })
        if (claimedInvite.count !== 1) return null

        return tx.member.create({
          data: {
            name,
            role: invite.role,
            dailyQuota: invite.dailyQuota,
            tokenHash: issued.tokenHash,
            inviteId: invite.id,
          },
        })
      })

      if (!member) {
        res.status(401).json({ error: 'invalid-invite' })
        return
      }

      res.json({
        token: issued.token,
        member: serializeMember(member),
      })
    } catch (error) {
      next(error)
    }
  })

  app.get('/chat/internal/sessions', async (req, res, next) => {
    try {
      const member = await readBearerMember(req)
      if (!member) {
        res.status(401).json({ error: 'missing-or-invalid-token' })
        return
      }
      if (!isActiveMember(member)) {
        res.status(403).json({ error: 'member-disabled' })
        return
      }

      const prisma = requireDatabase()
      const includeArchived = req.query.includeArchived === 'true'
      const sessions = await prisma.chatSession.findMany({
        where: {
          memberId: member.id,
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

  app.post('/chat/internal/sessions', async (req, res, next) => {
    try {
      const member = await readBearerMember(req)
      if (!member) {
        res.status(401).json({ error: 'missing-or-invalid-token' })
        return
      }
      if (!isActiveMember(member)) {
        res.status(403).json({ error: 'member-disabled' })
        return
      }

      const prisma = requireDatabase()
      const title = readBoundedString(req.body?.title, 60) || '新的内部会话'
      const session = await prisma.chatSession.create({
        data: {
          memberId: member.id,
          title,
        },
        include: { messages: true },
      })
      res.json({ session: serializeChatSession(session) })
    } catch (error) {
      next(error)
    }
  })

  app.get('/chat/internal/sessions/:id/messages', async (req, res, next) => {
    try {
      const member = await readBearerMember(req)
      if (!member) {
        res.status(401).json({ error: 'missing-or-invalid-token' })
        return
      }
      if (!isActiveMember(member)) {
        res.status(403).json({ error: 'member-disabled' })
        return
      }

      const prisma = requireDatabase()
      const session = await prisma.chatSession.findFirst({
        where: { id: req.params.id, memberId: member.id },
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

  app.patch('/chat/internal/sessions/:id', async (req, res, next) => {
    try {
      const member = await readBearerMember(req)
      if (!member) {
        res.status(401).json({ error: 'missing-or-invalid-token' })
        return
      }
      if (!isActiveMember(member)) {
        res.status(403).json({ error: 'member-disabled' })
        return
      }

      const prisma = requireDatabase()
      const session = await prisma.chatSession.findFirst({ where: { id: req.params.id, memberId: member.id } })
      if (!session) {
        res.status(404).json({ error: 'session-not-found' })
        return
      }

      const title = req.body?.title === undefined ? undefined : readBoundedString(req.body?.title, 60)
      if (req.body?.title !== undefined && !title) {
        res.status(400).json({ error: 'missing-title' })
        return
      }

      const data: Prisma.ChatSessionUpdateInput = {}
      if (title) data.title = title
      if (typeof req.body?.archived === 'boolean') data.archivedAt = req.body.archived ? new Date() : null

      const updated = await prisma.chatSession.update({
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

  app.post('/chat/internal', async (req, res, next) => {
    try {
      const member = await readBearerMember(req)
      if (!member) {
        res.status(401).json({ error: 'missing-or-invalid-token' })
        return
      }
      if (!isActiveMember(member)) {
        res.status(403).json({ error: 'member-disabled' })
        return
      }

      const { message, sessionId } = req.body as ChatPayload
      const question = message?.trim()
      if (!question) {
        res.status(400).json({ error: 'missing-message' })
        return
      }

      const prisma = requireDatabase()
      const now = new Date()
      const session = sessionId ? await prisma.chatSession.findFirst({ where: { id: sessionId, memberId: member.id } }) : null
      if (sessionId && !session) {
        res.status(404).json({ error: 'session-not-found' })
        return
      }

      const activeSession =
        session ??
        (await prisma.chatSession.create({
          data: {
            memberId: member.id,
            title: question.slice(0, 36),
            lastMessageAt: now,
          },
        }))

      await prisma.chatMessage.create({
        data: {
          memberId: member.id,
          sessionId: activeSession.id,
          role: 'USER',
          content: question,
        },
      })

      const answerPlan = planAssistantAnswer(question, 'internal')
      const context = answerPlan.useRetrieval ? await retrieveAssistantContext(question, 'internal') : null
      const citations = context?.citations ?? []
      const generated = await generateAnswer(question, citations, 'internal', {
        chunks: context?.chunks ?? [],
        intent: answerPlan.intent,
        grounding: answerPlan.grounding,
        modelChannelId: member.modelChannelId,
      })
      const answerMeta = buildAssistantAnswerMeta({
        mode: generated.mode,
        model: generated.model,
        provider: generated.provider,
        reason: generated.reason,
        modelChannel: generated.modelChannel,
        citationCount: citations.length,
        retrieval: context?.retrieval,
        intent: answerPlan.intent,
        grounding: answerPlan.grounding,
      })
      const reply = await prisma.chatMessage.create({
        data: {
          memberId: member.id,
          sessionId: activeSession.id,
          role: 'ASSISTANT',
          content: generated.answer,
          citations: citations as unknown as Prisma.InputJsonValue,
          meta: answerMeta as unknown as Prisma.InputJsonValue,
        },
      })
      await prisma.usageLog.create({
        data: {
          memberId: member.id,
          scope: 'internal-chat',
          model: generated.model,
        },
      })
      await prisma.member.update({
        where: { id: member.id },
        data: { lastSeenAt: now },
      })
      await prisma.chatSession.update({
        where: { id: activeSession.id },
        data: { lastMessageAt: now },
      })

      res.json({
        answer: generated.answer,
        citations,
        meta: {
          ...answerMeta,
          diagnostic: generated.diagnostic,
        },
        sessionId: activeSession.id,
        messageId: reply.id,
      } satisfies ChatResponse)
    } catch (error) {
      next(error)
    }
  })

  app.get('/admin/summary', async (req, res, next) => {
    try {
      if (!isAdminRequest(req.headers.authorization)) {
        res.status(401).json({ error: 'missing-admin-token' })
        return
      }

      const prisma = requireDatabase()
      const [members, inviteRows, messages, usage, disabledMembers, internalKnowledgeDocuments, lastInternalKnowledgeSync] = await Promise.all([
        prisma.member.count(),
        prisma.invite.findMany({
          select: {
            revokedAt: true,
            expiresAt: true,
            usedCount: true,
            maxUses: true,
          },
        }),
        prisma.chatMessage.count(),
        prisma.usageLog.count(),
        prisma.member.count({ where: { status: 'DISABLED' } }),
        prisma.internalKnowledgeDocument.count(),
        prisma.internalKnowledgeSyncRun.findFirst({ orderBy: { startedAt: 'desc' } }),
      ])
      const inviteSummary = summarizeInvites(inviteRows)
      res.json({
        members,
        invites: inviteSummary.total,
        openInvites: inviteSummary.open,
        revokedInvites: inviteSummary.revoked,
        expiredInvites: inviteSummary.expired,
        exhaustedInvites: inviteSummary.exhausted,
        messages,
        usage,
        disabledMembers,
        internalKnowledgeDocuments,
        lastInternalKnowledgeSync: lastInternalKnowledgeSync ? serializeInternalKnowledgeSyncRun(lastInternalKnowledgeSync) : null,
        modelChannels: listSafeModelChannels(),
      })
    } catch (error) {
      next(error)
    }
  })

  app.get('/admin/model-channels', async (req, res) => {
    if (!isAdminRequest(req.headers.authorization)) {
      res.status(401).json({ error: 'missing-admin-token' })
      return
    }

    res.json({ modelChannels: listSafeModelChannels() })
  })

  app.get('/admin/usage', async (req, res, next) => {
    try {
      if (!isAdminRequest(req.headers.authorization)) {
        res.status(401).json({ error: 'missing-admin-token' })
        return
      }

      const prisma = requireDatabase()
      const usage = await prisma.usageLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          member: {
            select: {
              id: true,
              name: true,
              role: true,
              status: true,
              modelChannelId: true,
            },
          },
        },
      })
      res.json({ usage: usage.map(serializeUsageLog) })
    } catch (error) {
      next(error)
    }
  })

  app.get('/admin/members', async (req, res, next) => {
    try {
      if (!isAdminRequest(req.headers.authorization)) {
        res.status(401).json({ error: 'missing-admin-token' })
        return
      }

      const prisma = requireDatabase()
      const members = await prisma.member.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      res.json({ members: members.map(serializeMember), modelChannels: listSafeModelChannels() })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/admin/members/:id', async (req, res, next) => {
    try {
      if (!isAdminRequest(req.headers.authorization)) {
        res.status(401).json({ error: 'missing-admin-token' })
        return
      }

      const prisma = requireDatabase()
      const member = await prisma.member.findUnique({ where: { id: req.params.id } })
      if (!member) {
        res.status(404).json({ error: 'member-not-found' })
        return
      }

      const assignment = readModelChannelAssignment(req.body?.modelChannelId)
      if (!assignment.ok) {
        res.status(400).json({ error: 'unsupported-model-channel' })
        return
      }

      const status = readMemberStatus(req.body?.status)
      if (req.body?.status !== undefined && !status) {
        res.status(400).json({ error: 'unsupported-member-status' })
        return
      }

      const data: Prisma.MemberUpdateInput = {}
      if (assignment.changed) data.modelChannelId = assignment.value
      if (status) {
        data.status = status
        data.disabledAt = status === 'DISABLED' ? new Date() : null
      }

      const updated = await prisma.member.update({
        where: { id: member.id },
        data,
      })
      res.json({ member: serializeMember(updated), modelChannels: listSafeModelChannels() })
    } catch (error) {
      next(error)
    }
  })

  app.get('/admin/invites', async (req, res, next) => {
    try {
      if (!isAdminRequest(req.headers.authorization)) {
        res.status(401).json({ error: 'missing-admin-token' })
        return
      }

      const prisma = requireDatabase()
      const invites = await prisma.invite.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      res.json({ invites: invites.map(serializeInvite) })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/admin/invites/:id', async (req, res, next) => {
    try {
      if (!isAdminRequest(req.headers.authorization)) {
        res.status(401).json({ error: 'missing-admin-token' })
        return
      }

      if (typeof req.body?.revoked !== 'boolean') {
        res.status(400).json({ error: 'unsupported-invite-revocation' })
        return
      }

      const prisma = requireDatabase()
      const invite = await prisma.invite.findUnique({ where: { id: req.params.id } })
      if (!invite) {
        res.status(404).json({ error: 'invite-not-found' })
        return
      }

      const updated = await prisma.invite.update({
        where: { id: invite.id },
        data: {
          revokedAt: req.body.revoked ? new Date() : null,
        },
      })
      res.json({ invite: serializeInvite(updated) })
    } catch (error) {
      next(error)
    }
  })

  app.get('/admin/knowledge-documents', async (req, res, next) => {
    try {
      if (!isAdminRequest(req.headers.authorization)) {
        res.status(401).json({ error: 'missing-admin-token' })
        return
      }

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

  app.post('/admin/knowledge-documents', async (req, res, next) => {
    try {
      if (!isAdminRequest(req.headers.authorization)) {
        res.status(401).json({ error: 'missing-admin-token' })
        return
      }

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
        },
      })
      res.json({ document: serializeInternalKnowledgeDocument(document) })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/admin/knowledge-documents/:id', async (req, res, next) => {
    try {
      if (!isAdminRequest(req.headers.authorization)) {
        res.status(401).json({ error: 'missing-admin-token' })
        return
      }

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

  app.post('/admin/knowledge/sync', async (req, res, next) => {
    try {
      if (!isAdminRequest(req.headers.authorization)) {
        res.status(401).json({ error: 'missing-admin-token' })
        return
      }

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
        await prisma.internalKnowledgeDocument.updateMany({
          where: { id: { in: documents.map((document) => document.id) } },
          data: { lastSyncedAt: finishedAt },
        })
      }

      res.json({ syncRun: serializeInternalKnowledgeSyncRun(updatedRun), accepted: syncResult.accepted })
    } catch (error) {
      next(error)
    }
  })

  app.post('/admin/invites', async (req, res, next) => {
    try {
      if (!isAdminRequest(req.headers.authorization)) {
        res.status(401).json({ error: 'missing-admin-token' })
        return
      }

      const code = String(req.body?.code ?? '').trim()
      if (!code) {
        res.status(400).json({ error: 'missing-code' })
        return
      }

      const prisma = requireDatabase()
      const label = String(req.body?.label ?? '内部邀请码').trim().slice(0, 80) || '内部邀请码'
      const invite = await prisma.invite.create({
        data: {
          codeHash: sha256(code),
          label,
          role: req.body?.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
          dailyQuota: readPositiveInteger(req.body?.dailyQuota, 24),
          maxUses: readPositiveInteger(req.body?.maxUses, 1),
        },
      })
      res.json({ invite: serializeInvite(invite) })
    } catch (error) {
      next(error)
    }
  })
}

function isAdminRequest(header: string | undefined) {
  if (!env.adminToken || !header?.startsWith('Bearer ')) return false
  return header.slice('Bearer '.length).trim() === env.adminToken
}

function isActiveMember(member: Pick<Member, 'status'>) {
  return member.status !== 'DISABLED'
}

function serializeMember(
  member: Pick<Member, 'id' | 'name' | 'role' | 'status' | 'dailyQuota' | 'modelChannelId' | 'disabledAt' | 'lastSeenAt' | 'createdAt'>,
) {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    status: member.status,
    dailyQuota: member.dailyQuota,
    modelChannelId: member.modelChannelId ?? null,
    modelChannel: getMemberModelChannel(member.modelChannelId),
    disabledAt: member.disabledAt?.toISOString() ?? null,
    lastSeenAt: member.lastSeenAt?.toISOString() ?? null,
    createdAt: member.createdAt.toISOString(),
  }
}

function serializeInvite(invite: {
  id: string
  label: string
  role: string
  dailyQuota: number
  maxUses: number
  usedCount: number
  expiresAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}) {
  return {
    id: invite.id,
    label: invite.label,
    role: invite.role,
    dailyQuota: invite.dailyQuota,
    maxUses: invite.maxUses,
    usedCount: invite.usedCount,
    status: getInviteStatus(invite),
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    revokedAt: invite.revokedAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
  }
}

function getInviteStatus(invite: Pick<Invite, 'revokedAt' | 'expiresAt' | 'usedCount' | 'maxUses'>) {
  if (invite.revokedAt) return 'REVOKED'
  if (invite.expiresAt && invite.expiresAt < new Date()) return 'EXPIRED'
  if (invite.usedCount >= invite.maxUses) return 'EXHAUSTED'
  return 'OPEN'
}

function summarizeInvites(invites: Array<Pick<Invite, 'revokedAt' | 'expiresAt' | 'usedCount' | 'maxUses'>>) {
  const summary = {
    total: invites.length,
    open: 0,
    revoked: 0,
    expired: 0,
    exhausted: 0,
  }
  for (const invite of invites) {
    const status = getInviteStatus(invite)
    if (status === 'OPEN') summary.open += 1
    if (status === 'REVOKED') summary.revoked += 1
    if (status === 'EXPIRED') summary.expired += 1
    if (status === 'EXHAUSTED') summary.exhausted += 1
  }
  return summary
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
  usage: Pick<Prisma.UsageLogGetPayload<{ include: { member: true } }>, 'id' | 'scope' | 'model' | 'tokensIn' | 'tokensOut' | 'createdAt'> & {
    member: Pick<Member, 'id' | 'name' | 'role' | 'status' | 'modelChannelId'> | null
  },
) {
  return {
    id: usage.id,
    scope: usage.scope,
    model: usage.model ?? 'fallback',
    tokensIn: usage.tokensIn,
    tokensOut: usage.tokensOut,
    createdAt: usage.createdAt.toISOString(),
    member: usage.member
      ? {
          id: usage.member.id,
          name: usage.member.name,
          role: usage.member.role,
          status: usage.member.status,
          modelChannelId: usage.member.modelChannelId ?? null,
          modelChannel: getMemberModelChannel(usage.member.modelChannelId),
        }
      : null,
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
      signal: AbortSignal.timeout(10000),
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
    const diagnostics = isPlainRecord(payload) && isPlainRecord(payload.diagnostics) ? payload.diagnostics : {}
    const payloadIssueCount = typeof diagnostics.issueCount === 'number' && Number.isFinite(diagnostics.issueCount) ? diagnostics.issueCount : 0
    const issueCount = accepted ? payloadIssueCount : Math.max(1, payloadIssueCount)
    return {
      accepted,
      status: accepted ? ('COMPLETED' as const) : mode === 'local-readonly' ? ('SKIPPED' as const) : ('FAILED' as const),
      issueCount,
      diagnostic: { ...diagnosticBase, mode, scope, accepted, issueCount },
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

function sanitizeInternalSyncDiagnostic(value: unknown) {
  if (!isPlainRecord(value)) return null
  const result: Record<string, unknown> = {}
  for (const key of ['mode', 'scope', 'reason', 'accepted', 'documentCount', 'chunkCount', 'issueCount', 'httpStatus']) {
    if (typeof value[key] === 'string' || typeof value[key] === 'number' || typeof value[key] === 'boolean') {
      result[key] = value[key]
    }
  }
  return result
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
    preview: lastMessage ? compactPreview(lastMessage.content) : '还没有消息，打开后可以开始新的内部协作。',
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
    value.reason === 'self_check_failed'
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
  })
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

function getMemberModelChannel(modelChannelId: string | null | undefined) {
  const resolved = resolveModelChannel(modelChannelId)
  const safeChannels = listSafeModelChannels()
  return safeChannels.find((channel) => channel.id === resolved.id) ?? safeChannels[0]
}

function readModelChannelAssignment(value: unknown):
  | { ok: true; changed: false; value?: never }
  | { ok: true; changed: true; value: string | null }
  | { ok: false; changed: false; value?: never } {
  if (value === undefined) return { ok: true, changed: false }
  if (value === null) return { ok: true, changed: true, value: null }
  if (typeof value !== 'string') return { ok: false, changed: false }

  const normalized = value.trim().toLowerCase()
  if (!normalized) return { ok: true, changed: true, value: null }
  const channel = listSafeModelChannels().find((item) => item.id === normalized)
  if (!channel) return { ok: false, changed: false }
  return { ok: true, changed: true, value: channel.isDefault ? null : channel.id }
}

function readMemberStatus(value: unknown) {
  if (value === 'ACTIVE' || value === 'DISABLED') return value
  return null
}

function readBoundedString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function compactPreview(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 72 ? `${normalized.slice(0, 71)}…` : normalized
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return parsed
}
