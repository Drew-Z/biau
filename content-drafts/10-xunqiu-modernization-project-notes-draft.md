---
slug: "xunqiu-modernization-project-notes-draft"
title: "寻球项目总结：移动端 64 位迁移与现代后端重建"
column: "project-notes"
series: "项目工程复盘"
tag: "项目总结"
status: "draft"
generatedBy: "codex-draft-scaffold"
generatedAt: "2026-07-01T05:28:20.460Z"
modelStrategy: "Codex 负责按新旧链路拆证据；内容模型只生成迁移复盘表达；Codex 最后核查每个功能状态是否被写成过度承诺。"
---

# 寻球项目总结：移动端 64 位迁移与现代后端重建

## Evidence Pack
- D:\workspace4Codex\xunqiu
- D:\workspace4Codex\xunqiu\xunqiu-android64
- D:\workspace4Codex\xunqiu\xunqiu-android64\docs\ANDROID64_LEGACY_ENTRY_MATRIX.md
- D:\workspace4Codex\xunqiu\xunqiu-android64\docs\TEST_MATRIX.md
- D:\workspace4Codex\xunqiu-backend-modern\pom.xml
- D:\workspace4Codex\xunqiu-backend-modern\src\main
- D:\workspace4Codex\xunqiu-backend-modern\src\test
- D:\workspace4Codex\xunqiu-backend-modern\src\main\resources\db\migration
- D:\workspace4Codex\xunqiu-backend-modern\scripts\smoke-test.ps1
- D:\workspace4Codex\xunqiu-backend-modern\docs\render-deploy-checklist.md
- D:\workspace4Codex\xunqiu-backend-modern\render.yaml
- D:\workspace4Codex\xunqiu-backend-modern\Dockerfile
- src/data/portfolio.ts
- .trellis/tasks/07-01-project-notes-draft-evidence-packs/research/evidence-snapshots.md

## Safe Public Facts
- 寻球工作区包含历史 Android/iOS/后端、现代后端、Android 64 位客户端、展示站、docs、deploy、release 和 tooling 等材料。
- Android 64 位项目有旧入口矩阵和测试矩阵文档。
- 现代后端使用 Spring Boot 3.3.6、Java 17、JPA、Security、Validation、Web、Flyway PostgreSQL、S3-compatible SDK、H2 和 Testcontainers。
- 现代后端包含 main/test 源码、数据库迁移、烟测脚本、Render 部署检查清单、Render 配置和 Dockerfile。
- 后续优化方向可以围绕真机回归、旧 WebView 原生化、权限与审计、媒体治理、监控部署和视频播放升级展开。

## Uncertain Or Stale Facts
- 实时线上服务健康、APK 下载状态和完整功能可用性需要发布前单独验证。
- 历史工程目录只能作为迁移背景，不能直接当作当前实现事实。

## Forbidden / Private Details
- 不要读取或公开 jdbc.properties、local.properties、.env、签名文件、私有 app key、R2 凭据、数据库 URL、部署账号或第三方服务凭证。
- 不要声称支付、IM、推送、地图、分享、真实兑换等高副作用能力已经完整生产启用，除非后续证据明确验证。
- 不要公开旧系统私有运维和账号信息。

## Draft Brief
- Column: 项目总结 / Project Notes
- Column note: 不要复制项目详情页；重点写阶段复盘、取舍、缺口和下一轮迭代。
- Target reader: 关注移动端遗留迁移、Spring Boot 后端现代化和展示型产品重建的访客与开发者
- Summary: 把寻球旧客户端、64 位 Android、新 Spring Boot 后端、上传链路、测试矩阵和部署材料整理成迁移复盘草稿。
- Public angle: 说明项目如何把旧 App、旧后端、新客户端和现代后端拆开治理，用测试矩阵和安全等价页降低迁移风险。
- Knowledge points: 遗留系统迁移、Android 64 位、Spring Boot 3、Flyway、S3-compatible 上传、测试矩阵
- Project examples: 寻球 Android 64 位客户端、xunqiu-backend-modern、产品展示站

## Article Outline
- Project stage and goal
- What changed or what was built
- Architecture or workflow choice
- Bugs, constraints, or tradeoffs
- What the project still lacks
- Next iteration direction

## Model Strategy
- Codex 负责按新旧链路拆证据；内容模型只生成迁移复盘表达；Codex 最后核查每个功能状态是否被写成过度承诺。
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
- Column fit: strong fit for `project-notes` if framed as migration risk management: old app boundary, Android 64-bit rebuild, modern backend, upload/media path, and staged verification.
- Evidence to refresh before writing body:
  - Current Android 64-bit test matrix and legacy entry matrix.
  - Current modern backend tests, Flyway migrations, Render deploy checklist, and smoke script.
  - Current product showcase page and APK status.
  - Any safe screenshots already used by the project page.
- Human approval checklist:
  - Confirm whether current APK download is public and which version is safe to mention.
  - Confirm online health/deployment status before using live language.
  - Confirm high-side-effect features remain described as safe equivalents or pending.
  - Confirm whether model-assisted drafting is allowed for this specific post.

## Promotion Checklist
- [ ] Convert reviewed content into `src/data/blog-posts/<slug>.ts` only after review.
- [ ] Add summary metadata to `src/data/blog.ts`.
- [ ] Register a loader in `src/data/blogContent.ts` only if the post should be public/loadable.
- [ ] Add `blogCuration` only when ready for public visibility.
- [ ] Run `npm.cmd run blog:audit`, `assistant:index`, `sitemap:generate`, `lint`, and `build` after public promotion.
