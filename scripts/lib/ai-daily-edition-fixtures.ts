import { configurationHash } from '../horizon/editions.ts'

export async function editionFixture(slot: 'morning' | 'evening' = 'morning') {
  const hour = slot === 'morning' ? '00' : '12'
  return {
    schemaVersion: 1, editionId: `2026-11-05-${slot}`, scheduledFor: `2026-11-05T${hour}:00:00.000Z`,
    generatedAt: `2026-11-05T${hour}:10:00.000Z`, windowStart: `2026-11-04T${hour}:01:00.000Z`, windowEnd: `2026-11-05T${hour}:01:00.000Z`,
    markdown: '# 离线样例：AI 行业快讯\n\n这是一份离线测试期刊，不是真实新闻。\n\n[跳至模型更新](#model-news)\n\n<a id="model-news"></a>\n\n## 模型更新\n\n模型发布了新版本。具体能力、价格和上线范围请查看[官方来源](https://example.com/ai)。\n\n<details><summary>阅读背景</summary>这里保留完整的背景说明。</details>\n\n> 示例引用，不作为实际事实发布。\n',
    sourceLinks: [{ title: '离线样例：模型更新', publisher: 'Fixture source', url: 'https://example.com/ai' }],
    checks: { fetchStatus: 'success', failedSources: 0, raw: 2, scored: 2, selected: 1, enrichmentStatus: 'success', enriched: 1, failed: 0, summaryStage: 'enriched', language: 'zh', itemsUsed: 1 },
    runtime: { engineRevision: 'd7406f738c711df82b8f060fa1d5e9999d36cca0', configurationHash: await configurationHash(), requests: 3, usage: {} },
  }
}
