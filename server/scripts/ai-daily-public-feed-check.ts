import express from 'express'
import type { Server } from 'node:http'
import { buildAiDailyCitationSnapshotFixture } from '../src/aiDailyFixtures.js'
import {
  buildAiDailyPublicFeedPayload,
  createAiDailyPublicRateLimiter,
  createPublicEtag,
  isSafePublicCitationUrl,
  serializeAiDailyPublicItem,
  type AiDailyPublicFlashRow,
  type AiDailyPublicRepository,
} from '../src/aiDailyPublic.js'
import { createAiDailyPublicRouter } from '../src/aiDailyPublicRoutes.js'
import { assert, assertEqual } from './ai-daily-check-helpers.js'

const now = new Date('2026-07-19T12:00:00.000Z')

function createRow(overrides: Partial<AiDailyPublicFlashRow> = {}): AiDailyPublicFlashRow {
  const approvedAt = new Date('2026-07-19T10:00:00.000Z')
  return {
    publicId: 'flash-public-1',
    lifecycleState: 'ACTIVE',
    currentApprovedRevisionId: 'revision-internal-1',
    publicRevision: 1,
    lastApprovedAt: approvedAt,
    withdrawnAt: null,
    retentionUntil: null,
    projectionUpdatedAt: approvedAt,
    currentApprovedRevision: {
      status: 'APPROVED',
      title: '公开 Flash 标题',
      factSummary: '有来源支持的事实摘要。',
      whyItMatters: '说明这条信息为什么值得关注。',
      uncertainty: '仍需持续观察后续变化。',
      correctionState: 'none',
      correctedAt: null,
      approvedAt,
      createdAt: approvedAt,
      citationSnapshotsJson: [buildAiDailyCitationSnapshotFixture()],
    },
    ...overrides,
  } as AiDailyPublicFlashRow
}

const active = createRow()
const corrected = createRow({
  publicId: 'flash-public-2',
  publicRevision: 2,
  currentApprovedRevisionId: 'revision-internal-2',
  currentApprovedRevision: {
    ...active.currentApprovedRevision!,
    title: '已修正的公开 Flash',
    correctionState: 'corrected',
    correctedAt: new Date('2026-07-19T11:00:00.000Z'),
  },
})
const held = createRow({ publicId: 'flash-held', lifecycleState: 'HELD' })
const withdrawn = createRow({ publicId: 'flash-withdrawn', lifecycleState: 'WITHDRAWN', withdrawnAt: new Date('2026-07-19T11:30:00.000Z') })
const expired = createRow({ publicId: 'flash-expired', lastApprovedAt: new Date('2026-07-10T10:00:00.000Z') })
const unapproved = createRow({
  publicId: 'flash-unapproved',
  currentApprovedRevisionId: null,
  currentApprovedRevision: null,
})
const allRows = [active, corrected, held, withdrawn, expired, unapproved]
let listCalls = 0

const repository: AiDailyPublicRepository = {
  async list({ limit, cursor, now: requestNow, windowHours }) {
    listCalls += 1
    const cutoff = requestNow.getTime() - windowHours * 60 * 60 * 1000
    const eligible = allRows
      .filter(
        (row) =>
          row.lifecycleState === 'ACTIVE' &&
          row.currentApprovedRevision?.status === 'APPROVED' &&
          row.lastApprovedAt !== null &&
          row.lastApprovedAt.getTime() >= cutoff &&
          (!row.retentionUntil || row.retentionUntil.getTime() > requestNow.getTime()),
      )
      .sort((left, right) => {
        const dateDelta = (right.lastApprovedAt?.getTime() ?? 0) - (left.lastApprovedAt?.getTime() ?? 0)
        return dateDelta || right.publicId.localeCompare(left.publicId)
      })
      .filter((row) => {
        if (!cursor) return true
        const date = row.lastApprovedAt?.getTime() ?? 0
        const cursorDate = Date.parse(cursor.lastApprovedAt)
        return date < cursorDate || (date === cursorDate && row.publicId < cursor.publicId)
      })
    return { rows: eligible.slice(0, limit), hasMore: eligible.length > limit }
  },
  async findByPublicId(publicId) {
    return allRows.find((row) => row.publicId === publicId) ?? null
  },
}

assert(isSafePublicCitationUrl('https://example.com/article'), 'public https citation should pass')
assert(!isSafePublicCitationUrl('http://127.0.0.1/private'), 'localhost citation should fail')
assert(!isSafePublicCitationUrl('https://metadata.google.internal/item'), 'metadata hostname should fail')

const serialized = serializeAiDailyPublicItem(active)
assert(serialized, 'approved active row should serialize')
const serializedText = JSON.stringify(serialized)
for (const forbidden of ['revision-internal-1', 'sourceItemId', 'evidenceId', 'contentHash', 'stableEventKey', 'provider']) {
  assert(!serializedText.includes(forbidden), `public DTO leaked ${forbidden}`)
}
assertEqual(serialized.citations.length, 1, 'public DTO citation count')
assert(serialized.corrected === false, 'base row should not be marked corrected')
assert(serializeAiDailyPublicItem(held) === null, 'held row should not serialize')

const stalePayload = buildAiDailyPublicFeedPayload(
  [createRow({ projectionUpdatedAt: new Date('2026-07-19T00:00:00.000Z'), lastApprovedAt: new Date('2026-07-19T00:00:00.000Z') })],
  null,
  now,
  72,
)
assert(stalePayload.meta.freshness.status === 'stale', 'old projection should be visibly stale')
assert(createPublicEtag(stalePayload) === createPublicEtag(stalePayload), 'ETag must be deterministic')
const limiterCheck = createAiDailyPublicRateLimiter({ limit: 1, windowMs: 60_000 })
assert(limiterCheck.check('fixture-client', now.getTime()).allowed, 'first rate-limited request should pass')
assert(!limiterCheck.check('fixture-client', now.getTime()).allowed, 'request above limit should fail')

const app = express()
app.use(
  createAiDailyPublicRouter({
    repository,
    now: () => new Date(now),
    corsOrigins: ['https://biau.playlab.eu.cc'],
    rateLimiter: createAiDailyPublicRateLimiter({ limit: 100, windowMs: 60_000 }),
  }),
)
let server: Server | null = null

try {
  server = await new Promise<Server>((resolve) => {
    const nextServer = app.listen(0, '127.0.0.1', () => resolve(nextServer))
  })
  const address = server.address()
  assert(address && typeof address !== 'string', 'public feed check server should expose a port')
  const base = `http://127.0.0.1:${address.port}`

  const firstQueryCount = listCalls
  const first = await fetch(`${base}/public/ai-daily/feed?limit=1`, {
    headers: { Origin: 'https://biau.playlab.eu.cc' },
  })
  assertEqual(first.status, 200, 'feed status')
  assertEqual(first.headers.get('access-control-allow-origin'), 'https://biau.playlab.eu.cc', 'feed CORS')
  assert(first.headers.get('cache-control')?.includes('s-maxage=60'), 'feed cache header')
  const firstPayload = (await first.json()) as { items: Array<{ publicId: string }>; nextCursor: string | null }
  assertEqual(firstPayload.items.length, 1, 'feed page size')
  assert(Boolean(firstPayload.nextCursor), 'feed should return a keyset cursor')
  assertEqual(listCalls, firstQueryCount + 1, 'feed request query budget')

  const notModified = await fetch(`${base}/public/ai-daily/feed?limit=1`, {
    headers: { 'If-None-Match': first.headers.get('etag') ?? '', Origin: 'https://biau.playlab.eu.cc' },
  })
  assertEqual(notModified.status, 304, 'feed ETag revalidation')

  const preflight = await fetch(`${base}/public/ai-daily/feed`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://biau.playlab.eu.cc', 'Access-Control-Request-Method': 'GET' },
  })
  assertEqual(preflight.status, 204, 'feed CORS preflight')
  assertEqual(preflight.headers.get('access-control-allow-methods'), 'GET, OPTIONS', 'feed CORS methods')

  const second = await fetch(`${base}/public/ai-daily/feed?limit=1&cursor=${encodeURIComponent(firstPayload.nextCursor!)}`)
  assertEqual(second.status, 200, 'feed cursor page status')
  const secondPayload = (await second.json()) as { items: Array<{ publicId: string }> }
  assertEqual(secondPayload.items[0]?.publicId, 'flash-public-1', 'feed cursor ordering')

  const fullFeed = await fetch(`${base}/public/ai-daily/feed?limit=40`)
  const fullFeedPayload = (await fullFeed.json()) as { items: Array<{ publicId: string }> }
  const publicIds = fullFeedPayload.items.map((item) => item.publicId)
  for (const hiddenPublicId of ['flash-held', 'flash-withdrawn', 'flash-expired', 'flash-unapproved']) {
    assert(!publicIds.includes(hiddenPublicId), `${hiddenPublicId} must remain absent from the public feed`)
  }

  const detail = await fetch(`${base}/public/ai-daily/events/flash-public-2`)
  assertEqual(detail.status, 200, 'corrected detail status')
  assert(detail.headers.get('cache-control')?.includes('s-maxage=60'), 'detail cache header')
  const detailPayload = (await detail.json()) as { item?: { corrected?: boolean } }
  assert(detailPayload.item?.corrected === true, 'corrected detail marker')
  const detailNotModified = await fetch(`${base}/public/ai-daily/events/flash-public-2`, {
    headers: { 'If-None-Match': detail.headers.get('etag') ?? '' },
  })
  assertEqual(detailNotModified.status, 304, 'detail ETag revalidation')

  const unknown = await fetch(`${base}/public/ai-daily/events/missing`)
  assertEqual(unknown.status, 404, 'unknown detail status')
  const heldResponse = await fetch(`${base}/public/ai-daily/events/flash-held`)
  assertEqual(heldResponse.status, 404, 'held detail status')
  const withdrawnResponse = await fetch(`${base}/public/ai-daily/events/flash-withdrawn`)
  assertEqual(withdrawnResponse.status, 410, 'withdrawn detail status')
  const expiredResponse = await fetch(`${base}/public/ai-daily/events/flash-expired`)
  assertEqual(expiredResponse.status, 410, 'expired detail status')

  const timingRows = Array.from({ length: 20 }, (_, index) =>
    createRow({ publicId: `flash-timing-${index + 1}`, lifecycleState: 'HELD' }),
  )
  allRows.push(...timingRows)
  const approvalToApiSamples: number[] = []
  for (const row of timingRows) {
    const startedAt = performance.now()
    row.lifecycleState = 'ACTIVE'
    row.lastApprovedAt = new Date(now)
    row.currentApprovedRevision!.approvedAt = new Date(now)
    const response = await fetch(`${base}/public/ai-daily/events/${row.publicId}`)
    assertEqual(response.status, 200, 'fixture approval should become public without a projection job')
    approvalToApiSamples.push(performance.now() - startedAt)
  }
  const sortedApprovalSamples = [...approvalToApiSamples].sort((left, right) => left - right)
  const approvalP95 = sortedApprovalSamples[Math.ceil(sortedApprovalSamples.length * 0.95) - 1] ?? Number.POSITIVE_INFINITY
  assert(approvalP95 <= 120_000, `fixture approval-to-public API p95 exceeded two minutes: ${approvalP95}ms`)

  const blockedOrigin = await fetch(`${base}/public/ai-daily/feed`, {
    headers: { Origin: 'https://evil.example' },
  })
  assertEqual(blockedOrigin.status, 403, 'disallowed origin')
  assert(listCalls >= 2, 'repository query should be exercised')

  const withdrawalBefore = await fetch(`${base}/public/ai-daily/feed?limit=40`)
  const activeBefore = await fetch(`${base}/public/ai-daily/events/flash-public-1`)
  const activeBeforeEtag = activeBefore.headers.get('etag')
  active.lifecycleState = 'WITHDRAWN'
  active.withdrawnAt = new Date(now)
  const afterWithdrawal = await fetch(`${base}/public/ai-daily/feed?limit=40`)
  const afterWithdrawalPayload = (await afterWithdrawal.json()) as { items: Array<{ publicId: string }> }
  assert(!afterWithdrawalPayload.items.some((item) => item.publicId === active.publicId), 'withdrawal must remove the item from the next feed projection')
  assert(afterWithdrawal.headers.get('etag') !== withdrawalBefore.headers.get('etag'), 'withdrawal must change the feed ETag')
  const withdrawnActiveDetail = await fetch(`${base}/public/ai-daily/events/${active.publicId}`)
  assertEqual(withdrawnActiveDetail.status, 410, 'withdrawn active item detail status')
  active.lifecycleState = 'ACTIVE'
  active.withdrawnAt = null
  active.publicRevision += 1
  active.currentApprovedRevision!.title = '修正后标题'
  const changed = await fetch(`${base}/public/ai-daily/events/flash-public-1`)
  assertEqual(changed.status, 200, 'corrected ETag detail status')
  assert(changed.headers.get('etag') !== activeBeforeEtag, 'public correction must change ETag')

  const limitedApp = express()
  limitedApp.use(
    createAiDailyPublicRouter({
      repository,
      now: () => new Date(now),
      rateLimiter: createAiDailyPublicRateLimiter({ limit: 1, windowMs: 60_000 }),
    }),
  )
  let limitedServer: Server | null = null
  try {
    limitedServer = await new Promise<Server>((resolve) => {
      const nextServer = limitedApp.listen(0, '127.0.0.1', () => resolve(nextServer))
    })
    const limitedAddress = limitedServer.address()
    assert(limitedAddress && typeof limitedAddress !== 'string', 'rate-limit fixture should expose a port')
    const limitedBase = `http://127.0.0.1:${limitedAddress.port}`
    const allowed = await fetch(`${limitedBase}/public/ai-daily/feed`)
    assertEqual(allowed.status, 200, 'rate-limit first request')
    const limited = await fetch(`${limitedBase}/public/ai-daily/feed`)
    assertEqual(limited.status, 429, 'rate-limit exceeded status')
    assert(Boolean(limited.headers.get('retry-after')), 'rate-limit response should include Retry-After')
  } finally {
    await new Promise<void>((resolve) => (limitedServer ? limitedServer.close(() => resolve()) : resolve()))
  }
} finally {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()))
}

console.log('AI Daily public feed check passed: projection, DTO safety, cache, CORS, pagination, rate limit, status, and stale semantics')
