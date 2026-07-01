---
slug: "blog-content-system-build-log-draft"
title: "博客内容系统构建手记：如何把 AI 写作变成可审稿流水线"
column: "build-log"
series: "站点构建手记"
tag: "构建手记"
status: "draft"
generatedBy: "codex-draft-scaffold"
generatedAt: "2026-07-01T05:09:11.708Z"
modelStrategy: "Codex 先整理证据包与边界；如需长文改写，串行调用一个强内容模型；最后由 Codex 做事实核查、脱敏、结构调整和入库。"
---

# 博客内容系统构建手记：如何把 AI 写作变成可审稿流水线

## Evidence Pack
- .agents/skills/blog-content-pipeline/SKILL.md
- .agents/skills/blog-content-pipeline/references/templates.md
- .trellis/tasks/archive/2026-07/07-01-first-build-log-post/research.md
- src/data/blogShared.ts
- src/data/blogCuration.ts

## Safe Public Facts
- 博客系统已经使用 BlogColumn 表达五个一级栏目。
- 公开博客通过 blogCuration 控制可见性，未策展文章默认隐藏。
- blog-content-pipeline 要求先取证、再起草、再审稿和发布验证。

## Uncertain Or Stale Facts
- 后续是否接入具体外部模型和图片生成渠道，需要在单篇文章任务里按证据和成本决定。
- 旧博客内容是否全部重写或删除，需要另开清理任务确认。

## Forbidden / Private Details
- 不要写入模型中转站地址、API key、本地绝对路径或私有部署细节。
- 不要暗示草稿会自动公开发布。
- 不要编造访问量、SEO 增长或用户反馈指标。

## Draft Brief
- Column: 构建手记 / Build Log
- Column note: 适合记录站点、助手、内容系统和 Trellis 工作流演进。
- Target reader: 关注 AI 辅助内容生产、个人项目站点和技术博客治理的访客
- Summary: 围绕本站博客栏目化、公开策展和 blog-content-pipeline 的建设过程，先生成一份证据优先的构建手记草稿。
- Public angle: 强调内容发布不是自动生成文章，而是先收集证据、明确栏目、生成草稿、人工审稿，再决定是否公开。
- Knowledge points: 内容治理、AI 写作流水线、公开策展、Trellis 工作流
- Project examples: blog-semi 内容系统、公开助手知识索引、Trellis 任务归档

## Article Outline
- Starting point
- Decision made
- Implementation path
- Verification
- What became easier
- Follow-up work

## Model Strategy
- Codex 先整理证据包与边界；如需长文改写，串行调用一个强内容模型；最后由 Codex 做事实核查、脱敏、结构调整和入库。
- Default to serial model calls. Use multi-model comparison only for important posts, style uncertainty, or disputed wording.

## Review Gates
- [ ] Every project claim is backed by the evidence pack.
- [ ] No private or sensitive information is included.
- [ ] The draft does not duplicate stable project-detail-page facts.
- [ ] The selected column matches the actual purpose of the article.
- [ ] Hidden drafts remain hidden until explicitly curated.


## Promotion Checklist
- [ ] Convert reviewed content into `src/data/blog-posts/<slug>.ts` only after review.
- [ ] Add summary metadata to `src/data/blog.ts`.
- [ ] Register a loader in `src/data/blogContent.ts` only if the post should be public/loadable.
- [ ] Add `blogCuration` only when ready for public visibility.
- [ ] Run `npm.cmd run blog:audit`, `assistant:index`, `sitemap:generate`, `lint`, and `build` after public promotion.
