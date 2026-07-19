import {
  decodeAiDailyPublicPayload,
  type AiDailyPublicCitation,
  type AiDailyPublicFeedPayload,
} from '../src/utils/aiDailyPublicApi'

interface InvalidPayloadCase {
  name: string
  mutate: (payload: AiDailyPublicFeedPayload) => void
}

const issues: string[] = []

function assert(condition: unknown, message: string) {
  if (!condition) issues.push(message)
}

function buildValidFeed(): AiDailyPublicFeedPayload {
  return {
    items: [
      {
        publicId: 'flash-public-1',
        revision: 1,
        title: '公开 Flash 标题',
        factSummary: '经过公开投影的事实摘要。',
        whyItMatters: '说明这条变化为什么值得关注。',
        uncertainty: null,
        approvedAt: '2026-07-20T01:00:00.000Z',
        updatedAt: '2026-07-20T01:00:00.000Z',
        corrected: false,
        correctedAt: null,
        citations: [
          {
            title: '官方来源',
            publisher: 'Example Publisher',
            url: 'https://example.com/source',
            originalUrl: 'https://example.com/source?ref=original',
            publishedAt: '2026-07-20T00:00:00.000Z',
            excerpt: '公开引用摘录。',
            locator: { heading: 'Release notes', startChar: 0, endChar: 24 },
          },
        ],
      },
    ],
    nextCursor: null,
    meta: {
      generatedAt: '2026-07-20T01:00:00.000Z',
      windowHours: 72,
      freshness: {
        status: 'fresh',
        stale: false,
        staleAfterMinutes: 180,
        latestApprovalAt: '2026-07-20T01:00:00.000Z',
        latestProjectionAt: '2026-07-20T01:00:00.000Z',
      },
      editorialCoverage: {
        scope: 'page',
        itemCount: 1,
        citedItemCount: 1,
        citationCoverage: 1,
      },
    },
  }
}

function cloneValidFeed() {
  return structuredClone(buildValidFeed())
}

function firstCitation(payload: AiDailyPublicFeedPayload): AiDailyPublicCitation {
  const citation = payload.items[0]?.citations[0]
  if (!citation) throw new Error('invalid AI Daily public payload test fixture')
  return citation
}

function setLocator(payload: AiDailyPublicFeedPayload, locator: unknown) {
  ;(firstCitation(payload) as { locator?: unknown }).locator = locator
}

assert(decodeAiDailyPublicPayload(buildValidFeed()), 'valid public feed payload should decode')

const emptyFeed = buildValidFeed()
emptyFeed.items = []
emptyFeed.meta.editorialCoverage = {
  scope: 'page',
  itemCount: 0,
  citedItemCount: 0,
  citationCoverage: 0,
}
assert(decodeAiDailyPublicPayload(emptyFeed), 'zero item counts and zero coverage should remain valid')

const zeroLocator = buildValidFeed()
setLocator(zeroLocator, { startChar: 0, endChar: 0 })
assert(decodeAiDailyPublicPayload(zeroLocator), 'zero citation offsets should remain valid')

const invalidCases: InvalidPayloadCase[] = [
  { name: 'zero revision', mutate: (payload) => { payload.items[0].revision = 0 } },
  { name: 'negative revision', mutate: (payload) => { payload.items[0].revision = -1 } },
  { name: 'fractional revision', mutate: (payload) => { payload.items[0].revision = 1.5 } },
  { name: 'NaN revision', mutate: (payload) => { payload.items[0].revision = Number.NaN } },
  { name: 'infinite revision', mutate: (payload) => { payload.items[0].revision = Number.POSITIVE_INFINITY } },
  { name: 'unsafe revision', mutate: (payload) => { payload.items[0].revision = Number.MAX_SAFE_INTEGER + 1 } },
  { name: 'negative item count', mutate: (payload) => { payload.meta.editorialCoverage.itemCount = -1 } },
  { name: 'fractional item count', mutate: (payload) => { payload.meta.editorialCoverage.itemCount = 0.5 } },
  { name: 'NaN cited item count', mutate: (payload) => { payload.meta.editorialCoverage.citedItemCount = Number.NaN } },
  { name: 'infinite cited item count', mutate: (payload) => { payload.meta.editorialCoverage.citedItemCount = Number.POSITIVE_INFINITY } },
  { name: 'cited item count above total', mutate: (payload) => { payload.meta.editorialCoverage.citedItemCount = 2 } },
  { name: 'negative citation coverage', mutate: (payload) => { payload.meta.editorialCoverage.citationCoverage = -0.01 } },
  { name: 'citation coverage above one', mutate: (payload) => { payload.meta.editorialCoverage.citationCoverage = 1.01 } },
  { name: 'NaN citation coverage', mutate: (payload) => { payload.meta.editorialCoverage.citationCoverage = Number.NaN } },
  { name: 'infinite citation coverage', mutate: (payload) => { payload.meta.editorialCoverage.citationCoverage = Number.POSITIVE_INFINITY } },
  { name: 'zero window hours', mutate: (payload) => { payload.meta.windowHours = 0 } },
  { name: 'fractional window hours', mutate: (payload) => { payload.meta.windowHours = 1.5 } },
  { name: 'infinite window hours', mutate: (payload) => { payload.meta.windowHours = Number.POSITIVE_INFINITY } },
  { name: 'zero stale minutes', mutate: (payload) => { payload.meta.freshness.staleAfterMinutes = 0 } },
  { name: 'fractional stale minutes', mutate: (payload) => { payload.meta.freshness.staleAfterMinutes = 1.5 } },
  { name: 'NaN stale minutes', mutate: (payload) => { payload.meta.freshness.staleAfterMinutes = Number.NaN } },
  { name: 'negative locator start', mutate: (payload) => { setLocator(payload, { startChar: -1, endChar: 2 }) } },
  { name: 'fractional locator start', mutate: (payload) => { setLocator(payload, { startChar: 0.5, endChar: 2 }) } },
  { name: 'infinite locator end', mutate: (payload) => { setLocator(payload, { startChar: 0, endChar: Number.POSITIVE_INFINITY }) } },
  { name: 'reversed locator range', mutate: (payload) => { setLocator(payload, { startChar: 3, endChar: 2 }) } },
  { name: 'non-string locator heading', mutate: (payload) => { setLocator(payload, { heading: 42 }) } },
  { name: 'non-object locator', mutate: (payload) => { setLocator(payload, 'release notes') } },
]

for (const invalidCase of invalidCases) {
  const payload = cloneValidFeed()
  invalidCase.mutate(payload)
  assert(decodeAiDailyPublicPayload(payload) === null, `${invalidCase.name} should be rejected`)
}

if (issues.length > 0) {
  console.error(`AI Daily public payload check failed with ${issues.length} issue(s):`)
  for (const issue of issues) console.error(`- ${issue}`)
  process.exitCode = 1
} else {
  console.log(`AI Daily public payload check passed (${invalidCases.length} invalid cases, 3 valid cases)`)
}
