import cors from 'cors'
import express from 'express'
import { Prisma } from '@prisma/client'
import { env, hasDatabase, hasModelProvider } from './env.js'
import { sha256 } from './crypto.js'
import { issueMemberToken, readBearerMember, requireDatabase } from './auth.js'
import { generateAnswer } from './model.js'
import { searchKnowledge } from './knowledge.js'
import { createMetricsMiddleware, renderPrometheusMetrics } from './metrics.js'
import { retrievePublicAssistantContext } from './ragClient.js'
import { createRagOrchestratorRouter } from './ragRoutes.js'
import type { ChatPayload, ChatResponse } from './types.js'

export function createApp() {
  const app = express()
  app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin }))
  app.use(express.json({ limit: '1mb' }))
  if (env.metricsEnabled) app.use(createMetricsMiddleware())
  app.use('/rag', createRagOrchestratorRouter())

  app.get('/metrics', (_req, res) => {
    if (!env.metricsEnabled) {
      res.status(404).json({ error: 'metrics-disabled' })
      return
    }

    res.type('text/plain; version=0.0.4; charset=utf-8').send(renderPrometheusMetrics())
  })

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'biau-assistant-api',
      database: hasDatabase(),
      mode: hasModelProvider() ? 'model' : 'fallback',
      modelConfigured: hasModelProvider(),
      model: hasModelProvider() ? env.assistantModelName : 'fallback',
      provider: hasModelProvider() ? env.assistantModelProvider : 'local-public-knowledge',
    })
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
        if (!invite || invite.usedCount >= invite.maxUses || (invite.expiresAt && invite.expiresAt < new Date())) {
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
        member: {
          id: member.id,
          name: member.name,
          role: member.role,
          dailyQuota: member.dailyQuota,
        },
      })
    } catch (error) {
      next(error)
    }
  })

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
          citationCount: citations.length,
          retrieval: context.retrieval,
        },
      }
      res.json(response)
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

      const { message, sessionId } = req.body as ChatPayload
      const question = message?.trim()
      if (!question) {
        res.status(400).json({ error: 'missing-message' })
        return
      }

      const prisma = requireDatabase()
      const session =
        sessionId
          ? await prisma.chatSession.findFirst({ where: { id: sessionId, memberId: member.id } })
          : await prisma.chatSession.create({
              data: {
                memberId: member.id,
                title: question.slice(0, 36),
              },
            })

      const activeSession =
        session ??
        (await prisma.chatSession.create({
          data: {
            memberId: member.id,
            title: question.slice(0, 36),
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

      const citations = searchKnowledge(question)
      const generated = await generateAnswer(question, citations, 'internal')
      const reply = await prisma.chatMessage.create({
        data: {
          memberId: member.id,
          sessionId: activeSession.id,
          role: 'ASSISTANT',
          content: generated.answer,
          citations: citations as unknown as Prisma.InputJsonValue,
        },
      })
      await prisma.usageLog.create({
        data: {
          memberId: member.id,
          scope: 'internal-chat',
          model: generated.model,
        },
      })

      res.json({
        answer: generated.answer,
        citations,
        meta: {
          mode: generated.mode,
          model: generated.model,
          provider: generated.provider,
          reason: generated.reason,
          diagnostic: generated.diagnostic,
          citationCount: citations.length,
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
      const [members, invites, messages, usage] = await Promise.all([
        prisma.member.count(),
        prisma.invite.count(),
        prisma.chatMessage.count(),
        prisma.usageLog.count(),
      ])
      res.json({ members, invites, messages, usage })
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
      res.json({ id: invite.id, label: invite.label, role: invite.role, dailyQuota: invite.dailyQuota, maxUses: invite.maxUses })
    } catch (error) {
      next(error)
    }
  })

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

function isAdminRequest(header: string | undefined) {
  if (!env.adminToken || !header?.startsWith('Bearer ')) return false
  return header.slice('Bearer '.length).trim() === env.adminToken
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return parsed
}
