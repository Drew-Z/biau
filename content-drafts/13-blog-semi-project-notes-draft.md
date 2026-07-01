---
slug: "blog-semi-project-notes-draft"
title: "BIAU Port 项目总结：React + Semi 主站如何承接项目案例和博客治理"
column: "project-notes"
series: "项目工程复盘"
tag: "项目总结"
status: "draft"
generatedBy: "codex-draft-scaffold"
generatedAt: "2026-07-01T05:28:20.574Z"
modelStrategy: "Codex 已能直接生成证据包草稿；若后续写正式长文，串行调用一个强内容模型改写表达，再由 Codex 复核事实、脱敏和入库。"
---

# BIAU Port 项目总结：React + Semi 主站如何承接项目案例和博客治理

## Evidence Pack
- package.json
- src/data/blogShared.ts
- src/data/blogCuration.ts
- src/data/blogContent.ts
- src/data/portfolio.ts
- scripts/generate-blog-draft.mjs
- scripts/check-public-blog.mjs
- scripts/audit-blog-catalog.ts
- scripts/verify.mjs
- .agents/skills/blog-content-pipeline/SKILL.md
- .agents/skills/blog-content-pipeline/references/templates.md
- .trellis/tasks/archive/2026-07/07-01-first-build-log-post
- .trellis/tasks/07-01-project-notes-draft-evidence-packs/research/evidence-snapshots.md

## Safe Public Facts
- BIAU Port 是 React、Vite、TypeScript 和 Semi Design 构建的产品/解决方案展示主站。
- 博客系统当前有 Knowledge Notes、Project Notes、Resource Picks、AI Daily 和 Build Log 五个一级栏目。
- 公开博客通过策展数据控制可见性，draft 文件保留在 content-drafts 中。
- 草稿生成器支持 evidence-first scaffold，也保留显式 --generate 的模型辅助路径。
- 公开博客检查脚本能校验旧结构草稿和新 evidence-pack 草稿。
- 后续优化方向可以围绕草稿 schema 校验、可选 Markdown ingestion、公开助手知识对齐、旧博客清理和更强 review gates 展开。

## Uncertain Or Stale Facts
- 是否从 TypeScript blog object 迁移到 Markdown collections 应作为未来设计任务，不在当前草稿任务中决定。
- 旧博客内容清理另有后续任务，不应在这篇草稿里假设已经完成。

## Forbidden / Private Details
- 不要写入模型中转站 URL、API key、本地 secret 路径、私有部署细节或未公开助手内部材料。
- 不要把 draft-only evidence pack 当作已发布文章引用。
- 不要编造访问量、SEO 效果或用户反馈指标。

## Draft Brief
- Column: 项目总结 / Project Notes
- Column note: 不要复制项目详情页；重点写阶段复盘、取舍、缺口和下一轮迭代。
- Target reader: 关注项目展示站、内容治理、AI 助手知识索引和前端工程化的访客与协作者
- Summary: 整理当前主站的 React/Vite/Semi 架构、项目数据、博客栏目、草稿生成器、公开策展和校验脚本，形成主站自身的项目总结草稿。
- Public angle: 复盘主站如何从作品展示页发展成项目案例、博客栏目、公开助手和 Trellis 内容治理共同工作的产品入口。
- Knowledge points: React 主站、Semi Design、项目案例数据、博客栏目、公开策展、AI 助手知识索引
- Project examples: BIAU Port 主站、blog-content-pipeline、Project Notes 草稿系统

## Article Outline
- Project stage and goal
- What changed or what was built
- Architecture or workflow choice
- Bugs, constraints, or tradeoffs
- What the project still lacks
- Next iteration direction

## Model Strategy
- Codex 已能直接生成证据包草稿；若后续写正式长文，串行调用一个强内容模型改写表达，再由 Codex 复核事实、脱敏和入库。
- Default to serial model calls. Use multi-model comparison only for important posts, style uncertainty, or disputed wording.

## Review Gates
- [ ] Every project claim is backed by the evidence pack.
- [ ] No private or sensitive information is included.
- [ ] The draft does not duplicate stable project-detail-page facts.
- [ ] The selected column matches the actual purpose of the article.
- [ ] Hidden drafts remain hidden until explicitly curated.

- [ ] Read code, data modules, tests, deployment scripts, screenshots, and Trellis tasks. Do not rely only on README files.

## Review Notes - 2026-07-02

- Review mode: review-only / Codex-only.
- Model channel: none.
- Current decision: reframe before promotion; do not publish as-is.
- Column fit: weaker as `project-notes`, stronger as `build-log` or `knowledge`. The useful angle is public content governance and evidence-first workflow, not a self-referential project summary.
- Evidence to refresh before writing body:
  - Current blog column model and curation selectors.
  - `blog-content-pipeline` skill usage, model setup wizard, and safe backlog.
  - Assistant public knowledge generation and sitemap/blog checks.
  - Trellis task archive for the content cleanup and overnight optimization work.
- Human approval checklist:
  - Decide whether this should become a build-log article instead of project-notes.
  - Confirm whether to mention model channels by public labels only.
  - Confirm no private relay URL, API key, local path, or deployment secret is included.
  - Confirm whether model-assisted drafting is allowed for this specific post.

## Promotion Checklist
- [ ] Convert reviewed content into `src/data/blog-posts/<slug>.ts` only after review.
- [ ] Add summary metadata to `src/data/blog.ts`.
- [ ] Register a loader in `src/data/blogContent.ts` only if the post should be public/loadable.
- [ ] Add `blogCuration` only when ready for public visibility.
- [ ] Run `npm.cmd run blog:audit`, `assistant:index`, `sitemap:generate`, `lint`, and `build` after public promotion.
