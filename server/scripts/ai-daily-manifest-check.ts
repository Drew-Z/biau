import assert from 'node:assert/strict'
import {
  aiDailySourceManifestSchemaVersion,
  loadAiDailySourceManifest,
  parseAiDailySourceManifest,
  type AiDailySourceManifest,
} from '../src/aiDailySourceManifest.js'

function cloneManifest(manifest: AiDailySourceManifest): unknown {
  return JSON.parse(JSON.stringify(manifest)) as unknown
}

function mutateManifest(manifest: AiDailySourceManifest, mutate: (draft: Record<string, unknown>) => void) {
  const value = cloneManifest(manifest)
  assert.equal(typeof value, 'object')
  assert.notEqual(value, null)
  mutate(value as Record<string, unknown>)
  return parseAiDailySourceManifest(value)
}

function expectIssue(result: ReturnType<typeof parseAiDailySourceManifest>, issue: string) {
  assert.equal(result.ok, false)
  if (!result.ok) assert.ok(result.issues.includes(issue), `expected ${issue}; got ${result.issues.join(', ')}`)
}

function countReviewStatuses(items: Array<{ review: { status: string } }>) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.review.status] = (counts[item.review.status] ?? 0) + 1
    return counts
  }, {})
}

const manifest = await loadAiDailySourceManifest()

assert.equal(manifest.schemaVersion, aiDailySourceManifestSchemaVersion)
assert.equal(manifest.readiness, 'approved')
assert.equal(manifest.review.status, 'approved')
assert.ok(manifest.review.reviewedAt)
assert.ok(manifest.review.reviewedBy)
assert.equal(manifest.sources.length, 30)
assert.equal(manifest.queryGroups.length, 10)
assert.equal(manifest.sources.filter((source) => source.enabled).length, 16)
assert.equal(manifest.queryGroups.filter((group) => group.enabled).length, 4)
assert.ok(manifest.sources.every((source) => source.enabled === (source.review.status === 'approved')))
assert.ok(manifest.queryGroups.every((group) => group.enabled === (group.review.status === 'approved')))
assert.ok(manifest.sources.some((source) => source.review.status === 'approved'))
assert.ok(manifest.sources.some((source) => source.review.status === 'hold'))
assert.ok(manifest.sources.some((source) => source.review.status === 'rejected'))
assert.ok(manifest.queryGroups.some((group) => group.review.status === 'approved'))
assert.ok(manifest.queryGroups.some((group) => group.review.status === 'hold'))
assert.ok(manifest.queryGroups.some((group) => group.review.status === 'rejected'))
assert.ok(manifest.sources.filter((source) => source.locale === 'zh').length >= 4)
assert.ok(manifest.sources.filter((source) => source.tier === 'TIER_1').length >= 20)
assert.ok(manifest.queryGroups.some((group) => group.locale === 'zh'))
assert.ok(manifest.queryGroups.some((group) => group.id === 'frontier-model-releases'))
assert.ok(manifest.queryGroups.some((group) => group.id === 'ai-policy-safety'))
assert.ok(manifest.sources.every((source) => source.url.startsWith('https://')))
assert.equal(new Set(manifest.sources.map((source) => source.id)).size, manifest.sources.length)
assert.equal(new Set(manifest.sources.map((source) => source.canonicalUrl)).size, manifest.sources.length)
assert.equal(new Set(manifest.queryGroups.map((group) => group.id)).size, manifest.queryGroups.length)

const unapprovedSourceIndex = manifest.sources.findIndex((source) => source.review.status !== 'approved')
assert.notEqual(unapprovedSourceIndex, -1)

const enabledWithoutApproval = mutateManifest(manifest, (draft) => {
  const sources = draft.sources as Array<Record<string, unknown>>
  sources[unapprovedSourceIndex].enabled = true
})
expectIssue(enabledWithoutApproval, `sources[${unapprovedSourceIndex}].enabled-requires-approved-review`)

const pendingManifestWithEnabledEntries = mutateManifest(manifest, (draft) => {
  draft.readiness = 'pending-human-review'
  const review = draft.review as Record<string, unknown>
  review.status = 'candidate'
  review.reviewedAt = null
  review.reviewedBy = null
})
expectIssue(pendingManifestWithEnabledEntries, 'pending-manifest-has-enabled-source')
expectIssue(pendingManifestWithEnabledEntries, 'pending-manifest-has-enabled-query-group')

const incrementalReview = mutateManifest(manifest, (draft) => {
  const sources = draft.sources as Array<Record<string, unknown>>
  const review = sources[0].review as Record<string, unknown>
  review.status = 'approved'
  review.reviewedAt = '2026-07-19T00:00:00.000Z'
  review.reviewedBy = 'editor'
})
assert.equal(incrementalReview.ok, true)

const heldReview = mutateManifest(manifest, (draft) => {
  const sources = draft.sources as Array<Record<string, unknown>>
  sources[0].enabled = false
  const review = sources[0].review as Record<string, unknown>
  review.status = 'hold'
  review.reviewedAt = '2026-07-19T00:00:00.000Z'
  review.reviewedBy = 'editor'
})
assert.equal(heldReview.ok, true)

const duplicateUrl = mutateManifest(manifest, (draft) => {
  const sources = draft.sources as Array<Record<string, unknown>>
  sources[1].url = sources[0].url
  sources[1].officialDomain = sources[0].officialDomain
})
expectIssue(duplicateUrl, 'sources[1].canonical-url-duplicate')

const privateUrl = mutateManifest(manifest, (draft) => {
  const sources = draft.sources as Array<Record<string, unknown>>
  sources[0].url = 'https://127.0.0.1/private'
  sources[0].officialDomain = '127.0.0.1'
})
expectIssue(privateUrl, 'sources[0].url-not-public-https')

const invalidBudget = mutateManifest(manifest, (draft) => {
  const queryGroups = draft.queryGroups as Array<Record<string, unknown>>
  const budget = queryGroups[0].budget as Record<string, unknown>
  budget.timeoutMs = 120_000
})
expectIssue(invalidBudget, 'queryGroups[0].budget.timeoutMs-out-of-range')

const impossiblePrimaryTarget = mutateManifest(manifest, (draft) => {
  const queryGroups = draft.queryGroups as Array<Record<string, unknown>>
  queryGroups[0].minimumPrimaryResults = 30
})
expectIssue(impossiblePrimaryTarget, 'queryGroups[0].minimum-primary-results-too-large')

const conflictingDomains = mutateManifest(manifest, (draft) => {
  const queryGroups = draft.queryGroups as Array<Record<string, unknown>>
  queryGroups[0].includeDomains = ['github.com']
  queryGroups[0].excludeDomains = ['github.com']
})
expectIssue(conflictingDomains, 'queryGroups[0].domain-in-include-and-exclude')

const unreviewedApproval = mutateManifest(manifest, (draft) => {
  draft.readiness = 'approved'
  const review = draft.review as Record<string, unknown>
  review.status = 'approved'
  review.reviewedAt = null
  review.reviewedBy = null
})
expectIssue(unreviewedApproval, 'review.reviewer-required')

const reviewedSubsetApproval = mutateManifest(manifest, (draft) => {
  draft.readiness = 'approved'
  const review = draft.review as Record<string, unknown>
  review.status = 'approved'
  review.reviewedAt = '2026-07-19T00:00:00.000Z'
  review.reviewedBy = 'editor'
})
assert.equal(reviewedSubsetApproval.ok, true)

const incompleteSubsetApproval = mutateManifest(manifest, (draft) => {
  draft.readiness = 'approved'
  const review = draft.review as Record<string, unknown>
  review.status = 'approved'
  review.reviewedAt = '2026-07-19T00:00:00.000Z'
  review.reviewedBy = 'editor'
  const sources = draft.sources as Array<Record<string, unknown>>
  sources[0].review = { status: 'candidate', reviewedAt: null, reviewedBy: null, notes: 'Awaiting review.' }
})
expectIssue(incompleteSubsetApproval, 'approved-sources-review-incomplete')

const sourceReviewCounts = countReviewStatuses(manifest.sources)
const queryReviewCounts = countReviewStatuses(manifest.queryGroups)

console.log(
  `AI Daily source manifest check passed (${manifest.sources.length} sources, ${manifest.queryGroups.length} query groups, enabledSources=${manifest.sources.filter((source) => source.enabled).length}, enabledQueries=${manifest.queryGroups.filter((group) => group.enabled).length}, sourceReviews=${JSON.stringify(sourceReviewCounts)}, queryReviews=${JSON.stringify(queryReviewCounts)}, networkCalls=0)`,
)
