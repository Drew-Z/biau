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

const manifest = await loadAiDailySourceManifest()

assert.equal(manifest.schemaVersion, aiDailySourceManifestSchemaVersion)
assert.equal(manifest.readiness, 'pending-human-review')
assert.equal(manifest.review.status, 'candidate')
assert.equal(manifest.sources.length, 30)
assert.equal(manifest.queryGroups.length, 10)
assert.ok(manifest.sources.every((source) => !source.enabled && source.review.status === 'candidate'))
assert.ok(manifest.queryGroups.every((group) => !group.enabled && group.review.status === 'candidate'))
assert.ok(manifest.sources.filter((source) => source.locale === 'zh').length >= 4)
assert.ok(manifest.sources.filter((source) => source.tier === 'TIER_1').length >= 20)
assert.ok(manifest.queryGroups.some((group) => group.locale === 'zh'))
assert.ok(manifest.queryGroups.some((group) => group.id === 'frontier-model-releases'))
assert.ok(manifest.queryGroups.some((group) => group.id === 'ai-policy-safety'))
assert.ok(manifest.sources.every((source) => source.url.startsWith('https://')))
assert.equal(new Set(manifest.sources.map((source) => source.id)).size, manifest.sources.length)
assert.equal(new Set(manifest.sources.map((source) => source.canonicalUrl)).size, manifest.sources.length)
assert.equal(new Set(manifest.queryGroups.map((group) => group.id)).size, manifest.queryGroups.length)

const enabledBeforeApproval = mutateManifest(manifest, (draft) => {
  const sources = draft.sources as Array<Record<string, unknown>>
  sources[0].enabled = true
})
expectIssue(enabledBeforeApproval, 'sources[0].enabled-requires-approved-review')
expectIssue(enabledBeforeApproval, 'pending-manifest-has-enabled-source')

const incrementalReview = mutateManifest(manifest, (draft) => {
  const sources = draft.sources as Array<Record<string, unknown>>
  const review = sources[0].review as Record<string, unknown>
  review.status = 'approved'
  review.reviewedAt = '2026-07-19T00:00:00.000Z'
  review.reviewedBy = 'editor'
})
assert.equal(incrementalReview.ok, true)

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
})
expectIssue(unreviewedApproval, 'review.reviewer-required')

console.log(`AI Daily source manifest check passed (${manifest.sources.length} candidates, ${manifest.queryGroups.length} query groups, networkCalls=0)`)
