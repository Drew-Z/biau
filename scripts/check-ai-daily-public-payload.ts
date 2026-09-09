import strictAssert from 'node:assert/strict'
import {
  aiDailyInterfaceCopy,
  classifyAiDailyDetailError,
  classifyAiDailyFeedError,
  formatAiDailyDate,
  formatAiDailyTime,
} from '../src/data/aiDailyInterfaceCopy'
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

// Preserve the pre-localization error precedence, including overlapping signals.
const feedErrorCases = [
  [404, null, 'not-found', '公开 AI 日报接口尚未配置或没有公开入口。'],
  [429, null, 'rate-limited', '刷新太频繁，请稍后再试。'],
  [503, null, 'not-configured', '内容服务还没有连接到 Studio 数据库。'],
  [0, 'public-ai-daily-network-error', 'network', '浏览器无法连接内容服务，请稍后重试。'],
  [500, null, 'unavailable', '内容服务暂时返回异常状态。'],
  [200, 'invalid-public-ai-daily-response', 'unavailable', '内容服务暂时返回异常状态。'],
  [404, 'public-ai-daily-network-error', 'not-found', '公开 AI 日报接口尚未配置或没有公开入口。'],
  [429, 'public-ai-daily-network-error', 'rate-limited', '刷新太频繁，请稍后再试。'],
  [503, 'public-ai-daily-network-error', 'not-configured', '内容服务还没有连接到 Studio 数据库。'],
] as const
for (const [status, error, expected, originalCopy] of feedErrorCases) {
  const category = classifyAiDailyFeedError(status, error)
  strictAssert.equal(category, expected)
  strictAssert.equal(aiDailyInterfaceCopy.zh.feed.errors[category], originalCopy)
  strictAssert.ok(aiDailyInterfaceCopy.en.feed.errors[category].length > 0)
}
const detailErrorCases = [
  [404, null, 'not-found', '这条快讯不存在，或还没有通过公开审核。'],
  [410, 'public-item-withdrawn', 'withdrawn', '这条快讯已被撤回。'],
  [410, null, 'expired', '这条快讯已超过公开保留时间。'],
  [0, 'public-ai-daily-network-error', 'network', '浏览器无法连接内容服务，请稍后重试。'],
  [500, null, 'unavailable', '内容服务暂时返回异常状态。'],
  [200, 'invalid-public-ai-daily-response', 'unavailable', '内容服务暂时返回异常状态。'],
  [404, 'public-item-withdrawn', 'not-found', '这条快讯不存在，或还没有通过公开审核。'],
  [404, 'public-ai-daily-network-error', 'not-found', '这条快讯不存在，或还没有通过公开审核。'],
  [410, 'public-ai-daily-network-error', 'expired', '这条快讯已超过公开保留时间。'],
] as const
for (const [status, error, expected, originalCopy] of detailErrorCases) {
  const category = classifyAiDailyDetailError(status, error)
  strictAssert.equal(category, expected)
  strictAssert.equal(aiDailyInterfaceCopy.zh.detail.errors[category], originalCopy)
  strictAssert.ok(aiDailyInterfaceCopy.en.detail.errors[category].length > 0)
}
strictAssert.equal(aiDailyInterfaceCopy.zh.detail.errors['missing-id'], '缺少公开事件地址。')
strictAssert.equal(aiDailyInterfaceCopy.en.detail.errors['missing-id'], 'The public event address is missing.')

const approvalTime = '2026-07-19T10:05:00.000Z'
for (const language of ['zh', 'en'] as const) {
  const locale = language === 'zh' ? 'zh-CN' : 'en'
  for (const includeYear of [false, true]) {
    const originalOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    if (includeYear) originalOptions.year = 'numeric'
    strictAssert.equal(formatAiDailyDate(approvalTime, language, includeYear), new Intl.DateTimeFormat(locale, originalOptions).format(new Date(approvalTime)))
  }
  strictAssert.equal(formatAiDailyTime(Date.parse(approvalTime), language), new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(Date.parse(approvalTime)))
  for (const invalid of ['', 'not-a-time']) strictAssert.equal(formatAiDailyDate(invalid, language), language === 'zh' ? '时间待确认' : 'Time to be confirmed')
}
strictAssert.equal(formatAiDailyDate(approvalTime), formatAiDailyDate(approvalTime, 'zh'))
strictAssert.equal(formatAiDailyTime(Date.parse(approvalTime)), formatAiDailyTime(Date.parse(approvalTime), 'zh'))
strictAssert.deepEqual([0, 1, 3].map(aiDailyInterfaceCopy.en.feed.sources), ['Sources being collected', '1 public source', '3 public sources'])
strictAssert.deepEqual([0, 1, 3].map(aiDailyInterfaceCopy.zh.feed.sources), ['来源整理中', '1 个公开来源', '3 个公开来源'])

if (issues.length > 0) {
  console.error(`AI Daily public payload check failed with ${issues.length} issue(s):`)
  for (const issue of issues) console.error(`- ${issue}`)
  process.exitCode = 1
} else {
  console.log(`AI Daily public payload check passed (${invalidCases.length} invalid cases, 3 valid cases; ${feedErrorCases.length + detailErrorCases.length + 1} UI error contracts; both date locales and original Chinese defaults)`)
}
