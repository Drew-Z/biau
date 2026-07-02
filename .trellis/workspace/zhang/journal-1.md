# Journal - zhang (Part 1)

> AI development session journal
> Started: 2026-06-30

---



## Session 1: Bootstrap Trellis guidelines

**Date**: 2026-06-30
**Task**: Bootstrap Trellis guidelines
**Branch**: `main`

### Summary

Initialized Trellis project workflow and populated backend/frontend specs from AGENTS.md, CLAUDE.md, Cursor rules, and local code evidence.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `77d37b4` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Complete AI Assistant MVP

**Date**: 2026-06-30
**Task**: Complete AI Assistant MVP
**Branch**: `main`

### Summary

Finished the assistant MVP with public/internal fallback UI, invite redemption, lightweight admin API wiring, backend contract hardening, docs/spec updates, and full verify passing.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `18b181b` | (see git log) |
| `aa6ecb8` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Enhance Legal RAG project page

**Date**: 2026-06-30
**Task**: Enhance Legal RAG project page
**Branch**: `main`

### Summary

Planned the project-page content enhancement task tree, implemented the Legal RAG visitor-readable case study page, updated assistant public knowledge projection, and captured the reusable project detail content convention in frontend specs.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `4ca0ee2` | (see git log) |
| `f90b96b` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: Enhance Xunqiu project page

**Date**: 2026-06-30
**Task**: Enhance Xunqiu project page
**Branch**: `main`

### Summary

Enhanced the Xunqiu project page as a visitor-readable mobile migration case study, moved Xunqiu onto reusable detailContent/assistantContext data, regenerated public assistant knowledge, validated with npm.cmd run verify, and archived the child task.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `8197c44` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: Enhance ERP project page

**Date**: 2026-06-30
**Task**: Enhance ERP project page
**Branch**: `main`

### Summary

Enhanced the Ozon ERP project page as a visitor-readable commerce operations case study, moved ERP content to reusable detailContent/assistantContext data, removed the hard-coded ERP detail article, regenerated public assistant knowledge, and validated with npm.cmd run verify.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `9d9aa74` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 6: Enhance game and pet project knowledge

**Date**: 2026-06-30
**Task**: Enhance game and pet project knowledge
**Branch**: `main`

### Summary

Enhanced Biau Playlab, six game entries, and AI pet workspace project-page data with public-safe technical case content; regenerated assistant public knowledge and completed final verification.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `2710b5a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 7: Project assistant QA

**Date**: 2026-06-30
**Task**: Project assistant QA
**Branch**: `main`

### Summary

Verified project-page assistant knowledge, fixed backend public-knowledge loading, improved public assistant search relevance, regenerated generated knowledge, added smoke regression, and recorded the runtime knowledge contract in specs.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `960e7a8` | (see git log) |
| `546c795` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 8: Blog content cleanup

**Date**: 2026-07-01
**Task**: Blog content cleanup
**Branch**: `main`

### Summary

Curated public blog content down to 9 selected posts, hid bulk generated posts from public routes/search/assistant/sitemap/runtime loaders, and recorded the public blog curation contract.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `df9b941` | (see git log) |
| `7215ddf` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 9: Blog column content system

**Date**: 2026-07-01
**Task**: Blog column content system
**Branch**: `main`

### Summary

Migrated public blog content from legacy categories to first-level BlogColumn metadata, added bilingual column filtering, updated curation/search/assistant tags, created the blog-content-pipeline skill and templates, refreshed specs, and verified the full project.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `3bffcd3` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 10: Publish first build log post

**Date**: 2026-07-01
**Task**: Publish first build log post
**Branch**: `main`

### Summary

Published the first Build Log article, validated the blog/public assistant/sitemap pipeline, and recorded external blog-generation workflow research.

### Main Changes

- Published the first public Build Log article and wired it into blog summaries, full-post loader, public curation, assistant knowledge, and sitemap.
- Added research notes comparing external AI/blog-generation workflows and keeping this site on an evidence-first, PR-reviewed content pipeline.
- Updated the UI pagination check so it follows the curated article count instead of a stale hard-coded value.
- Verification passed: blog:audit, assistant:index, sitemap:generate, lint, build, and full verify.


### Git Commits

| Hash | Message |
|------|---------|
| `2ac3419` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 11: Upgrade blog draft generator

**Date**: 2026-07-01
**Task**: Upgrade blog draft generator
**Branch**: `main`

### Summary

Upgraded the blog draft pipeline into a column-aware, evidence-first scaffold workflow with optional model generation and updated checks.

### Main Changes

- Upgraded the existing blog draft generator into a BlogColumn-aware evidence-first scaffold workflow.
- Preserved npm run blog:plan/blog:draft while making default draft generation model-free and moving optional model calls behind --generate.
- Added a Build Log sample draft topic plus generated content-drafts/07-blog-content-system-build-log-draft.md.
- Updated blog:check to support both legacy knowledge drafts and new evidence-pack drafts.
- Verified no public blog data, assistant index, or sitemap paths were changed by the draft-only workflow.
- Validation passed: blog:plan, blog:draft sample, blog:check, lint, build, verify.


### Git Commits

| Hash | Message |
|------|---------|
| `5e6de8a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 12: Project notes draft evidence packs

**Date**: 2026-07-01
**Task**: Project notes draft evidence packs
**Branch**: `main`

### Summary

Prepared the first Project Notes evidence-pack batch: added six project-notes plan entries, generated draft scaffolds for Legal RAG, Ozon ERP, Xunqiu, Playlab, Pet Workspace, and BIAU Port, recorded evidence snapshots and external content-pipeline references, then validated blog plan/check, lint, build, and public-surface isolation.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `6a59985` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 13: Archive legacy blog content

**Date**: 2026-07-01
**Task**: Archive legacy blog content
**Branch**: `main`

### Summary

Moved 87 hidden generated blog posts out of the runtime catalog into content-archive/legacy-blog with a rewrite queue, kept 10 curated public posts in runtime data, updated blog audit checks and public blog curation spec, and verified blog audit/check, assistant index, sitemap, lint, and build.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `b4a092b` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 14: Improve blog content generation skill

**Date**: 2026-07-01
**Task**: Improve blog content generation skill
**Branch**: `main`

### Summary

Strengthened blog-content-pipeline with evidence-first routes, legacy rewrite/review prompts, BLOG_DRAFT profile model channels, safer .env.local override behavior, and a backend spec for the blog draft workflow. Validated scaffold generation, profile missing-key behavior, blog:check, lint, and build.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `4d245fc` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 15: Extract blog content pipeline skill

**Date**: 2026-07-01
**Task**: Extract blog content pipeline skill
**Branch**: `main`

### Summary

Extracted blog-content-pipeline into standalone repo D:/workspace4Cursor/blog-content-pipeline, pushed git@github.com:Drew-Z/blog-content-pipeline.git, added usage guidance for model profiles and image generation policy, and synced the updated skill back into blog-semi.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `a094ff3` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 16: Blog pipeline dry run

**Date**: 2026-07-01
**Task**: Blog pipeline dry run
**Branch**: `main`

### Summary

Ran the blog-content-pipeline strong-profile dry run, captured the model routing failure, added a dry-run report, and updated the blog draft workflow spec with model setup wizard guidance.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `0d7474c` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 17: Blog model setup wizard

**Date**: 2026-07-01
**Task**: Blog model setup wizard
**Branch**: `main`

### Summary

Added a secrets-safe blog model setup/status/doctor CLI, shared draft model config resolution, offline-by-default doctor with explicit --live checks, docs/spec updates, and validation for blog checks, lint, and build.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `0db6ab7` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 18: Run blog content pipeline flow

**Date**: 2026-07-02
**Task**: Run blog content pipeline flow
**Branch**: `main`

### Summary

Refreshed the blog-content-system build-log draft with an evidence-first skill workflow, recorded validation results, and added the custom-template Draft Body convention to the blog draft workflow spec.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ca1d8d7` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 19: Add model setup gate to blog pipeline

**Date**: 2026-07-02
**Task**: Add model setup gate to blog pipeline
**Branch**: `main`

### Summary

Added a mode gate to the blog content pipeline so normal runs distinguish Codex-only, model-assisted, review-only, and publish flows; documented setup/status/doctor preflight before model-assisted generation and captured the convention in the blog draft workflow spec.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `8004148` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 20: Blog pipeline model-assisted flow

**Date**: 2026-07-02
**Task**: Blog pipeline model-assisted flow
**Branch**: `main`

### Summary

Improved the blog model setup wizard, verified three profile-specific model channels, ran one approved strong draft generation and one approved review polish pass, added --polish-from support, and staged the resulting draft for review.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `63fba10` | (see git log) |
| `b2be2d3` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 21: Overnight cross-project optimization

**Date**: 2026-07-02
**Task**: Overnight cross-project optimization
**Branch**: `main`

### Summary

Completed the unattended cross-project queue: polished ERP auth entry UX, split
blog-semi homepage project card detail/site actions, added a Pet App static
showcase/download-status page, synchronized project detail data and assistant
knowledge, and recorded a safe non-public blog backlog.

### Main Changes

- ERP login/register/Owner setup page now has confirmation-password validation,
  clearer Owner setup copy, explicit registration-disabled messaging, and a
  more polished SaaS entry surface.
- blog-semi homepage project cards now open internal project details, while
  explicit action buttons open verified external project sites.
- Pet/Gamer gained `pet-app-showcase-site/` with real Android screenshots and a
  disabled `APK 待公开构建` state.
- blog-semi project data now reflects ERP auth polish and the Pet showcase page;
  assistant public knowledge was regenerated.
- Added `content-drafts/blog-content-backlog-2026-07-02.md` for safe future
  blog work without publishing, deleting, or model generation.
- Completion audit follow-up aligned homepage hero data to
  `detailLink` / `externalLink` and added review-only evidence/human-approval
  notes to project summary drafts `08` through `13`.

### Git Commits

| Repo | Hash | Message |
|------|------|---------|
| `erp` | `2774f3d` | `feat(auth): polish login and registration entry` |
| `blog-semi` | `1f87df6` | `feat(home): split project card detail and site actions` |
| `gamer` | `56a1812` | `feat(app): add pet showcase download page` |
| `blog-semi` | `7bbc243` | `feat(projects): sync erp and pet showcase updates` |
| `blog-semi` | `e0342e0` | `docs(blog): record safe content backlog` |

### Testing

- ERP: `npm run build --workspace @erp/web`; `npm run test --workspace @erp/api`.
- blog-semi homepage: `npm.cmd run lint`; `npm.cmd run build`; `npm.cmd run check:ui` with a temporary dev server on `5174`.
- Pet showcase: local Playwright file checks for desktop/mobile, disabled APK button, image loading, and no horizontal overflow.
- blog-semi project sync: `assistant:index`; `sitemap:generate`; `blog:check`; `lint`; `build`.
- Content backlog: `blog:plan`; `blog:check`; `git diff --check`.
- Completion audit follow-up: `blog:check`; `lint`; `build`; `check:ui`.

### Human Review / Blockers

- ERP production self-registration was not enabled and still needs human review
  before any production policy change.
- ERP branch `codex/ozon-plugin-parity` and Gamer branch
  `cursor-windows-migration` were pushed for review.
- Pet APK download remains pending; no real APK link was added.
- Blog drafts remain non-public; no legacy content was deleted and no live model
  or image generation was run.
- Gamer still has unrelated pre-existing dirty pagination files that were not
  staged or modified by this work.

### Status

[OK] **Completed**

### Next Steps

- Review/merge the ERP and Gamer branches.
- Decide whether to deploy the Pet showcase page and when to publish a signed APK.
- Use the new blog backlog to choose the next article only after human review.


## Session 21: 站点访问与运行监察 MVP

**Date**: 2026-07-02
**Task**: 站点访问与运行监察 MVP
**Branch**: `main`

### Summary

新增 site:monitor 线上健康检查脚本、默认关闭的前端 analytics adapter、访问人数/搜索/事件数据查看文档，并把长期父任务更新到 16 个 child task。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `5762a9e` | (see git log) |
| `8561b06` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 22: 可观测性二期与 metrics 预留

**Date**: 2026-07-02
**Task**: 可观测性二期与 metrics 预留
**Branch**: `main`

### Summary

拆清访问分析与工程可观测性，新增 docs/observability-strategy.md，给 assistant API 增加默认关闭的 Prometheus /metrics 预留端点，并沉淀 backend observability spec。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `a2e73f0` | (see git log) |
| `6d4b29c` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 23: 项目详情相关推荐质量优化

**Date**: 2026-07-02
**Task**: 项目详情相关推荐质量优化
**Branch**: `main`

### Summary

完成项目详情页相关推荐评分逻辑、验证并归档 Trellis 子任务。

### Main Changes

- Added `src/data/projectRecommendations.ts` as a pure recommendation helper for project detail pages.
- Replaced category-only detail recommendations with stable scoring based on same category, shared public blog readings, normalized stack signals, and light display-status weight.
- Updated `ProjectDetailPage` title behavior so cross-category suggestions show `相关项目` and same-category-only suggestions keep `同类项目`.
- Verified `ozon-erp` and `xunqiu` now have related projects, with max 3 recommendations and no self-recommendation.
- Ran `npm.cmd run lint`, `npm.cmd run build`, assertion sampling via `npx tsx`, `git diff --check`, and changed-file sensitive scan. Sensitive scan only found inspected false positives in safety guidance and task slug text.
- Archived the child task and updated the long-running parent task to 18 completed children.


### Git Commits

| Hash | Message |
|------|---------|
| `cce0c7f` | (see git log) |
| `6a37091` | (see git log) |
| `70b8f1d` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 24: 项目详情相关推荐 UI 回归检查

**Date**: 2026-07-02
**Task**: 项目详情相关推荐 UI 回归检查
**Branch**: `main`

### Summary

为项目详情相关推荐区域补充 Playwright UI 防回归检查并归档子任务。

### Main Changes

- Added Playwright coverage in `scripts/check-ui.mjs` for `/projects/ozon-erp` and `/projects/xunqiu` related project sections.
- The UI check now verifies the `相关项目` section exists, has 1-3 cards, does not self-link, and the first card navigates to another project detail page.
- Ran `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:ui`, `git diff --check`, and changed-file sensitive scan. Sensitive scan only found inspected false positives for the local UI check URL and existing task slug text.
- Archived the child task and updated the long-running parent task to 19 completed children.


### Git Commits

| Hash | Message |
|------|---------|
| `e04ba2a` | (see git log) |
| `76f666f` | (see git log) |
| `f8bf64b` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 25: 项目详情主图原图查看入口

**Date**: 2026-07-02
**Task**: 项目详情主图原图查看入口
**Branch**: `main`

### Summary

为项目详情主图增加可访问原图入口并补 UI 回归检查。

### Main Changes

- Added an accessible original-image link around project detail hero images, using the existing public `project.image` path and safe `_blank` link attributes.
- Added a visible `打开原图` affordance with hover/focus styling so long screenshots and mobile screenshots can be inspected without changing source assets.
- Extended `scripts/check-ui.mjs` to verify `/projects/xunqiu` hero image link href, target, rel, and visible affordance.
- Ran `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:ui`, `git diff --check`, and changed-file sensitive scan. Sensitive scan only found inspected false positives for local UI check URL, CSS mask properties, and existing task slug text.
- Archived the child task and updated the long-running parent task to 20 completed children.


### Git Commits

| Hash | Message |
|------|---------|
| `fce05df` | (see git log) |
| `98fc461` | (see git log) |
| `06b9186` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 26: 博客模型工具 env-file 别名清理

**Date**: 2026-07-02
**Task**: 博客模型工具 env-file 别名清理
**Branch**: `main`

### Summary

拒绝 blog:model 的 --env-file 参数并保留 --local-env 离线配置路径。

### Main Changes

- Updated `scripts/configure-blog-model.mjs` so `--env-file` and `--env-file=PATH` are rejected with a structured error and recovery guidance to use `--local-env`.
- Kept `--local-env` and `--local-env=PATH` behavior intact and added a help note that `--env-file` is intentionally unsupported to avoid Node/wrapper ambiguity.
- Verified offline only: placeholder `setup --local-env`, `status --local-env`, `doctor --local-env`, and failing `status --env-file` / `status --env-file=...`; no live model request was sent and the temporary env file was removed.
- Ran `npm.cmd run blog:model -- --help`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`, and changed-file sensitive scan. Sensitive scan only found inspected false positives from existing key-field names/placeholders and task slug text.
- Archived the child task and updated the long-running parent task to 21 completed children.


### Git Commits

| Hash | Message |
|------|---------|
| `5dde6c5` | (see git log) |
| `c70024b` | (see git log) |
| `03fb8ac` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 27: Observability tooling decision matrix

**Date**: 2026-07-02
**Task**: Observability tooling decision matrix
**Branch**: `main`

### Summary

Clarified observability tooling choices and added offline docs check.

### Main Changes

- 完成 child task `07-02-07-02-observability-tooling-decision-matrix`。
- 更新 `docs/observability-strategy.md`：补分层模型、工具决策矩阵、可一起做/不建议一起做组合、ARMS/Prometheus/Grafana/OpenTelemetry/Sentry/Faro/Langfuse 推荐时机和人工 gate。
- 更新 `docs/site-monitoring.md`：补四类站点数据工具快速对照，明确 Cloudflare + Search Console + Plausible 或 Umami 二选一 + site:monitor 的第一阶段组合。
- 新增 `scripts/check-observability-docs.mjs` 与 `npm.cmd run docs:observability-check`，离线验证关键工具边界、推荐路线和人工 gate。
- 验证：`npm.cmd run docs:observability-check`、`npm.cmd run lint`、`npm.cmd run build`、`git diff --check`、changed files 敏感信息扫描均通过；build 仅保留既有 Vite/Rolldown 警告。
- child 已归档，父任务更新为 22/22 done；真实 Cloudflare/Search Console/Umami/Plausible/Sentry/Faro/ARMS/Prometheus/Grafana/Langfuse 配置仍是人工 gate。
- 下一轮可选：继续做 blog-semi 项目详情首屏/移动端密度，或把低敏 `/metrics` 模式推广到 ERP、Legal RAG、Xunqiu 后端、Pet Community API 中的一个。


### Git Commits

| Hash | Message |
|------|---------|
| `835bc22` | (see git log) |
| `afac85c` | (see git log) |
| `d144daf` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 28: Biau Port logo intro animation

**Date**: 2026-07-02
**Task**: Biau Port logo intro animation
**Branch**: `main`

### Summary

Refined BIAU Port brand mark, favicon, and first-entry intro animation.

### Main Changes

- 完成 child task `07-02-biau-port-logo-intro-animation`。
- 将用户提供的两版外部模型方案融合为第一版泊岸品牌识别：`b` 字母、港湾 / 数字端口、水线与暖色灯塔点。
- 新增复用 SVG 品牌组件 `BiauPortMark`，替换导航 logo、首页首次入场动画和 favicon，并收紧移动端导航布局。
- 设计上未引入 GSAP / Lottie / 生成图片，保持首屏低依赖；`prefers-reduced-motion` 和首次访问 sessionStorage 逻辑保留。
- 验证：`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui`、`git diff --check`、changed files 敏感信息扫描均通过。
- child 已归档；父任务已更新为 23/23 done，继续作为长期优化队列保留。


### Git Commits

| Hash | Message |
|------|---------|
| `63dec57` | (see git log) |
| `3f68c36` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 29: Projects mobile card actions

**Date**: 2026-07-02
**Task**: Projects mobile card actions
**Branch**: `main`

### Summary

Restored visible mobile project card actions and added UI regression coverage.

### Main Changes

- 完成 child task `07-02-07-02-projects-mobile-card-actions`。
- 修复 `/projects` 手机视口项目卡片隐藏操作区的问题：移动端现在保留紧凑的“查看详情”按钮和最多两个外部项目入口。
- 保持卡片主体点击/键盘进入详情，外部链接继续 `target="_blank"` + `rel="noopener noreferrer"`，并阻止冒泡避免误跳详情页。
- 在 `scripts/check-ui.mjs` 增加移动端项目卡操作区回归检查，覆盖 footer 可见、详情按钮可见、外链可见、安全属性和外链点击不触发卡片详情导航。
- 验证：`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui`、`git diff --check`、严格敏感信息扫描和移动端截图检查均通过。
- child 已归档；父任务更新为 24/24 done，并继续作为长期优化队列保留。


### Git Commits

| Hash | Message |
|------|---------|
| `e8ac2d8` | (see git log) |
| `7b7d604` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 30: Project detail hero quick links

**Date**: 2026-07-02
**Task**: Project detail hero quick links
**Branch**: `main`

### Summary

Added header quick links to project detail pages and regression coverage.

### Main Changes

- 完成 child task `07-02-07-02-project-detail-hero-quick-links`。
- 在项目详情页标题区复用现有 `project.links` 渲染首屏快速链接，让演示、文档、源码、APK 和相关文章入口在移动端更早可见。
- 保持内部链接走 React Router `Link`，外部链接继续 `target="_blank"` + `rel="noopener noreferrer"`；未新增、删除或改写任何项目 URL / 事实数据。
- 增加 `detail-quick-links` 样式，支持移动端换行、无横向溢出，并保留下方完整“相关链接”区块。
- 在 `scripts/check-ui.mjs` 增加 Legal RAG 和 Xunqiu 的 quick links 回归检查，覆盖可见性、链接语义、安全属性、截图前位置和下方链接区仍存在。
- 验证：`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui`、`git diff --check`、严格敏感信息扫描和移动端截图检查均通过。
- child 已归档；父任务更新为 25/25 done，并继续作为长期优化队列保留。


### Git Commits

| Hash | Message |
|------|---------|
| `41e242d` | (see git log) |
| `0afa187` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 31: Project detail link type affordance

**Date**: 2026-07-02
**Task**: Project detail link type affordance
**Branch**: `main`

### Summary

Distinguished external and internal project detail links with visual affordances and UI checks.

### Main Changes

- 完成 child task `07-02-07-02-project-detail-link-type-affordance`。
- 项目详情页链接徽标现在基于现有 `ProjectLink.type` 区分外部链接与站内链接：外部入口使用 `IconExternalOpen` 与暖色样式，站内入口保留链路图标与绿色样式。
- 增加 `link-badge--external` / `link-badge--internal` 和 `data-link-type`，用于视觉区分与 UI 回归检查；未新增、删除、重排或改写任何链接 label / href / 项目事实。
- 保持外部链接 `target="_blank"` + `rel="noopener noreferrer"`，内部链接仍走 React Router `Link`，可访问名称仍基于原始 link label。
- 在 `scripts/check-ui.mjs` 增加 Legal RAG quick/lower links 的类型 class、data-link-type、外链安全属性和站内链接语义检查。
- 验证：`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui`、`git diff --check`、严格敏感信息扫描和移动端截图检查均通过。
- child 已归档；父任务更新为 26/26 done，并继续作为长期优化队列保留。


### Git Commits

| Hash | Message |
|------|---------|
| `7f0bffb` | (see git log) |
| `91c4037` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
