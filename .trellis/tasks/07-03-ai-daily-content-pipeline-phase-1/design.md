# AI 日报内容流水线一期 Design

## Boundary

Phase 1 只建立“手动来源输入 -> 离线草稿生成 -> 人工审核发布”的安全链路。它不自动抓全网热点、不定时发布、不调用模型、不写入真实 API key 或中转站配置。

## Column Contract

AI 日报继续使用现有 `BlogColumn` 的 `ai-daily` 栏目语义：

- 中文栏目：AI 日报。
- 英文副标题：AI Daily。
- 适合内容：有来源支撑的模型更新、工具变化、行业动态和短周期观察。
- 不适合内容：无来源快讯、标题搬运、夸张预测、无法追溯来源的热点。

## Source Input

第一版使用人工维护的 JSON 来源文件：

```json
{
  "date": "2026-07-05",
  "title": "AI Daily 示例标题",
  "items": [
    {
      "title": "来源标题",
      "url": "https://example.com/post",
      "source": "Official Blog",
      "publishedAt": "2026-07-05",
      "summary": "用自己的话概括，不复制原文。",
      "impact": "说明对开发者、产品或本站的影响。",
      "toVerify": ["发布前还要核对的问题"]
    }
  ]
}
```

`url` 必须是公开来源；`summary` 和 `impact` 必须由作者用自己的话写，避免复制新闻正文。

## Draft Output

新增脚本 `scripts/generate-ai-daily-draft.mjs`：

```powershell
npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json
npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --out content-drafts/ai-daily-2026-07-05.md
```

默认输出到 `content-drafts/ai-daily-<date>.md`。草稿保留 blog-content-pipeline 的 evidence-first scaffold：

- `## Evidence Pack`
- `## Safe Public Facts`
- `## Uncertain Or Stale Facts`
- `## Forbidden / Private Details`
- `## Draft Brief`
- `## Article Outline`
- `## Review Gates`
- `## Promotion Checklist`
- `## Draft Body`

`## Draft Body` 内使用日报结构：

- 今日摘要 / Daily Brief
- 逐条来源卡片
- 影响判断 / Why It Matters
- 待核查事项 / To Verify
- 发布建议 / Publish Gate

## Model Strategy

默认模式为 `Codex-only scaffold/review`，证据包记录 `model channel: none`。未来需要模型辅助时，沿用现有 `blog:model` 三档 profile：

- `strong`：长摘要或日报初稿。
- `review`：结构和语言润色。
- `fast`：低风险标题、要点或格式检查。

配置与检查只使用 masked/offline `status` 和 `doctor`。`doctor --live`、`blog:draft -- --generate` 或 AI 日报模型生成必须由用户显式批准，且只能执行真实小型内容任务，不能作为中转站测活。

## Publishing Gate

AI 日报第一版只生成 draft/manual-review 草稿。公开发布前必须：

1. 核对每条来源是否仍可访问、日期是否准确。
2. 确认摘要没有复制大段原文或歌词/受版权限制内容。
3. 删除或改写未经证实的“最新、最强、首个”等夸张表述。
4. 确认没有 API key、后台链接、账号、内部端点或私有模型渠道。
5. 通过 `blog:check`、`lint` 和 `build` 后再进入公开博客数据。
