import { randomInt, randomUUID } from 'node:crypto'
import express from 'express'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { aiDailyFixtureNow, buildAiDailySelectionFixtureCandidates } from '../src/aiDailyIngestionFixtures.js'
import { prepareAiDailyEvidenceSelection } from '../src/aiDailyIngestionService.js'
import {
  applyAiDailyEvidenceSelection,
  createAiDailyEvidenceDocument,
  listAiDailySourceFeeds,
  persistAiDailyClusters,
  persistAiDailyDedupe,
  recordAiDailySourceCollectionOutcome,
  toAiDailySourceFeedDefinition,
  updateAiDailySourceFeed,
  upsertAiDailyCandidate,
  upsertAiDailySourceFeed,
} from '../src/aiDailyIngestionRepository.js'

const databaseUrl = process.env.STUDIO_DATABASE_URL ?? ''
const database = readDisposableDatabase(databaseUrl)
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })

async function main() {
  const suffix = randomUUID().slice(0, 8)
  const feed = await upsertAiDailySourceFeed(prisma, {
    name: `Fixture feed ${suffix}`,
    kind: 'RSS',
    url: `https://feeds.example.com/${suffix}.xml?utm_source=fixture`,
    locale: 'en-US',
    tier: 'TIER_1',
    topics: ['models', 'agents'],
    officialDomain: 'feeds.example.com',
  })
  const repeatedFeed = await upsertAiDailySourceFeed(prisma, {
    name: `Fixture feed ${suffix}`,
    kind: 'RSS',
    url: `https://feeds.example.com/${suffix}.xml`,
    locale: 'en-US',
    tier: 'TIER_1',
    topics: ['models', 'agents'],
    officialDomain: 'feeds.example.com',
  })
  if (repeatedFeed.id !== feed.id) throw new Error('source feed canonical upsert must be idempotent')
  const updatedFeed = await updateAiDailySourceFeed(prisma, {
    id: feed.id,
    patch: { intervalMinutes: 20, lookbackMinutes: 40, topics: ['models', 'agents', 'platform'] },
  })
  const feedDefinition = toAiDailySourceFeedDefinition(updatedFeed)
  if (
    feedDefinition.canonicalUrl !== `https://feeds.example.com/${suffix}.xml` ||
    feedDefinition.intervalMinutes !== 20 ||
    feedDefinition.lookbackMinutes !== 40
  ) {
    throw new Error(`source feed projection is incorrect: ${JSON.stringify(feedDefinition)}`)
  }
  const expandedCadence = await updateAiDailySourceFeed(prisma, {
    id: feed.id,
    patch: { intervalMinutes: 120 },
  })
  if (expandedCadence.intervalMinutes !== 120 || expandedCadence.lookbackMinutes !== 120) {
    throw new Error('interval-only source updates must derive a database-valid overlap window')
  }
  await recordAiDailySourceCollectionOutcome(prisma, {
    sourceFeedId: feed.id,
    outcome: {
      attemptedAt: new Date('2031-01-01T00:00:00.000Z'),
      success: true,
      collectedAt: new Date('2031-01-01T00:00:05.000Z'),
      newestPublishedAt: new Date('2030-12-31T23:59:00.000Z'),
      etag: '"fixture"',
      lastModified: 'Wed, 01 Jan 2031 00:00:00 GMT',
      errorCategory: null,
    },
  })
  const listedFeeds = await listAiDailySourceFeeds(prisma, { enabled: true })
  const listedFeed = listedFeeds.find((item) => item.id === feed.id)
  if (listedFeed?.healthStatus !== 'HEALTHY' || listedFeed.lastLagMs !== 60_000) {
    throw new Error('source collection health projection was not persisted')
  }

  const editionDate = randomFixtureDate()
  const issue = await prisma.aiDailyIssue.create({
    data: {
      date: editionDate.toISOString().slice(0, 10),
      editionDate,
      title: `AI Daily ingestion repository fixture ${suffix}`,
      sourceIdsJson: [],
    },
  })
  const run = await prisma.aiDailyRun.create({
    data: {
      issueId: issue.id,
      editionDate,
      profile: 'FIXTURE',
      trigger: 'MANUAL',
      attemptNumber: 1,
      status: 'RUNNING',
      currentStage: 'FETCH',
      configVersion: 'ingestion-repository-check-v1',
    },
  })

  const fixtureCandidates = buildAiDailySelectionFixtureCandidates()
  const persistedCandidates = []
  for (const fixture of fixtureCandidates) {
    const row = await upsertAiDailyCandidate(prisma, {
      runId: run.id,
      sourceFeedId: feed.id,
      candidate: fixture,
    })
    const repeated = await upsertAiDailyCandidate(prisma, {
      runId: run.id,
      sourceFeedId: feed.id,
      candidate: fixture,
    })
    if (row.id !== repeated.id) throw new Error('candidate upsert must be idempotent')
    const evidence = await createAiDailyEvidenceDocument(prisma, {
      candidateId: row.id,
      evidence: {
        extractionMethod: 'DIRECT',
        originalUrl: fixture.originalUrl,
        canonicalUrl: fixture.canonicalUrl,
        title: fixture.title,
        publisher: fixture.publisher,
        author: null,
        publishedAt: fixture.publishedAt,
        fetchedAt: new Date('2026-07-18T00:01:00.000Z'),
        locale: fixture.locale,
        contentType: 'text/html',
        contentHash: fixture.contentHash,
        headings: ['Release', 'Details'],
        normalizedText: fixture.evidenceText,
        excerpt: fixture.evidenceText.slice(0, 1024),
        normalizedBytes: Buffer.byteLength(fixture.evidenceText, 'utf8'),
        status: 'READY',
        expiresAt: new Date('2026-08-17T00:01:00.000Z'),
      },
    })
    const secondEvidence = await createAiDailyEvidenceDocument(prisma, {
      candidateId: row.id,
      evidence: {
        extractionMethod: 'DIRECT',
        originalUrl: fixture.originalUrl,
        canonicalUrl: fixture.canonicalUrl,
        title: fixture.title,
        publisher: fixture.publisher,
        author: null,
        publishedAt: fixture.publishedAt,
        fetchedAt: new Date('2026-07-18T00:02:00.000Z'),
        locale: fixture.locale,
        contentType: 'text/html',
        contentHash: fixture.contentHash,
        headings: ['Release', 'Details'],
        normalizedText: fixture.evidenceText,
        excerpt: fixture.evidenceText.slice(0, 1024),
        normalizedBytes: Buffer.byteLength(fixture.evidenceText, 'utf8'),
        status: 'READY',
        expiresAt: new Date('2026-08-17T00:02:00.000Z'),
      },
    })
    if (evidence.version !== 1 || secondEvidence.version !== 2) {
      throw new Error('evidence documents must advance monotonically per candidate')
    }
    persistedCandidates.push({ ...fixture, id: row.id })
  }

  const qualified = prepareAiDailyEvidenceSelection({
    candidates: persistedCandidates,
    freshness: {
      now: aiDailyFixtureNow,
      lastTier1CollectedAt: new Date('2026-07-17T23:45:00.000Z'),
      lastDiscoveredAt: new Date('2026-07-17T22:30:00.000Z'),
      lastFetchedAt: new Date('2026-07-17T23:58:00.000Z'),
      newestPublishedAt: new Date('2026-07-17T23:40:00.000Z'),
      selectedEvidenceFetchedAt: persistedCandidates.map(() => new Date('2026-07-17T23:58:00.000Z')),
      tier1DiscoveryLagsMs: [8, 12, 18].map((minutes) => minutes * 60_000),
    },
  })
  if (!qualified.ready) throw new Error(`qualified selection should be ready: ${qualified.gaps.join(',')}`)
  await persistAiDailyDedupe(prisma, { runId: run.id, candidates: qualified.deduped })
  await persistAiDailyClusters(prisma, { runId: run.id, clusters: qualified.ranked })
  const firstSelection = await applyAiDailyEvidenceSelection(prisma, {
    runId: run.id,
    issueId: issue.id,
    selected: qualified.selected,
    selectedBy: 'ingestion-repository-check',
    selectionReason: 'deterministic fixture selection',
  })
  const repeatedSelection = await applyAiDailyEvidenceSelection(prisma, {
    runId: run.id,
    issueId: issue.id,
    selected: qualified.selected,
    selectedBy: 'ingestion-repository-check',
    selectionReason: 'deterministic fixture selection',
  })
  if (!firstSelection.changed || repeatedSelection.changed || firstSelection.selectionVersion !== repeatedSelection.selectionVersion) {
    throw new Error('repeated evidence selection must not create duplicate issue relations')
  }
  const selectedRelationCount = await prisma.aiDailyIssueSource.count({
    where: { issueId: issue.id, selectionVersion: firstSelection.selectionVersion },
  })
  if (selectedRelationCount !== qualified.selected.length) {
    throw new Error('selected issue relation count does not match deterministic selection')
  }

  const foreignRun = await prisma.aiDailyRun.create({
    data: {
      editionDate: new Date(editionDate.getTime() + 86_400_000),
      profile: 'FIXTURE',
      trigger: 'MANUAL',
      attemptNumber: 1,
      configVersion: 'ingestion-repository-check-v1',
    },
  })
  await expectFailure(
    () =>
      applyAiDailyEvidenceSelection(prisma, {
        runId: foreignRun.id,
        issueId: issue.id,
        selected: qualified.selected,
        selectedBy: 'ingestion-repository-check',
        selectionReason: 'cross-run rejection fixture',
      }),
    'ai-daily-selection-run-boundary-mismatch',
  )

  await verifyStudioSourceFeedRoutes({ databaseUrl, feedId: feed.id, suffix })

  console.log(`AI Daily ingestion repository check passed against disposable database ${database}`)
}

async function verifyStudioSourceFeedRoutes(input: { databaseUrl: string; feedId: string; suffix: string }) {
  process.env.STUDIO_ADMIN_TOKEN = 'test'
  process.env.STUDIO_DATABASE_URL = input.databaseUrl
  const [{ createStudioRouter }, { disconnectPrisma }] = await Promise.all([
    import('../src/studioRoutes.js'),
    import('../src/db.js'),
  ])
  const app = express()
  app.use(express.json())
  app.use('/studio/api', createStudioRouter())
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('studio-source-feed-check-address-unavailable')
    const baseUrl = `http://127.0.0.1:${address.port}/studio/api/ai-daily/source-feeds`
    const unauthorized = await fetch(baseUrl)
    if (unauthorized.status !== 401) throw new Error('source feed routes must require Studio authentication')
    const headers = {
      authorization: 'Bearer test',
      'content-type': 'application/json',
    }
    const listResponse = await fetch(baseUrl, { headers })
    const listPayload = (await listResponse.json()) as { feeds?: Array<{ id: string; lastErrorCategory?: string }> }
    if (!listResponse.ok || !listPayload.feeds?.some((feed) => feed.id === input.feedId)) {
      throw new Error('Studio source feed list route did not return the persisted feed')
    }
    const createResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `Manual source ${input.suffix}`,
        kind: 'manual',
        url: `https://manual.example.com/${input.suffix}`,
        locale: 'en-US',
        tier: 'tier_2',
        topics: ['agents'],
      }),
    })
    if (createResponse.status !== 201) {
      throw new Error(`Studio source feed create route failed with ${createResponse.status}`)
    }
    const invalidPatch = await fetch(`${baseUrl}/${input.feedId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ intervalMinutes: 'fast' }),
    })
    if (invalidPatch.status !== 400) throw new Error('Studio source feed patch must reject invalid cadence')
    const patchResponse = await fetch(`${baseUrl}/${input.feedId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ enabled: false, intervalMinutes: 30, lookbackMinutes: 60 }),
    })
    const patchPayload = (await patchResponse.json()) as { feed?: { enabled: boolean; intervalMinutes: number } }
    if (!patchResponse.ok || patchPayload.feed?.enabled !== false || patchPayload.feed.intervalMinutes !== 30) {
      throw new Error('Studio source feed patch route did not persist normalized fields')
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    await disconnectPrisma()
    delete process.env.STUDIO_ADMIN_TOKEN
    delete process.env.STUDIO_DATABASE_URL
  }
}

function randomFixtureDate() {
  const start = Date.UTC(2090, 0, 1)
  return new Date(start + randomInt(0, 3_000) * 86_400_000)
}

function readDisposableDatabase(value: string) {
  if (process.env.AI_DAILY_DATABASE_CHECK !== '1') throw new Error('ai-daily-database-check-not-enabled')
  if (!value) throw new Error('database-url-not-configured')
  const url = new URL(value)
  const databaseName = url.pathname.replace(/^\//u, '')
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !databaseName.endsWith('_test')) {
    throw new Error('ai-daily-ingestion-repository-check-requires-local-test-database')
  }
  return databaseName
}

async function expectFailure(action: () => Promise<unknown>, message: string) {
  try {
    await action()
  } catch (error) {
    if (error instanceof Error && error.message.includes(message)) return
    throw error
  }
  throw new Error(`expected failure containing ${message}`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
