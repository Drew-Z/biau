import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildAiDailyWorkIdempotencyKey,
  createAiDailyCanonicalSourceIdentity,
  evaluateAiDailyConfiguration,
  evaluateAiDailyEditorialTransition,
  evaluateAiDailyFlashLifecycleTransition,
  evaluateAiDailyFlashRevisionTransition,
  evaluateAiDailyGeneratedApplyTransition,
  evaluateAiDailyLease,
  evaluateAiDailyRunStageTransition,
  evaluateAiDailyRunTransition,
  evaluateAiDailyWorkTransition,
  normalizeAiDailyCitationSnapshotV2,
  parseAiDailyEditionDate,
} from '../src/aiDailyDomain.js'
import {
  buildAiDailyCitationSnapshotFixture,
  buildAiDailyConfigurationFixture,
  buildAiDailyIssueFixture,
  buildAiDailySourceFixture,
} from '../src/aiDailyFixtures.js'
import { formatAiDailyApplicationDate } from '../src/aiDailyScheduling.js'

function expectOk<T extends { ok: boolean }>(value: T, label: string): asserts value is T & { ok: true } {
  if (!value.ok) throw new Error(`${label} should pass: ${JSON.stringify(value)}`)
}

function expectError(value: { ok: boolean; error?: string }, error: string, label: string) {
  if (value.ok || value.error !== error) {
    throw new Error(`${label} should return ${error}: ${JSON.stringify(value)}`)
  }
}

if (formatAiDailyApplicationDate(new Date('2026-07-18T16:30:00.000Z'), 'Asia/Shanghai') !== '2026-07-19') {
  throw new Error('AI Daily application date should use Asia/Shanghai rather than UTC')
}
if (formatAiDailyApplicationDate(new Date('2026-07-18T16:30:00.000Z'), 'UTC') !== '2026-07-18') {
  throw new Error('AI Daily UTC date fixture should remain stable')
}

function expectTransitionDomainError(
  value: { ok: boolean; error?: string; domain?: string },
  domain: string,
  label: string,
) {
  if (value.ok || value.error !== 'invalid-ai-daily-transition' || value.domain !== domain) {
    throw new Error(`${label} should be rejected by ${domain}: ${JSON.stringify(value)}`)
  }
}

const fixtureReadiness = evaluateAiDailyConfiguration('FIXTURE', buildAiDailyConfigurationFixture({ database: false }))
if (!fixtureReadiness.ready) throw new Error('fixture profile should require deterministic fixture data only')

const degradedReadiness = evaluateAiDailyConfiguration(
  'DEGRADED',
  buildAiDailyConfigurationFixture({ search: false, compositionModel: false, verificationModel: false }),
)
if (!degradedReadiness.ready) throw new Error('degraded profile should remain available with database and official feeds')

const productionReadiness = evaluateAiDailyConfiguration(
  'PRODUCTION',
  buildAiDailyConfigurationFixture({ search: false, verificationModel: false }),
)
if (productionReadiness.ready || productionReadiness.missing.join(',') !== 'search,verificationModel') {
  throw new Error(`production readiness should expose missing roles: ${JSON.stringify(productionReadiness)}`)
}

expectOk(evaluateAiDailyRunTransition('QUEUED', 'RUNNING'), 'queued run start')
expectOk(evaluateAiDailyRunTransition('RUNNING', 'COMPLETED_WITH_GAPS'), 'degraded run completion')
expectError(evaluateAiDailyRunTransition('COMPLETED', 'RUNNING'), 'invalid-ai-daily-transition', 'terminal run restart')
expectOk(evaluateAiDailyRunStageTransition('FETCH', 'PROMOTE'), 'monotonic run stage advance')
expectError(
  evaluateAiDailyRunStageTransition('COMPOSE', 'FETCH'),
  'invalid-ai-daily-stage-transition',
  'run stage regression',
)

expectOk(evaluateAiDailyEditorialTransition('COLLECTING', 'EVIDENCE_READY'), 'evidence-ready issue')
expectOk(evaluateAiDailyEditorialTransition('REVIEW_NEEDED', 'EXPORTED'), 'reviewed edition export')
expectError(
  evaluateAiDailyEditorialTransition('COLLECTING', 'EXPORTED'),
  'invalid-ai-daily-transition',
  'unreviewed edition export',
)
expectOk(evaluateAiDailyWorkTransition('PENDING', 'LEASED'), 'work claim')
expectOk(evaluateAiDailyWorkTransition('LEASED', 'RETRY_WAIT'), 'retryable work failure')
expectError(evaluateAiDailyWorkTransition('SUCCEEDED', 'LEASED'), 'invalid-ai-daily-transition', 'completed work reclaim')
expectOk(evaluateAiDailyGeneratedApplyTransition('BLOCKED', 'APPLIED'), 'reviewed generated revision apply')
expectError(
  evaluateAiDailyGeneratedApplyTransition('APPLIED', 'DISCARDED'),
  'invalid-ai-daily-transition',
  'applied revision discard',
)
expectOk(evaluateAiDailyFlashLifecycleTransition('ACTIVE', 'HELD'), 'flash hold')
expectOk(evaluateAiDailyFlashLifecycleTransition('HELD', 'ACTIVE'), 'flash release')
expectError(
  evaluateAiDailyFlashLifecycleTransition('WITHDRAWN', 'ACTIVE'),
  'invalid-ai-daily-transition',
  'withdrawn flash restore',
)
expectOk(evaluateAiDailyFlashRevisionTransition('DRAFT', 'APPROVED'), 'flash revision approval')
expectOk(evaluateAiDailyFlashRevisionTransition('APPROVED', 'SUPERSEDED'), 'flash revision supersession')
expectError(
  evaluateAiDailyFlashRevisionTransition('SUPERSEDED', 'APPROVED'),
  'invalid-ai-daily-transition',
  'superseded revision reapproval',
)

expectTransitionDomainError(
  evaluateAiDailyRunTransition('PENDING' as never, 'LEASED' as never),
  'run',
  'work states passed to run guard',
)
expectTransitionDomainError(
  evaluateAiDailyEditorialTransition('ACTIVE' as never, 'HELD' as never),
  'editorial',
  'flash lifecycle states passed to editorial guard',
)
expectTransitionDomainError(
  evaluateAiDailyWorkTransition('QUEUED' as never, 'RUNNING' as never),
  'work',
  'run states passed to work guard',
)
expectTransitionDomainError(
  evaluateAiDailyGeneratedApplyTransition('DRAFT' as never, 'APPROVED' as never),
  'generated-apply',
  'flash revision states passed to generated apply guard',
)
expectTransitionDomainError(
  evaluateAiDailyFlashLifecycleTransition('PENDING' as never, 'APPLIED' as never),
  'flash-lifecycle',
  'generated apply states passed to flash lifecycle guard',
)
expectTransitionDomainError(
  evaluateAiDailyFlashRevisionTransition('COLLECTING' as never, 'EVIDENCE_READY' as never),
  'flash-revision',
  'editorial states passed to flash revision guard',
)

if (!parseAiDailyEditionDate('2026-07-17')) throw new Error('valid edition date should parse')
if (parseAiDailyEditionDate('2026-02-30') || parseAiDailyEditionDate('2026-7-17')) {
  throw new Error('invalid calendar dates must not be normalized silently')
}

const canonicalLeft = createAiDailyCanonicalSourceIdentity(
  'HTTPS://Example.COM:443/releases/model/?utm_source=daily&b=2&a=1#details',
)
const canonicalRight = createAiDailyCanonicalSourceIdentity('https://example.com/releases/model?a=1&b=2')
if (canonicalLeft.canonicalUrl !== canonicalRight.canonicalUrl || canonicalLeft.canonicalKey !== canonicalRight.canonicalKey) {
  throw new Error(`canonical identity should ignore tracking and parameter order: ${JSON.stringify({ canonicalLeft, canonicalRight })}`)
}
const canonicalVariant = createAiDailyCanonicalSourceIdentity('https://example.com/releases/model?a=2&b=2')
if (canonicalVariant.canonicalKey === canonicalLeft.canonicalKey) {
  throw new Error('canonical identity must preserve substantive query parameters')
}

const scheduledWorkKey = buildAiDailyWorkIdempotencyKey({
  editionDate: '2026-07-17',
  kind: 'collect_feed',
  scope: ' Official Feed ',
})
const manualWorkKey = buildAiDailyWorkIdempotencyKey({
  editionDate: '2026-07-17',
  kind: 'COLLECT_FEED',
  scope: 'official feed',
})
if (scheduledWorkKey !== manualWorkKey) throw new Error('manual and scheduled triggers must share logical work identity')

const activeLease = evaluateAiDailyLease({
  currentLeaseToken: 'lease-1',
  currentLeaseExpiresAt: new Date('2026-07-17T02:05:00.000Z'),
  providedLeaseToken: 'lease-1',
  now: new Date('2026-07-17T02:00:00.000Z'),
})
expectOk(activeLease, 'active work lease')
expectError(
  evaluateAiDailyLease({
    currentLeaseToken: 'lease-2',
    currentLeaseExpiresAt: new Date('2026-07-17T02:05:00.000Z'),
    providedLeaseToken: 'lease-1',
    now: new Date('2026-07-17T02:00:00.000Z'),
  }),
  'lease-token-mismatch',
  'stale worker lease token',
)
expectError(
  evaluateAiDailyLease({
    currentLeaseToken: 'lease-1',
    currentLeaseExpiresAt: new Date('2026-07-17T01:59:59.000Z'),
    providedLeaseToken: 'lease-1',
    now: new Date('2026-07-17T02:00:00.000Z'),
  }),
  'lease-expired',
  'expired work lease',
)

const citation = normalizeAiDailyCitationSnapshotV2(buildAiDailyCitationSnapshotFixture())
expectOk(citation, 'citation snapshot v2')
if (citation.snapshot.version !== 2 || !citation.snapshot.excerpt) throw new Error('citation snapshot should retain evidence')
expectError(
  normalizeAiDailyCitationSnapshotV2(buildAiDailyCitationSnapshotFixture({ excerpt: 'x'.repeat(1025) })),
  'invalid-citation-snapshot-v2',
  'oversized citation evidence',
)
expectError(
  normalizeAiDailyCitationSnapshotV2(buildAiDailyCitationSnapshotFixture({ originalUrl: 'file:///private/source' })),
  'invalid-citation-snapshot-v2',
  'non-public citation URL',
)

const sourceFixture = buildAiDailySourceFixture()
const issueFixture = buildAiDailyIssueFixture()
if (sourceFixture.id !== 'source-fixture-1' || issueFixture.selectionVersion !== 1) {
  throw new Error('shared domain fixtures should remain deterministic')
}

const schema = readFileSync(resolve('prisma/schema.prisma'), 'utf8')
for (const requiredContract of [
  'model AiDailyIssueSource',
  '@@unique([issueId, selectionVersion, position])',
  'model AiDailyWorkAttempt',
  'idempotencyKey',
  'leaseToken',
  'model AiDailyGeneratedRevision',
  'citationSchemaVersion',
  'model AiDailyFlashItem',
  'model AiDailyFlashRevision',
  'model AiDailyApprovalAction',
]) {
  if (!schema.includes(requiredContract)) throw new Error(`Prisma schema is missing AI Daily contract: ${requiredContract}`)
}

const migration = readFileSync(
  resolve('prisma/migrations/20260717010000_ai_daily_domain_foundation/migration.sql'),
  'utf8',
)
for (const requiredMigrationContract of [
  'sourceIdsJson compatibility backfill',
  'AiDailyFlashRevision_one_approved_per_item_key',
  'AiDailyFlashRevision_protect_content',
  'AiDailyApprovalAction_prevent_update',
  'AiDailyApprovalAction_prevent_delete',
]) {
  if (!migration.includes(requiredMigrationContract)) {
    throw new Error(`AI Daily migration is missing contract: ${requiredMigrationContract}`)
  }
}

console.log('AI Daily domain check passed')
