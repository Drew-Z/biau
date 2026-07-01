---
slug: "ozon-erp-project-notes-draft"
title: "Ozon ERP 项目总结：从运营脚本走向可交接的业务系统"
column: "project-notes"
series: "项目工程复盘"
tag: "项目总结"
status: "draft"
generatedBy: "codex-draft-scaffold"
generatedAt: "2026-07-01T05:28:20.084Z"
modelStrategy: "Codex 整理证据包后，优先由一个内容模型串行起草访客可读复盘；Codex 负责删除部署与业务敏感细节并核对每个系统能力。"
---

# Ozon ERP 项目总结：从运营脚本走向可交接的业务系统

## Evidence Pack
- D:\workspace4Cursor\erp\package.json
- D:\workspace4Cursor\erp\apps\api
- D:\workspace4Cursor\erp\apps\web
- D:\workspace4Cursor\erp\apps\extension
- D:\workspace4Cursor\erp\packages\shared
- D:\workspace4Cursor\erp\scripts
- D:\workspace4Cursor\erp\docs
- D:\workspace4Cursor\erp\docker-compose.yml
- src/data/portfolio.ts
- .trellis/tasks/07-01-project-notes-draft-evidence-packs/research/evidence-snapshots.md

## Safe Public Facts
- Ozon ERP 是包含 API、Web、Chrome 扩展、shared package、脚本、docs、Docker 和 compose 资产的 workspace 项目。
- 根脚本包含 Web/API/扩展开发、构建、测试、Prisma 生成、发布辅助和安全审计相关流程。
- API 侧包含 Prisma schema、routes、services、lib 和 worker 边界。
- Web 侧包含 Vue 路由、services、stores 和 views，用于运营后台体验。
- 扩展侧基于 WXT / Chrome MV3，并保留打包输出证据。
- 后续优化方向可以围绕发布清单、字段一致性漂移、插件打包、审计追踪、备份演练和公开文档展开。

## Uncertain Or Stale Facts
- 确切线上入口健康、店铺数量、业务指标和数据规模需要单独验证。
- 扩展打包产物可能包含历史版本，不能仅凭输出目录判断当前发布版本。

## Forbidden / Private Details
- 不要公开部署主机、用户名、IP、账号、数据库 URL、店铺凭证、Seller token、Cookie 或私有业务指标。
- 根部署脚本中出现的主机和账号信息只能抽象为部署脚本证据，不能写入公开草稿。
- 不要把内部运营数据写成公开案例素材。

## Draft Brief
- Column: 项目总结 / Project Notes
- Column note: 不要复制项目详情页；重点写阶段复盘、取舍、缺口和下一轮迭代。
- Target reader: 关注跨境电商运营系统、插件采集、后台 API 和业务数据治理的访客与开发者
- Summary: 整理 Ozon ERP 的后台、API、数据库、任务、共享包和 Chrome MV3 插件证据，形成一个面向访客的业务系统项目总结草稿。
- Public angle: 聚焦项目如何把店铺运营、商品采集、草稿编辑、定价利润、任务和审计组织成可维护系统，而不是只列技术栈。
- Knowledge points: 业务后台、Prisma 数据模型、Chrome MV3 插件、队列任务、审计与发布
- Project examples: Ozon ERP 管理后台、商品采集插件、共享业务规则包

## Article Outline
- Project stage and goal
- What changed or what was built
- Architecture or workflow choice
- Bugs, constraints, or tradeoffs
- What the project still lacks
- Next iteration direction

## Model Strategy
- Codex 整理证据包后，优先由一个内容模型串行起草访客可读复盘；Codex 负责删除部署与业务敏感细节并核对每个系统能力。
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
- Current decision: keep as draft; do not promote yet.
- Column fit: suitable for `project-notes` if framed around protected writes, plugin boundaries, auth entry polish, and run-mode decisions. Avoid repeating the project page's route/model inventory.
- Evidence to refresh before writing body:
  - `apps/web/src/views/LoginView.vue` for the new login/register/Owner setup entry.
  - Auth routes and runtime registration policy.
  - API tests around protected writes, queue behavior, and Chrome extension mapping.
  - Current extension release/version evidence if publicly safe.
- Human approval checklist:
  - Confirm whether the ERP branch has been merged before describing the auth polish as mainline.
  - Confirm no production registration policy change should be claimed.
  - Confirm whether to include screenshots of the login/register page.
  - Confirm whether model-assisted drafting is allowed for this specific post.

## Promotion Checklist
- [ ] Convert reviewed content into `src/data/blog-posts/<slug>.ts` only after review.
- [ ] Add summary metadata to `src/data/blog.ts`.
- [ ] Register a loader in `src/data/blogContent.ts` only if the post should be public/loadable.
- [ ] Add `blogCuration` only when ready for public visibility.
- [ ] Run `npm.cmd run blog:audit`, `assistant:index`, `sitemap:generate`, `lint`, and `build` after public promotion.
