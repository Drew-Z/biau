# AI Daily public assistant empty-state guidance

## Goal

让公开助手在访客询问 AI 日报栏目时，能够给出准确的空状态解释和下一步发布路径：AI Daily 目前走 Studio-first 内部流程，只有经过人工审核、Publish Export 和 Git diff 审查后才会进入公开博客列表。

用户价值是减少“栏目存在但没有公开文章”的迷茫感，同时避免公开助手把 AI Daily 问题误导到 Pet、Legal RAG 或泛博客内容上。

## Background And Evidence

- `/blog` 已经展示所有栏目，并对 AI 日报空栏目说明首发仍在准备中。
- `src/data/blogShared.ts` 已记录 AI Daily 的栏目定义和空状态文案。
- `docs/ai-daily-pipeline.md` 和 `docs/studio-ai-daily-production-readiness.md` 已定义 Studio-first 流程：来源池 -> AI Daily issue -> hidden / review-needed 草稿 -> 人工审核 -> Publish Export -> 静态博客数据。
- 当前公开助手知识库没有独立的 AI Daily 站点知识项。实测问题“AI日报为什么现在没有公开文章？下一步怎么发布？”会引用 `site:status`、Pet 和 Legal RAG 相关内容；问题“博客里的 AI 日报在哪里看？”会引用泛博客/项目文章，不能解释 AI Daily 空状态。
- 本切片不调用模型、不访问生产 Studio、不读取 token，只改公开静态知识和离线评测。

## Requirements

### R1. AI Daily public knowledge item

- 为公开助手增加一个 public-safe 的 AI Daily 站点知识项，说明：
  - AI 日报是独立博客栏目。
  - 当前公开列表可能没有文章，是因为首期仍处在 Studio 内部审核/导出门禁中。
  - 未审核的 hidden / review-needed 草稿不会展示给访客。
  - 正式公开需要人工审核、创建 Publish Export、本地或 CI 静态导出、Git diff 审查和质量检查。
- 文案不得包含真实 token、数据库 URL、模型 key、生产接口、私有来源或未审核正文。

### R2. Retrieval terms and answer quality

- AI Daily / 日报 / 首发 / Publish Export / hidden / review-needed 等问题应优先命中 AI Daily 知识项。
- 公开助手的本地 fallback 回答应说明审核与发布边界，而不是泛泛说“知识文章适合看方法”。
- 不改变私密凭据拒答逻辑。

### R3. Generated knowledge parity

- 重新生成 `server/data/public-knowledge.json` 和 `server/data/public-knowledge-v2.json`，让前端本地 fallback、Express API 和 Cloudflare Function 使用同一份公开知识。

### R4. Offline regression coverage

- 增加离线 assistant eval case，覆盖 AI Daily 空栏目/发布路径问题。
- 评测必须保持 `modelCalls=0`。

## Acceptance Criteria

- [ ] 问“AI 日报为什么现在没有公开文章？下一步怎么发布？”时，离线检索引用 `site:ai-daily`。
- [ ] 问“博客里的 AI 日报在哪里看？”时，离线检索引用 `site:ai-daily` 或能明确解释 AI Daily 栏目处于审核/导出前状态。
- [ ] `npm.cmd run assistant:index` 成功并更新生成知识文件。
- [ ] `npm.cmd run assistant:eval` 通过，报告显示 `modelCalls=0`。
- [ ] `npm.cmd run assistant:kg-check`、`npm.cmd run lint`、`npm.cmd run build` 通过。
- [ ] 任务完成后更新父任务实现记录或 manual gate 文档中的低敏进展，不新增人工阻塞。

## Out Of Scope

- 不发布 AI Daily 文章。
- 不连接生产 Studio，不创建 Publish Export，不读取或要求用户提供 Studio token。
- 不做模型真实调用、模型测活、网页抓取或每日自动化任务。
- 不更改博客公开 curation 规则。
