/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma's fluent delegate surface is intentionally emulated by this isolated in-memory fixture. */
import assert from 'node:assert/strict'
import { Prisma, type PrismaClient } from '@prisma/client'
import {
  buildPublicAssistantRequestHash,
  claimPublicAssistantRequest,
  completePublicAssistantRequest,
  deletePublicAssistantSession,
  loadPublicAssistantInsights,
  loadPublicAssistantSession,
  loadPublicAssistantSessions,
  normalizePublicAssistantBranchAction,
  normalizePublicAssistantFeedback,
  normalizePublicAssistantSessionAccess,
  normalizePublicAssistantSessionList,
  persistPublicAssistantTurn,
  runPublicAssistantRetention,
  savePublicAssistantFeedback,
  selectPublicAssistantBranch,
} from '../src/publicAssistantPersistence.js'
import type { PublicAssistantRequest } from '../src/publicAssistantRuntime.js'
import type { ChatResponse, PublicAssistantGenerationIntent } from '../src/types.js'

const fixedNow = new Date('2026-07-26T08:00:00.000Z')
const future = new Date(fixedNow.getTime() + 7 * 86_400_000)

interface SessionRow {
  id: string
  activeBranchId: string | null
  branchSelectionVersion: number
  createdAt: Date
  lastActiveAt: Date
  expiresAt: Date
}

interface RequestRow {
  requestId: string
  sessionId: string
  requestHash: string
  intent: string
  status: string
  attempt: number
  leaseToken: string
  leaseExpiresAt: Date
  claimedBranchSelectionVersion: number
  turnId: string | null
  revisionId: string | null
  branchId: string | null
  parentRevisionId: string | null
  baseRevisionId: string | null
  responseJson: Prisma.JsonValue | null
  errorCode: string | null
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
}

interface TurnRow {
  id: string
  sessionId: string
  parentRevisionId: string | null
  question: string
  mode: string
  questionFingerprint: string
  topicFingerprint: string
  topicTerms: string
  createdAt: Date
  expiresAt: Date
}

interface RevisionRow {
  id: string
  turnId: string
  aggregateId: string
  revisionNo: number
  basedOnRevisionId: string | null
  answer: string
  route: string
  status: string
  citationIdsJson: Prisma.JsonValue
  metricsJson: Prisma.JsonValue | null
  displaySnapshotJson: Prisma.JsonValue | null
  createdAt: Date
  expiresAt: Date
}

interface BranchRow {
  id: string
  sessionId: string
  ordinal: number
  headRevisionId: string | null
  forkedFromRevisionId: string | null
  createdAt: Date
  lastActiveAt: Date
  expiresAt: Date
}

interface FeedbackRow {
  id: string
  sessionId: string
  revisionId: string
  rating: string
  reason: string | null
  comment: string | null
  createdAt: Date
  updatedAt: Date
}

interface AggregateRow {
  id: string
  date: Date
  topicFingerprint: string
  topicTerms: string
  route: string
  status: string
  totalCount: number
  positiveCount: number
  negativeCount: number
  siteEvidenceTotal: number
  webEvidenceTotal: number
  latencyTotalMs: bigint
}

interface MemoryState {
  sessions: Map<string, SessionRow>
  requests: Map<string, RequestRow>
  turns: Map<string, TurnRow>
  revisions: Map<string, RevisionRow>
  branches: Map<string, BranchRow>
  feedback: Map<string, FeedbackRow>
  aggregates: Map<string, AggregateRow>
  counters: Record<string, number>
}

function makeRequest(
  question: string,
  options: { requestId?: string; sessionId?: string; intent?: PublicAssistantGenerationIntent } = {},
): PublicAssistantRequest {
  return {
    contractVersion: 2,
    requestId: options.requestId ?? '11111111-1111-4111-8111-111111111111',
    question,
    mode: 'auto',
    sessionId: options.sessionId ?? 'public-session-1234',
    history: [],
    intent: options.intent ?? { kind: 'new-turn', branchId: null, parentRevisionId: null },
  }
}

function makeResponse(answer: string, status: ChatResponse['status'] = 'answered'): ChatResponse {
  return {
    answer,
    status,
    citations: [{ id: 'site-1', title: 'Source', summary: 'Summary', href: '/projects', visibility: 'public' }],
    claims: [{ id: 'claim-1', text: 'Supported claim', citationIds: ['site-1'] }],
    suggestions: ['继续追问'],
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

function createMemoryPrisma() {
  const state: MemoryState = {
    sessions: new Map(),
    requests: new Map(),
    turns: new Map(),
    revisions: new Map(),
    branches: new Map(),
    feedback: new Map(),
    aggregates: new Map(),
    counters: {},
  }
  const nextId = (kind: string) => {
    state.counters[kind] = (state.counters[kind] ?? 0) + 1
    return `${kind}-${state.counters[kind]}`
  }
  const tx = createDelegates(state, nextId)
  const prisma = {
    ...tx,
    $transaction: async (input: ((client: typeof tx) => Promise<unknown>) | Promise<unknown>[]) => (
      typeof input === 'function' ? input(tx) : Promise.all(input)
    ),
  } as unknown as PrismaClient
  return { prisma, state }
}

function createDelegates(state: MemoryState, nextId: (kind: string) => string) {
  const sessionDelegate = {
    findFirst: async (args: any) => {
      const row = state.sessions.get(args.where.id)
      if (!row || !matchesExpiry(row.expiresAt, args.where.expiresAt)) return null
      return {
        ...row,
        activeBranch: row.activeBranchId
          ? selectRow(state.branches.get(row.activeBranchId) ?? null, args.select?.activeBranch?.select)
          : null,
      }
    },
    findMany: async (args: any) => [...state.sessions.values()]
      .filter((row) => matchesWhere(row, args.where))
      .sort((left, right) => right.lastActiveAt.getTime() - left.lastActiveAt.getTime())
      .map((row) => selectRow(row, args.select)),
    upsert: async (args: any) => {
      const existing = state.sessions.get(args.where.id)
      const row: SessionRow = existing
        ? { ...existing, ...applyUpdate(existing, args.update) }
        : {
            activeBranchId: null,
            branchSelectionVersion: 0,
            createdAt: fixedNow,
            ...args.create,
          }
      state.sessions.set(row.id, row)
      return row
    },
    update: async (args: any) => {
      const existing = state.sessions.get(args.where.id)
      assert(existing)
      const row = { ...existing, ...applyUpdate(existing, args.data) }
      state.sessions.set(row.id, row)
      return selectRow(row, args.select)
    },
    deleteMany: async (args: any) => {
      const rows = [...state.sessions.values()].filter((row) => matchesWhere(row, args.where))
      rows.forEach((row) => cascadeSession(state, row.id))
      return { count: rows.length }
    },
  }

  const requestDelegate = {
    create: async (args: any) => {
      if (state.requests.has(args.data.requestId)) {
        throw new Prisma.PrismaClientKnownRequestError('unique request id', { code: 'P2002', clientVersion: '7.8.0' })
      }
      const row: RequestRow = {
        attempt: 1,
        responseJson: null,
        errorCode: null,
        turnId: null,
        revisionId: null,
        branchId: null,
        parentRevisionId: null,
        baseRevisionId: null,
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...args.data,
      }
      state.requests.set(row.requestId, row)
      return selectRow(row, args.select)
    },
    update: async (args: any) => {
      const existing = state.requests.get(args.where.requestId)
      assert(existing)
      const row = { ...existing, ...applyUpdate(existing, args.data), updatedAt: fixedNow }
      state.requests.set(row.requestId, row)
      return selectRow(row, args.select)
    },
    updateMany: async (args: any) => {
      const rows = [...state.requests.values()].filter((row) => matchesWhere(row, args.where))
      rows.forEach((row) => state.requests.set(row.requestId, { ...row, ...applyUpdate(row, args.data), updatedAt: fixedNow }))
      return { count: rows.length }
    },
    findUnique: async (args: any) => selectRow(state.requests.get(args.where.requestId) ?? null, args.select),
    deleteMany: async (args: any) => deleteMatching(state.requests, args.where),
  }

  const turnDelegate = {
    create: async (args: any) => {
      const row: TurnRow = { id: nextId('turn'), createdAt: fixedNow, ...args.data }
      state.turns.set(row.id, row)
      return selectRow(row, args.select)
    },
    findMany: async (args: any) => [...state.turns.values()]
      .filter((row) => matchesWhere(row, args.where))
      .map((row) => {
        const revisions = [...state.revisions.values()]
          .filter((revision) => revision.turnId === row.id && matchesWhere(revision, args.select.revisions.where))
          .sort((left, right) => left.revisionNo - right.revisionNo)
          .slice(0, args.select.revisions.take)
          .map((revision) => ({
            ...selectRow(revision, args.select.revisions.select),
            feedback: selectRow(state.feedback.get(revision.id) ?? null, args.select.revisions.select.feedback?.select),
          }))
        return { ...selectRow(row, args.select), revisions }
      }),
  }

  const revisionDelegate = {
    create: async (args: any) => {
      const row: RevisionRow = { id: nextId('revision'), createdAt: fixedNow, ...args.data }
      state.revisions.set(row.id, row)
      return selectRow(row, args.select)
    },
    findFirst: async (args: any) => {
      const row = [...state.revisions.values()].find((revision) => {
        if (!matchesWhere(revision, args.where)) return false
        const turn = state.turns.get(revision.turnId)
        return Boolean(turn && matchesWhere(turn, args.where.turn?.is))
      })
      if (!row) return null
      const turn = state.turns.get(row.turnId)!
      if (args.include?.feedback) return { ...row, feedback: state.feedback.get(row.id) ?? null }
      return {
        ...selectRow(row, args.select),
        ...(args.select?.turn ? { turn: selectRow(turn, args.select.turn.select) } : {}),
      }
    },
    count: async (args: any) => [...state.revisions.values()].filter((row) => matchesWhere(row, args.where)).length,
    aggregate: async (args: any) => {
      const rows = [...state.revisions.values()].filter((row) => matchesWhere(row, args.where))
      return { _max: { revisionNo: Math.max(0, ...rows.map((row) => row.revisionNo)) }, _count: { _all: rows.length } }
    },
    groupBy: async () => groupCounts([...state.revisions.values()], ['status', 'route']),
  }

  const branchDelegate = {
    findFirst: async (args: any) => {
      const rows = [...state.branches.values()].filter((row) => matchesWhere(row, args.where))
      const row = rows[0] ?? null
      return selectRow(row, args.select)
    },
    findMany: async (args: any) => [...state.branches.values()]
      .filter((row) => matchesWhere(row, args.where))
      .sort((left, right) => left.ordinal - right.ordinal)
      .slice(0, args.take)
      .map((row) => ({
        ...selectRow(row, args.select),
        headRevision: row.headRevisionId
          ? { turn: selectRow(state.turns.get(state.revisions.get(row.headRevisionId)?.turnId ?? '') ?? null, args.select.headRevision?.select.turn.select) }
          : null,
      })),
    create: async (args: any) => {
      const row: BranchRow = { id: nextId('branch'), createdAt: fixedNow, ...args.data }
      state.branches.set(row.id, row)
      return selectRow(row, args.select)
    },
    update: async (args: any) => {
      const existing = state.branches.get(args.where.id)
      assert(existing)
      const row = { ...existing, ...applyUpdate(existing, args.data) }
      state.branches.set(row.id, row)
      return selectRow(row, args.select)
    },
    aggregate: async (args: any) => {
      const rows = [...state.branches.values()].filter((row) => matchesWhere(row, args.where))
      return { _max: { ordinal: Math.max(0, ...rows.map((row) => row.ordinal)) } }
    },
    count: async (args: any) => [...state.branches.values()].filter((row) => matchesWhere(row, args.where)).length,
  }

  const aggregateDelegate = {
    upsert: async (args: any) => {
      const key = `${args.create.date.toISOString().slice(0, 10)}:${args.create.topicFingerprint}:${args.create.route}:${args.create.status}`
      const existing = state.aggregates.get(key)
      const row: AggregateRow = existing
        ? { ...existing, ...applyUpdate(existing, args.update) }
        : { id: nextId('aggregate'), positiveCount: 0, negativeCount: 0, ...args.create }
      state.aggregates.set(key, row)
      return row
    },
    update: async (args: any) => {
      const entry = [...state.aggregates.entries()].find(([, row]) => row.id === args.where.id)
      assert(entry)
      const row = { ...entry[1], ...applyUpdate(entry[1], args.data) }
      state.aggregates.set(entry[0], row)
      return row
    },
    findMany: async () => [...state.aggregates.values()],
  }

  const feedbackDelegate = {
    upsert: async (args: any) => {
      const existing = state.feedback.get(args.where.revisionId)
      const row: FeedbackRow = existing
        ? { ...existing, ...args.update, updatedAt: fixedNow }
        : { id: nextId('feedback'), createdAt: fixedNow, updatedAt: fixedNow, ...args.create }
      state.feedback.set(row.revisionId, row)
      return row
    },
    groupBy: async () => groupCounts([...state.feedback.values()], ['rating']),
  }

  return {
    publicAssistantSession: sessionDelegate,
    publicAssistantRequest: requestDelegate,
    publicAssistantTurn: turnDelegate,
    publicAssistantAnswerRevision: revisionDelegate,
    publicAssistantBranch: branchDelegate,
    publicAssistantDailyAggregate: aggregateDelegate,
    publicAssistantFeedback: feedbackDelegate,
    $queryRaw: async (query: any) => rawQuery(state, query),
  }
}

function rawQuery(state: MemoryState, query: any) {
  const text = Array.isArray(query.strings) ? query.strings.join('?') : String(query.sql ?? query)
  const values = Array.isArray(query.values) ? query.values : []
  if (text.includes('FROM "PublicAssistantRequest"') && text.includes('FOR UPDATE')) {
    const row = state.requests.get(String(values[0]))
    return row ? [{ ...row }] : []
  }
  if (text.includes('FROM "PublicAssistantSession"') && text.includes('FOR UPDATE')) {
    const row = state.sessions.get(String(values[0]))
    return row ? [{ id: row.id, branchSelectionVersion: row.branchSelectionVersion }] : []
  }
  if (text.includes('FROM "PublicAssistantTurn"') && text.includes('FOR UPDATE')) {
    const row = state.turns.get(String(values[0]))
    return row && row.sessionId === values[1] ? [{ ...row }] : []
  }
  if (text.includes('FOR UPDATE OF revision')) {
    const revision = state.revisions.get(String(values[0]))
    const turn = revision ? state.turns.get(revision.turnId) : null
    return revision && turn?.sessionId === values[1] ? [{ id: revision.id }] : []
  }
  if (text.includes('SELECT "question", "answer", depth')) {
    const path = revisionPath(state, String(values[0]), String(values[1]), 6)
    return [...path].reverse().map((item, index) => ({
      question: item.turn.question,
      answer: item.revision.answer,
      depth: path.length - index,
    }))
  }
  if (text.includes('AS "revisionId"') && text.includes('FROM "PublicAssistantBranch" AS branch')) {
    const branch = state.branches.get(String(values[0]))
    if (!branch?.headRevisionId || branch.sessionId !== values[1]) return []
    return revisionPath(state, branch.headRevisionId, branch.sessionId, Number(values.at(-1) ?? 101))
      .map((item, index) => ({
        revisionId: item.revision.id,
        turnId: item.turn.id,
        parentRevisionId: item.turn.parentRevisionId,
        depth: index + 1,
      }))
  }
  if (text.includes('WITH RECURSIVE active_paths')) {
    return [...state.sessions.values()].flatMap((session) => {
      const branch = session.activeBranchId ? state.branches.get(session.activeBranchId) : null
      if (!branch?.headRevisionId) return []
      const path = revisionPath(state, branch.headRevisionId, session.id, 101)
      return path.length > 0 ? [{ sessionId: session.id, title: path.at(-1)!.turn.question, turnCount: BigInt(path.length) }] : []
    })
  }
  if (text.includes('WITH RECURSIVE branch_paths')) {
    return [...state.branches.values()].map((branch) => ({
      branchId: branch.id,
      turnCount: BigInt(branch.headRevisionId ? revisionPath(state, branch.headRevisionId, branch.sessionId, 101).length : 0),
    }))
  }
  throw new Error(`Unhandled raw query: ${text.slice(0, 120)}`)
}

function revisionPath(state: MemoryState, headRevisionId: string, sessionId: string, limit: number) {
  const rows: Array<{ revision: RevisionRow; turn: TurnRow }> = []
  const seen = new Set<string>()
  let revisionId: string | null = headRevisionId
  while (revisionId && rows.length < limit && !seen.has(revisionId)) {
    seen.add(revisionId)
    const revision: RevisionRow | undefined = state.revisions.get(revisionId)
    const turn: TurnRow | undefined = revision ? state.turns.get(revision.turnId) : undefined
    if (!revision || !turn || turn.sessionId !== sessionId) return []
    rows.push({ revision, turn })
    revisionId = turn.parentRevisionId
  }
  return rows
}

function selectRow<T>(row: T | null, select?: Record<string, unknown>) {
  if (!row || !select) return row
  return Object.fromEntries(Object.keys(select).filter((key) => key in (row as object)).map((key) => [key, (row as any)[key]]))
}

function applyUpdate(row: any, data: Record<string, any>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => {
    if (value && typeof value === 'object' && 'increment' in value) {
      return [key, typeof row[key] === 'bigint'
        ? row[key] + BigInt(value.increment)
        : Number(row[key] ?? 0) + Number(value.increment)]
    }
    if (value && typeof value === 'object' && 'decrement' in value) {
      return [key, typeof row[key] === 'bigint'
        ? row[key] - BigInt(value.decrement)
        : Number(row[key] ?? 0) - Number(value.decrement)]
    }
    return [key, value]
  }))
}

function matchesExpiry(value: Date, filter: any) {
  if (!filter) return true
  if (filter.gt && value.getTime() <= filter.gt.getTime()) return false
  if (filter.lte && value.getTime() > filter.lte.getTime()) return false
  return true
}

function matchesWhere(row: any, where: any): boolean {
  if (!where) return true
  if (Array.isArray(where.OR)) return where.OR.some((item: any) => matchesWhere(row, item))
  return Object.entries(where).every(([key, expected]: [string, any]) => {
    if (key === 'turn') return true
    const actual = row[key]
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      if ('in' in expected) return expected.in.includes(actual)
      if ('not' in expected) return actual !== expected.not
      if ('gt' in expected || 'lte' in expected) return matchesExpiry(actual, expected)
    }
    return actual === expected
  })
}

function deleteMatching<T extends { [key: string]: any }>(map: Map<string, T>, where: any) {
  const entries = [...map.entries()].filter(([, row]) => matchesWhere(row, where))
  entries.forEach(([key]) => map.delete(key))
  return { count: entries.length }
}

function cascadeSession(state: MemoryState, sessionId: string) {
  state.sessions.delete(sessionId)
  const turnIds = [...state.turns.values()].filter((row) => row.sessionId === sessionId).map((row) => row.id)
  const revisionIds = [...state.revisions.values()].filter((row) => turnIds.includes(row.turnId)).map((row) => row.id)
  turnIds.forEach((id) => state.turns.delete(id))
  revisionIds.forEach((id) => {
    state.revisions.delete(id)
    state.feedback.delete(id)
  })
  ;[...state.branches.entries()].filter(([, row]) => row.sessionId === sessionId).forEach(([id]) => state.branches.delete(id))
}

function groupCounts(rows: any[], keys: string[]) {
  const groups = new Map<string, any>()
  rows.forEach((row) => {
    const key = keys.map((field) => row[field]).join(':')
    const current = groups.get(key) ?? { _count: { _all: 0 } }
    keys.forEach((field) => { current[field] = row[field] })
    current._count._all += 1
    groups.set(key, current)
  })
  return [...groups.values()]
}

const secretSentinel = 'sk-1234567890abcdefghijklmnop'
const secretFake = createMemoryPrisma()
const persistedSecret = await persistPublicAssistantTurn(
  makeRequest(`请保存 ${secretSentinel}`),
  makeResponse('不应保存原始回答'),
  secretFake.prisma,
  fixedNow,
)
assert(persistedSecret)
const secretTurn = [...secretFake.state.turns.values()][0]
const secretRevision = [...secretFake.state.revisions.values()][0]
assert.equal(secretTurn.question, '[blocked]')
assert.equal(secretRevision.answer, '[blocked]')
assert.equal(secretTurn.topicTerms, 'blocked')
assert.equal(JSON.stringify(secretRevision.displaySnapshotJson).includes(secretSentinel), false)

const secretFeedback = normalizePublicAssistantFeedback({
  sessionId: 'public-session-1234',
  revisionId: secretRevision.id,
  rating: 'down',
  reason: 'incorrect',
  comment: `leaked token=${secretSentinel}`,
})
assert(secretFeedback)
assert.equal(secretFeedback.comment, '[blocked]')
assert.deepEqual(await savePublicAssistantFeedback(secretFeedback, secretFake.prisma, fixedNow), { status: 'saved' })
assert.equal(secretFake.state.feedback.get(secretRevision.id)?.rating, 'down')

assert.deepEqual(normalizePublicAssistantSessionList({
  sessionIds: ['public-session-1234', 'invalid id', 'public-session-1234', 'public-session-5678'],
}), { sessionIds: ['public-session-1234', 'public-session-5678'] })
assert.equal(normalizePublicAssistantSessionList({ sessionIds: 'not-an-array' }), null)
assert.deepEqual(normalizePublicAssistantSessionAccess({ sessionId: 'public-session-1234' }), { sessionId: 'public-session-1234' })
assert.equal(normalizePublicAssistantSessionAccess({ sessionId: '../private' }), null)
assert.deepEqual(normalizePublicAssistantBranchAction({
  sessionId: 'public-session-1234',
  action: 'continue-from-revision',
  revisionId: secretRevision.id,
}), { sessionId: 'public-session-1234', action: 'continue-from-revision', revisionId: secretRevision.id })

const canonicalRequest = makeRequest('canonical question')
assert.equal(
  buildPublicAssistantRequestHash(canonicalRequest),
  buildPublicAssistantRequestHash({ ...canonicalRequest, requestId: '22222222-2222-4222-8222-222222222222' }),
)
assert.notEqual(buildPublicAssistantRequestHash(canonicalRequest), buildPublicAssistantRequestHash({
  ...canonicalRequest,
  intent: { kind: 'new-turn', branchId: 'branch-x', parentRevisionId: 'revision-x' },
}))

const generationFake = createMemoryPrisma()
const firstClaim = await claimPublicAssistantRequest(canonicalRequest, generationFake.prisma, fixedNow)
assert.equal(firstClaim.status, 'acquired')
if (firstClaim.status !== 'acquired') throw new Error('expected acquired root request')
assert.equal((await claimPublicAssistantRequest(canonicalRequest, generationFake.prisma, new Date(fixedNow.getTime() + 1_000))).status, 'processing')
assert.equal((await claimPublicAssistantRequest({ ...canonicalRequest, question: 'different' }, generationFake.prisma, fixedNow)).status, 'conflict')
generationFake.state.requests.get(canonicalRequest.requestId)!.leaseExpiresAt = new Date(fixedNow.getTime() - 1)
const takeover = await claimPublicAssistantRequest(canonicalRequest, generationFake.prisma, fixedNow)
assert.equal(takeover.status, 'acquired')
if (takeover.status !== 'acquired') throw new Error('expected acquired takeover')

const completedRoot = await completePublicAssistantRequest(
  takeover.request,
  makeResponse('persisted exactly once'),
  takeover.lease,
  generationFake.prisma,
  fixedNow,
)
assert.equal(completedRoot.status, 'completed')
if (completedRoot.status !== 'completed') throw new Error('expected completed root')
assert.equal(generationFake.state.turns.size, 1)
assert.equal(generationFake.state.revisions.size, 1)
assert.equal(generationFake.state.branches.size, 1)
assert.equal(completedRoot.response.contractVersion, 2)
assert.equal(completedRoot.response.conversation?.revisionNo, 1)
assert.equal(completedRoot.response.conversation?.basedOnRevisionId, null)
assert.equal(completedRoot.response.conversation?.activated, true)
assert.equal((await claimPublicAssistantRequest(canonicalRequest, generationFake.prisma, fixedNow)).status, 'completed')
assert.equal(generationFake.state.revisions.size, 1)

const rootIdentity = completedRoot.response.conversation!
const followUpIntent = {
  kind: 'new-turn' as const,
  branchId: rootIdentity.branchId,
  parentRevisionId: rootIdentity.revisionId,
}
const followA = makeRequest('follow A', { requestId: '22222222-2222-4222-8222-222222222222', intent: followUpIntent })
const followB = makeRequest('follow B', { requestId: '33333333-3333-4333-8333-333333333333', intent: followUpIntent })
const [claimA, claimB] = await Promise.all([
  claimPublicAssistantRequest(followA, generationFake.prisma, fixedNow),
  claimPublicAssistantRequest(followB, generationFake.prisma, fixedNow),
])
assert.equal(claimA.status, 'acquired')
assert.equal(claimB.status, 'acquired')
if (claimA.status !== 'acquired' || claimB.status !== 'acquired') throw new Error('expected acquired concurrent follow-ups')
const completedA = await completePublicAssistantRequest(claimA.request, makeResponse('answer A'), claimA.lease, generationFake.prisma, fixedNow)
const completedB = await completePublicAssistantRequest(claimB.request, makeResponse('answer B'), claimB.lease, generationFake.prisma, fixedNow)
assert.equal(completedA.status, 'completed')
assert.equal(completedB.status, 'completed')
assert.equal(generationFake.state.turns.size, 3)
assert.equal(generationFake.state.branches.size, 2, 'late concurrent follow-up must fork instead of overwriting')

if (completedA.status !== 'completed') throw new Error('expected follow-up A completion')
const regenerate = makeRequest('client text must not replace the original question', {
  requestId: '44444444-4444-4444-8444-444444444444',
  intent: {
    kind: 'answer-revision',
    branchId: completedA.response.conversation!.branchId,
    turnId: completedA.response.conversation!.turnId,
    baseRevisionId: completedA.response.conversation!.revisionId,
  },
})
const regenerateClaim = await claimPublicAssistantRequest(regenerate, generationFake.prisma, fixedNow)
assert.equal(regenerateClaim.status, 'acquired')
if (regenerateClaim.status !== 'acquired') throw new Error('expected regeneration claim')
assert.equal(regenerateClaim.request.question, 'follow A')
const regenerated = await completePublicAssistantRequest(
  regenerateClaim.request,
  makeResponse('alternative A'),
  regenerateClaim.lease,
  generationFake.prisma,
  fixedNow,
)
assert.equal(regenerated.status, 'completed')
if (regenerated.status !== 'completed') throw new Error('expected regeneration completion')
assert.equal(regenerated.response.conversation?.revisionNo, 2)
assert.equal(regenerated.response.conversation?.basedOnRevisionId, completedA.response.conversation?.revisionId)
assert.equal(regenerated.response.conversation?.activated, true)
assert.equal(generationFake.state.branches.size, 3)

const generatedBranchId = regenerated.response.conversation!.branchId
const generatedBranchHead = generationFake.state.branches.get(generatedBranchId)!.headRevisionId!
const lateRequest = makeRequest('late branch completion', {
  requestId: '77777777-7777-4777-8777-777777777777',
  intent: {
    kind: 'new-turn',
    branchId: generatedBranchId,
    parentRevisionId: generatedBranchHead,
  },
})
const lateClaim = await claimPublicAssistantRequest(lateRequest, generationFake.prisma, fixedNow)
assert.equal(lateClaim.status, 'acquired')
if (lateClaim.status !== 'acquired') throw new Error('expected late completion claim')
const selected = await selectPublicAssistantBranch({
  sessionId: canonicalRequest.sessionId,
  action: 'select',
  branchId: rootIdentity.branchId,
}, generationFake.prisma, fixedNow)
assert.equal(selected.status, 'selected')
const selectionVersion = generationFake.state.sessions.get(canonicalRequest.sessionId)!.branchSelectionVersion
assert.equal(selectionVersion, 1)
const lateCompletion = await completePublicAssistantRequest(
  lateClaim.request,
  makeResponse('saved without stealing selection'),
  lateClaim.lease,
  generationFake.prisma,
  fixedNow,
)
assert.equal(lateCompletion.status, 'completed')
if (lateCompletion.status !== 'completed') throw new Error('expected late completion')
assert.equal(lateCompletion.response.conversation?.activated, false)
assert.equal(generationFake.state.sessions.get(canonicalRequest.sessionId)?.activeBranchId, rootIdentity.branchId)
assert.equal(generationFake.state.branches.get(generatedBranchId)?.headRevisionId, lateCompletion.response.conversation?.revisionId)

const summaries = await loadPublicAssistantSessions([canonicalRequest.sessionId], generationFake.prisma, fixedNow)
assert.equal(summaries?.[0]?.title, 'canonical question')
const history = await loadPublicAssistantSession(canonicalRequest.sessionId, generationFake.prisma, fixedNow)
assert.equal(history.status, 'loaded')
if (history.status !== 'loaded') throw new Error('expected loaded history')
assert.equal(history.turns.length, 2)
assert.equal(history.branches.length, 3)
assert.equal(history.turns[0].revisions.length, 1)
assert.equal(history.turns[1].revisions.length, 2)
assert.equal(history.turns[1].selectedRevisionId, completedA.response.conversation?.revisionId)

const crossSession = makeRequest('cross session', {
  requestId: '55555555-5555-4555-8555-555555555555',
  sessionId: 'public-session-other',
  intent: followUpIntent,
})
const crossClaim = await claimPublicAssistantRequest(crossSession, generationFake.prisma, fixedNow)
assert.equal(crossClaim.status, 'rejected')
if (crossClaim.status === 'rejected') assert.equal(crossClaim.httpStatus, 404)

const sensitiveRequest = makeRequest('sensitive completion', {
  requestId: '66666666-6666-4666-8666-666666666666',
  sessionId: 'public-session-sensitive',
})
const sensitiveClaim = await claimPublicAssistantRequest(sensitiveRequest, generationFake.prisma, fixedNow)
assert.equal(sensitiveClaim.status, 'acquired')
if (sensitiveClaim.status !== 'acquired') throw new Error('expected sensitive claim')
const sensitiveCompletion = await completePublicAssistantRequest(
  sensitiveClaim.request,
  makeResponse('postgresql://user:password@db.example/internal'),
  sensitiveClaim.lease,
  generationFake.prisma,
  fixedNow,
)
assert.equal(sensitiveCompletion.status, 'completed')
if (sensitiveCompletion.status !== 'completed') throw new Error('expected sensitive completion')
assert.equal(sensitiveCompletion.response.status, 'blocked')
assert.equal(JSON.stringify(generationFake.state.requests.get(sensitiveRequest.requestId)?.responseJson).includes('postgresql://'), false)

const feedbackTarget = regenerated.response.conversation!.revisionId
const normalizedFeedback = normalizePublicAssistantFeedback({
  sessionId: canonicalRequest.sessionId,
  revisionId: feedbackTarget,
  rating: 'up',
  reason: 'helpful',
})
assert(normalizedFeedback)
assert.deepEqual(await savePublicAssistantFeedback(normalizedFeedback, generationFake.prisma, fixedNow), { status: 'saved' })
assert.equal(generationFake.state.feedback.get(feedbackTarget)?.rating, 'up')

const insights = await loadPublicAssistantInsights(generationFake.prisma)
assert(insights)
assert.equal(insights.turns.reduce((total, item) => total + item.count, 0), generationFake.state.revisions.size)
assert.equal(JSON.stringify(insights).includes('persisted exactly once'), false)

assert.deepEqual(await deletePublicAssistantSession('public-session-sensitive', generationFake.prisma, fixedNow), { status: 'deleted' })
assert.equal([...generationFake.state.turns.values()].some((turn) => turn.sessionId === 'public-session-sensitive'), false)
assert.equal([...generationFake.state.requests.values()].some((request) => request.sessionId === 'public-session-sensitive'), false)

generationFake.state.sessions.get(canonicalRequest.sessionId)!.expiresAt = new Date(fixedNow.getTime() - 1)
await runPublicAssistantRetention(generationFake.prisma, fixedNow)
assert.equal(generationFake.state.sessions.has(canonicalRequest.sessionId), false)
assert.equal([...generationFake.state.turns.values()].some((turn) => turn.sessionId === canonicalRequest.sessionId), false)
assert.equal([...generationFake.state.requests.values()].some((request) => request.sessionId === canonicalRequest.sessionId), false)

assert.equal(await persistPublicAssistantTurn(makeRequest('hello'), makeResponse('answer'), null, fixedNow), null)
assert.deepEqual(await savePublicAssistantFeedback(normalizedFeedback, null, fixedNow), { status: 'database-not-configured' })
assert.equal(await loadPublicAssistantInsights(null), null)
assert.equal(await loadPublicAssistantSessions(['public-session-1234'], null, fixedNow), null)
assert.deepEqual(await loadPublicAssistantSession('public-session-1234', null, fixedNow), { status: 'database-not-configured' })
assert.deepEqual(await deletePublicAssistantSession('public-session-1234', null, fixedNow), { status: 'database-not-configured' })

void future
console.log('Public assistant revision, branch, persistence, and retention contracts passed.')
