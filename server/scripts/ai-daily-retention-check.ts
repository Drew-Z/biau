import {
  AI_DAILY_RETENTION_DRY_RUN_DEFAULT_LIMIT,
  AI_DAILY_RETENTION_DRY_RUN_MAX_LIMIT,
  buildAiDailyRetentionDryRunPlan,
  loadAiDailyRetentionDryRun,
  normalizeAiDailyRetentionDryRunLimit,
  parseAiDailyRetentionDryRunLimit,
  type AiDailyRetentionRecord,
} from '../src/aiDailyRetention.js'
import type { PrismaClient } from '@prisma/client'
import { assert, assertDeepEqual, assertEqual, expectFailure } from './ai-daily-check-helpers.js'

const now = new Date('2026-07-19T08:00:00.000Z')
const records: AiDailyRetentionRecord[] = [
  {
    kind: 'evidence',
    id: 'evidence-exact-boundary',
    boundaryAt: now,
    currentForCandidate: false,
  },
  {
    kind: 'evidence',
    id: 'evidence-current',
    boundaryAt: '2026-07-19T07:00:00.000Z',
    currentForCandidate: true,
  },
  {
    kind: 'evidence',
    id: 'evidence-future',
    boundaryAt: '2026-07-19T09:00:00.000Z',
    currentForCandidate: false,
  },
  {
    kind: 'evidence',
    id: 'evidence-invalid',
    boundaryAt: 'not-a-date',
    currentForCandidate: false,
  },
  {
    kind: 'flash-item',
    id: 'flash-active',
    boundaryAt: '2026-07-19T06:00:00.000Z',
    lifecycleState: 'ACTIVE',
  },
  {
    kind: 'flash-item',
    id: 'flash-current-approved',
    boundaryAt: '2026-07-19T06:10:00.000Z',
    lifecycleState: 'WITHDRAWN',
    currentApprovedRevisionId: 'revision-current',
    currentApprovedRevisionStatus: 'APPROVED',
    revisionCount: 1,
    approvalActionCount: 2,
  },
  {
    kind: 'flash-item',
    id: 'flash-audit-bound',
    boundaryAt: '2026-07-19T06:20:00.000Z',
    lifecycleState: 'WITHDRAWN',
    revisionCount: 0,
    approvalActionCount: 1,
  },
  {
    kind: 'flash-item',
    id: 'flash-revision-bound',
    boundaryAt: '2026-07-19T06:30:00.000Z',
    lifecycleState: 'WITHDRAWN',
    revisionCount: 1,
    approvalActionCount: 0,
  },
  {
    kind: 'flash-item',
    id: 'flash-unbound',
    boundaryAt: '2026-07-19T06:40:00.000Z',
    lifecycleState: 'WITHDRAWN',
    revisionCount: Number.NaN,
    approvalActionCount: -4,
  },
  {
    kind: 'flash-item',
    id: 'flash-unknown-state',
    boundaryAt: '2026-07-19T06:50:00.000Z',
    lifecycleState: 'https://private.example.invalid',
    currentApprovedRevisionStatus: 'provider-secret',
  },
]

const plan = buildAiDailyRetentionDryRunPlan(records, now, 6)
assertEqual(plan.policyVersion, 'retention-dry-run-v1', 'retention policy version')
assertEqual(plan.mode, 'dry-run', 'retention mode')
assertEqual(plan.mutationsApplied, false, 'retention dry-run must never mutate')
assertEqual(plan.observedCount, 6, 'retention observed count should match the returned window')
assertEqual(plan.eligibleCount, 1, 'retention eligible count should match the returned window')
assertEqual(plan.blockedCount, 5, 'retention blocked count should match the returned window')
assertEqual(plan.truncated, true, 'retention bounded candidate list')
assertEqual(plan.candidates.length, 6, 'retention candidate response limit')
assertEqual(plan.byReason['expired-and-unreferenced'], 0, 'truncated evidence should not affect returned-window counts')
assertEqual(plan.byReason['expired-and-unbound-flash'], 1, 'unbound withdrawn flash should be eligible')
assertEqual(plan.byReason['current-evidence'], 0, 'truncated current evidence should not affect returned-window counts')
assertEqual(plan.byReason['current-approved-revision'], 1, 'current approved flash should be protected')
assertEqual(plan.byReason['approval-audit-history'], 1, 'flash approval audit should be protected')
assertEqual(plan.byReason['revision-history'], 1, 'flash revision history should be protected')
assertEqual(plan.byReason['publication-lifecycle'], 2, 'active or unknown flash lifecycle should be protected')
assertEqual(plan.byReason['not-expired'], 0, 'truncated future evidence should not affect returned-window counts')
assertEqual(plan.byReason['invalid-boundary'], 0, 'truncated invalid boundary should not affect returned-window counts')
assertDeepEqual(
  plan.candidates.slice(0, 3).map((candidate) => candidate.id),
  ['flash-active', 'flash-current-approved', 'flash-audit-bound'],
  'retention candidates should have stable boundary ordering',
)

const sameBoundaryPlan = buildAiDailyRetentionDryRunPlan(
  [
    { kind: 'evidence', id: 'evidence-z', boundaryAt: now },
    { kind: 'evidence', id: 'evidence-a', boundaryAt: now },
    { kind: 'flash-item', id: 'flash-same-time', boundaryAt: now, lifecycleState: 'ACTIVE' },
  ],
  now,
  3,
)
assertDeepEqual(
  sameBoundaryPlan.candidates.map((candidate) => candidate.id),
  ['evidence-z', 'evidence-a', 'flash-same-time'],
  'same-kind ties should preserve repository order instead of applying a second collation',
)

const queryArgs: unknown[] = []
const mockPrisma = {
  aiDailyEvidenceDocument: {
    findMany: async (args: unknown) => {
      queryArgs.push(args)
      return [
        { id: 'evidence-loader-1', expiresAt: new Date('2026-07-19T05:00:00.000Z'), currentForCandidate: null },
        { id: 'evidence-loader-2', expiresAt: new Date('2026-07-19T07:00:00.000Z'), currentForCandidate: { id: 'candidate-current' } },
      ]
    },
  },
  aiDailyFlashItem: {
    findMany: async (args: unknown) => {
      queryArgs.push(args)
      return [
        {
          id: 'flash-loader-1',
          retentionUntil: new Date('2026-07-19T06:00:00.000Z'),
          lifecycleState: 'WITHDRAWN',
          currentApprovedRevisionId: null,
          currentApprovedRevision: null,
          _count: { revisions: 0, approvalActions: 0 },
        },
        {
          id: 'flash-loader-2',
          retentionUntil: new Date('2026-07-19T06:30:00.000Z'),
          lifecycleState: 'ACTIVE',
          currentApprovedRevisionId: null,
          currentApprovedRevision: null,
          _count: { revisions: 0, approvalActions: 0 },
        },
      ]
    },
  },
} as unknown as PrismaClient

const loadedPlan = await loadAiDailyRetentionDryRun(mockPrisma, now, 3)
assertEqual(loadedPlan.observedCount, 3, 'loader should bound summary counts to the returned window')
assertEqual(loadedPlan.candidates.length, 3, 'loader should bound returned candidates')
assertEqual(loadedPlan.truncated, true, 'loader should report more due records outside the window')
assertDeepEqual(
  loadedPlan.candidates.map((candidate) => candidate.id),
  ['evidence-loader-1', 'flash-loader-1', 'flash-loader-2'],
  'loader should merge ordered repository windows deterministically',
)
assertEqual((queryArgs[0] as { take?: number }).take, 4, 'evidence query should fetch one overflow row')
assertEqual((queryArgs[1] as { take?: number }).take, 4, 'flash query should fetch one overflow row')
assertDeepEqual(
  plan.candidates[4]?.references,
  { currentEvidence: false, currentApprovedRevision: false, revisions: 0, approvalActions: 0 },
  'retention reference counts should be bounded and normalized',
)

assertEqual(normalizeAiDailyRetentionDryRunLimit(Number.NaN), AI_DAILY_RETENTION_DRY_RUN_DEFAULT_LIMIT, 'invalid retention limit fallback')
assertEqual(normalizeAiDailyRetentionDryRunLimit(0), 1, 'minimum retention limit')
assertEqual(normalizeAiDailyRetentionDryRunLimit(999), AI_DAILY_RETENTION_DRY_RUN_MAX_LIMIT, 'maximum retention limit')
assertEqual(parseAiDailyRetentionDryRunLimit(undefined), AI_DAILY_RETENTION_DRY_RUN_DEFAULT_LIMIT, 'default parsed retention limit')
assertEqual(parseAiDailyRetentionDryRunLimit('12'), 12, 'explicit parsed retention limit')
for (const value of ['0', '201', '1.5', '-1', 'abc']) {
  await expectFailure(
    () => parseAiDailyRetentionDryRunLimit(value),
    'invalid-ai-daily-retention-limit',
    `invalid retention limit ${value}`,
  )
}

const serialized = JSON.stringify(plan).toLowerCase()
for (const forbidden of [
  'authorization',
  'database_url',
  'provider-secret',
  'private.example',
  'source_url',
  'normalizedtext',
  'citationsnapshot',
  'sk-',
]) {
  assert(!serialized.includes(forbidden), `retention dry-run must not include ${forbidden}`)
}

console.log('AI Daily retention dry-run check passed')
