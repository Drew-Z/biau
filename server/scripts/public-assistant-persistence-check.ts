import assert from 'node:assert/strict'
import type { PrismaClient } from '@prisma/client'
import {
  deletePublicAssistantSession,
  loadPublicAssistantInsights,
  loadPublicAssistantSession,
  loadPublicAssistantSessions,
  normalizePublicAssistantFeedback,
  normalizePublicAssistantSessionAccess,
  normalizePublicAssistantSessionList,
  persistPublicAssistantTurn,
  runPublicAssistantRetention,
  savePublicAssistantFeedback,
} from '../src/publicAssistantPersistence.js'
import type { PublicAssistantRequest } from '../src/publicAssistantRuntime.js'
import type { ChatResponse } from '../src/types.js'

const fixedNow = new Date('2026-07-26T08:00:00.000Z')

function makeRequest(question: string): PublicAssistantRequest {
  return { question, mode: 'auto', sessionId: 'public-session-1234', history: [] }
}

function makeResponse(answer: string, status: ChatResponse['status'] = 'answered'): ChatResponse {
  return {
    answer,
    status,
    citations: [{ id: 'site-1', title: 'Source', summary: 'Summary', href: '/projects', visibility: 'public' }],
    meta: {
      mode: 'model',
      model: 'configured-model',
      citationCount: 1,
      research: {
        requestedMode: 'auto',
        route: 'combined',
        status: status ?? 'answered',
        evidenceCount: 2,
        siteEvidenceCount: 1,
        webEvidenceCount: 1,
        retryCount: 0,
        searchAvailable: true,
        durationMs: 123,
      },
    },
  }
}

function createPersistFake() {
  const captured: Record<string, unknown> = {}
  const tx = {
    publicAssistantSession: {
      upsert: async (args: unknown) => {
        captured.sessionUpsert = args
        return { id: 'public-session-1234' }
      },
      deleteMany: async (args: unknown) => {
        captured.sessionDelete = args
        return { count: 0 }
      },
    },
    publicAssistantDailyAggregate: {
      upsert: async (args: unknown) => {
        captured.aggregateUpsert = args
        return { id: 'aggregate-1' }
      },
    },
    publicAssistantTurn: {
      create: async (args: unknown) => {
        captured.turnCreate = args
        return { id: 'turn-1' }
      },
      deleteMany: async (args: unknown) => {
        captured.turnDelete = args
        return { count: 0 }
      },
    },
  }
  const prisma = {
    ...tx,
    $transaction: async (input: unknown) => {
      if (typeof input === 'function') return input(tx)
      return Promise.all(input as Promise<unknown>[])
    },
  } as unknown as PrismaClient
  return { prisma, captured }
}

const secretSentinel = 'sk-1234567890abcdefghijklmnop'
const persistSecret = createPersistFake()
const persisted = await persistPublicAssistantTurn(
  makeRequest(`请保存 ${secretSentinel}`),
  makeResponse('不应保存原始回答'),
  persistSecret.prisma,
  fixedNow,
)
assert.deepEqual(persisted, { sessionId: 'public-session-1234', turnId: 'turn-1' })

const secretTurn = persistSecret.captured.turnCreate as { data: Record<string, unknown> }
const secretAggregate = persistSecret.captured.aggregateUpsert as { create: Record<string, unknown> }
assert.equal(secretTurn.data.question, '[blocked]')
assert.equal(secretTurn.data.answer, '[blocked]')
assert.equal(secretTurn.data.topicTerms, 'blocked')
assert.deepEqual(secretTurn.data.displaySnapshotJson, {
  version: 1,
  claims: [],
  citations: [],
  suggestions: [],
  meta: { mode: 'fallback', citationCount: 0 },
})
assert.equal(secretAggregate.create.topicTerms, 'blocked')
assert.equal(String(secretTurn.data.questionFingerprint).includes(secretSentinel), false)

const expiresAt = secretTurn.data.expiresAt as Date
assert.ok(expiresAt.getTime() > fixedNow.getTime(), 'raw turn must receive a future expiry')
assert.deepEqual(persistSecret.captured.turnDelete, { where: { expiresAt: { lte: fixedNow } } })
assert.deepEqual(persistSecret.captured.sessionDelete, { where: { expiresAt: { lte: fixedNow } } })

const secretFeedback = normalizePublicAssistantFeedback({
  sessionId: 'public-session-1234',
  turnId: 'turn-1234',
  rating: 'down',
  reason: 'incorrect',
  comment: `leaked token=${secretSentinel}`,
})
assert.ok(secretFeedback)
assert.equal(secretFeedback.comment, '[blocked]')

function createFeedbackFake(previousRating: 'up' | 'down' | null) {
  const captured: Record<string, unknown> = { aggregateUpdates: [] }
  const tx = {
    $queryRaw: async (sql: { sql?: string }) => {
      captured.lockSql = sql.sql
      return [{ id: 'turn-1234' }]
    },
    publicAssistantTurn: {
      findFirst: async () => ({
        id: 'turn-1234',
        aggregateId: 'aggregate-1',
        feedback: previousRating ? { rating: previousRating } : null,
      }),
    },
    publicAssistantFeedback: {
      upsert: async (args: unknown) => {
        captured.feedbackUpsert = args
        return { id: 'feedback-1' }
      },
    },
    publicAssistantDailyAggregate: {
      update: async (args: unknown) => {
        ;(captured.aggregateUpdates as unknown[]).push(args)
        return { id: 'aggregate-1' }
      },
    },
  }
  return {
    captured,
    prisma: {
      $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    } as unknown as PrismaClient,
  }
}

const normalizedDown = normalizePublicAssistantFeedback({
  sessionId: 'public-session-1234',
  turnId: 'turn-1234',
  rating: 'down',
  reason: 'missing-sources',
})
assert.ok(normalizedDown)

const changedFeedback = createFeedbackFake('up')
assert.deepEqual(await savePublicAssistantFeedback(normalizedDown, changedFeedback.prisma, fixedNow), { status: 'saved' })
assert.match(String(changedFeedback.captured.lockSql), /FOR UPDATE/u)
const changedUpdates = changedFeedback.captured.aggregateUpdates as Array<{ data: Record<string, unknown> }>
assert.equal(changedUpdates.length, 1)
assert.deepEqual(changedUpdates[0]?.data, {
  positiveCount: { decrement: 1 },
  negativeCount: { increment: 1 },
})

const unchangedFeedback = createFeedbackFake('down')
assert.deepEqual(await savePublicAssistantFeedback(normalizedDown, unchangedFeedback.prisma, fixedNow), { status: 'saved' })
assert.equal((unchangedFeedback.captured.aggregateUpdates as unknown[]).length, 0)

assert.deepEqual(normalizePublicAssistantSessionList({
  sessionIds: ['public-session-1234', 'invalid id', 'public-session-1234', 'public-session-5678'],
}), { sessionIds: ['public-session-1234', 'public-session-5678'] })
assert.equal(normalizePublicAssistantSessionList({ sessionIds: 'not-an-array' }), null)
assert.deepEqual(normalizePublicAssistantSessionAccess({ sessionId: 'public-session-1234' }), { sessionId: 'public-session-1234' })
assert.equal(normalizePublicAssistantSessionAccess({ sessionId: '../private' }), null)

const historyCapture: Record<string, unknown> = {}
const historyPrisma = {
  publicAssistantSession: {
    findMany: async (args: unknown) => {
      historyCapture.findMany = args
      return [{
        id: 'public-session-1234',
        createdAt: fixedNow,
        lastActiveAt: fixedNow,
        expiresAt: new Date(fixedNow.getTime() + 86_400_000),
        turns: [{ question: '第一条问题' }],
        _count: { turns: 2 },
      }]
    },
    findFirst: async (args: unknown) => {
      historyCapture.findFirst = args
      return {
        id: 'public-session-1234',
        createdAt: fixedNow,
        lastActiveAt: fixedNow,
        expiresAt: new Date(fixedNow.getTime() + 86_400_000),
        turns: [
          {
            id: 'turn-2',
            question: '第二条问题',
            answer: '第二条回答',
            mode: 'web',
            route: 'web',
            status: 'partial',
            citationIdsJson: ['web-1'],
            metricsJson: { evidenceCount: 1, webEvidenceCount: 1, durationMs: 200 },
            displaySnapshotJson: {
              version: 1,
              claims: [{ id: 'claim-1', text: '结论', citationIds: ['web-1'] }],
              citations: [{
                id: 'web-1',
                title: '公开网页',
                summary: '摘要',
                href: 'https://example.com/source',
                source: 'web',
                section: '正文',
                excerpt: '公开证据',
                publishedAt: null,
                evidenceStatus: 'verified',
              }],
              suggestions: ['继续研究'],
              meta: {
                mode: 'model',
                citationCount: 1,
                research: {
                  requestedMode: 'web',
                  route: 'web',
                  status: 'partial',
                  evidenceCount: 1,
                  siteEvidenceCount: 0,
                  webEvidenceCount: 1,
                  retryCount: 0,
                  searchAvailable: true,
                  durationMs: 200,
                },
              },
            },
            createdAt: new Date(fixedNow.getTime() + 1_000),
            feedback: { rating: 'up' },
          },
          {
            id: 'turn-1',
            question: '第一条问题',
            answer: '旧记录回答',
            mode: 'auto',
            route: 'direct',
            status: 'answered',
            citationIdsJson: ['site-legacy'],
            metricsJson: { evidenceCount: 1, siteEvidenceCount: 1, durationMs: 100 },
            displaySnapshotJson: null,
            createdAt: fixedNow,
            feedback: null,
          },
        ],
      }
    },
    deleteMany: async (args: unknown) => {
      historyCapture.deleteMany = args
      return { count: 1 }
    },
  },
} as unknown as PrismaClient

const sessionSummaries = await loadPublicAssistantSessions(['public-session-1234'], historyPrisma, fixedNow)
assert.ok(sessionSummaries)
assert.equal(sessionSummaries[0]?.title, '第一条问题')
assert.equal(sessionSummaries[0]?.turnCount, 2)

const sessionHistory = await loadPublicAssistantSession('public-session-1234', historyPrisma, fixedNow)
assert.equal(sessionHistory.status, 'loaded')
if (sessionHistory.status === 'loaded') {
  assert.equal(sessionHistory.turns[0]?.answer, '旧记录回答')
  assert.equal(sessionHistory.turns[0]?.citations.length, 0, 'legacy rows must degrade without inventing citations')
  assert.equal(sessionHistory.turns[1]?.citations[0]?.href, 'https://example.com/source')
  assert.equal(sessionHistory.turns[1]?.feedback, 'up')
}

assert.deepEqual(await deletePublicAssistantSession('public-session-1234', historyPrisma, fixedNow), { status: 'deleted' })
assert.ok(historyCapture.deleteMany)

const retentionCapture: unknown[] = []
const retentionPrisma = {
  publicAssistantTurn: { deleteMany: (args: unknown) => Promise.resolve(retentionCapture.push(args)) },
  publicAssistantSession: { deleteMany: (args: unknown) => Promise.resolve(retentionCapture.push(args)) },
  $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
} as unknown as PrismaClient
await runPublicAssistantRetention(retentionPrisma, fixedNow)
assert.equal(retentionCapture.length, 2)

const insightsSelect: Record<string, unknown> = {}
const insightsPrisma = {
  publicAssistantTurn: {
    groupBy: async () => [{ status: 'partial', route: 'web', _count: { _all: 2 } }],
  },
  publicAssistantFeedback: {
    groupBy: async () => [{ rating: 'down', _count: { _all: 1 } }],
  },
  publicAssistantDailyAggregate: {
    findMany: async (args: { select: Record<string, unknown> }) => {
      Object.assign(insightsSelect, args.select)
      return [{
        date: fixedNow,
        topicFingerprint: 'topic-1',
        topicTerms: 'agentic · rag',
        route: 'web',
        status: 'partial',
        totalCount: 2,
        positiveCount: 0,
        negativeCount: 1,
        siteEvidenceTotal: 0,
        webEvidenceTotal: 2,
        latencyTotalMs: 400n,
        question: 'must-not-return',
        answer: 'must-not-return',
        sessionId: 'must-not-return',
        turnId: 'must-not-return',
      }]
    },
  },
} as unknown as PrismaClient
const insights = await loadPublicAssistantInsights(insightsPrisma)
assert.ok(insights)
assert.equal(JSON.stringify(insights).includes('must-not-return'), false)
assert.equal('question' in insightsSelect, false)
assert.equal('answer' in insightsSelect, false)
assert.equal('sessionId' in insightsSelect, false)

assert.equal(await persistPublicAssistantTurn(makeRequest('hello'), makeResponse('answer'), null, fixedNow), null)
assert.deepEqual(await savePublicAssistantFeedback(normalizedDown, null, fixedNow), { status: 'database-not-configured' })
assert.equal(await loadPublicAssistantInsights(null), null)
assert.equal(await loadPublicAssistantSessions(['public-session-1234'], null, fixedNow), null)
assert.deepEqual(await loadPublicAssistantSession('public-session-1234', null, fixedNow), { status: 'database-not-configured' })
assert.deepEqual(await deletePublicAssistantSession('public-session-1234', null, fixedNow), { status: 'database-not-configured' })

console.log('Public assistant persistence and retention contracts passed.')
