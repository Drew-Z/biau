export function createAiDailyPublicFixtureItem(overrides = {}) {
  return {
    publicId: 'flash-public-1',
    revision: 2,
    title: '公开 Flash 标题',
    factSummary: '这是 UI 检查使用的证据绑定事实摘要。',
    whyItMatters: '这条快讯用于确认公开阅读层的布局与来源边界。',
    uncertainty: '后续信息仍需继续观察。',
    approvedAt: '2026-07-19T10:00:00.000Z',
    updatedAt: '2026-07-19T10:00:00.000Z',
    corrected: true,
    correctedAt: '2026-07-19T11:00:00.000Z',
    citations: [
      {
        title: '公开来源标题',
        publisher: 'Example AI Lab',
        url: 'https://example.com/ai-daily/ui-check',
        publishedAt: '2026-07-19T09:00:00.000Z',
        excerpt: '公开来源摘要，用来检查引用卡片的换行和外链安全属性。',
      },
    ],
    ...overrides,
  }
}

export function createAiDailyPublicPayloads(item, freshnessOverrides = {}) {
  const freshness = {
    status: 'fresh',
    stale: false,
    staleAfterMinutes: 180,
    latestApprovalAt: item.approvedAt,
    latestProjectionAt: item.updatedAt,
    ...freshnessOverrides,
  }
  const feed = {
    items: [item],
    nextCursor: null,
    meta: {
      generatedAt: item.updatedAt,
      windowHours: 72,
      freshness,
      editorialCoverage: { scope: 'page', itemCount: 1, citedItemCount: 1, citationCoverage: 1 },
    },
  }
  const detail = { item, meta: { generatedAt: item.updatedAt, windowHours: 72, freshness } }
  return { feed, detail }
}
