---
slug: "legal-rag-project-notes-draft"
title: "Legal RAG 项目总结：把合同问答做成可追溯的审查工作台"
column: "project-notes"
series: "项目工程复盘"
tag: "项目总结"
status: "draft"
generatedBy: "codex-draft-scaffold"
generatedAt: "2026-07-01T05:28:19.958Z"
modelStrategy: "Codex 先整理项目证据包和禁写边界；如需长文，串行调用一个强内容模型生成初稿；Codex 再做事实核查、脱敏和结构调整。"
---

# Legal RAG 项目总结：把合同问答做成可追溯的审查工作台

## Evidence Pack
- D:\workspace4Cursor\legal-rag\package.json
- D:\workspace4Cursor\legal-rag\apps\api\src
- D:\workspace4Cursor\legal-rag\apps\web\src
- D:\workspace4Cursor\legal-rag\packages\shared\src\types.ts
- D:\workspace4Cursor\legal-rag\eval\contract-review-eval-set.json
- D:\workspace4Cursor\legal-rag\eval\rag-eval-set.json
- D:\workspace4Cursor\legal-rag\docs\architecture.md
- D:\workspace4Cursor\legal-rag\docs\demo-script.md
- D:\workspace4Cursor\legal-rag\docs\adr
- src/data/portfolio.ts
- .trellis/tasks/07-01-project-notes-draft-evidence-packs/research/evidence-snapshots.md

## Safe Public Facts
- Legal RAG 是一个包含 API、Web、shared package、eval fixtures、docs 和部署说明的 workspace 项目。
- API 模块覆盖 audit、auth、chunks、citations、datasets、documents、embeddings、evaluation、ingestion、model-providers、quality、rag、review、store 和 vector-store 等边界。
- 项目包含 RAG 与合同审查评测 fixtures，也有 architecture、demo、deploy 和 ADR 文档。
- 当前主站已把它描述为已部署的法律文档 RAG 与合同审查工作台。
- 后续优化方向可以围绕权限、更多脱敏数据集、评测趋势、OCR、rerank、CI 和可复现部署展开。

## Uncertain Or Stale Facts
- 确切线上服务健康状态、模型提供商、向量存储模式、数据规模和访问量需要在公开发布前重新核验。
- README 或旧部署文档可能落后于当前代码，应以代码、测试、主站项目数据和最新部署记录交叉确认。

## Forbidden / Private Details
- 不要公开凭据、私有端点、部署后台、数据库 URL、模型密钥、私有账号或客户信息。
- 不要把项目包装成正式法律意见服务。
- 不要编造使用量、准确率、客户反馈或未验证的生产指标。

## Draft Brief
- Column: 项目总结 / Project Notes
- Column note: 不要复制项目详情页；重点写阶段复盘、取舍、缺口和下一轮迭代。
- Target reader: 想理解法律 RAG、合同审查工作台和 AI 应用工程化的访客、开发者和项目协作者
- Summary: 基于 Legal RAG 的代码、评测、文档和主站案例，整理一个访客可读的项目总结草稿，重点说明 RAG、引用、合同审查、质量评测与后续生产化方向。
- Public angle: 不重复项目详情页的功能清单，而是复盘为什么要把问答、引用、规则审查和质量诊断放进同一个可演示工作台。
- Knowledge points: RAG pipeline、引用溯源、合同风险审查、质量评测、适配器边界
- Project examples: Legal RAG 合同审查、公开安全数据集问答、质量诊断面板

## Article Outline
- Project stage and goal
- What changed or what was built
- Architecture or workflow choice
- Bugs, constraints, or tradeoffs
- What the project still lacks
- Next iteration direction

## Model Strategy
- Codex 先整理项目证据包和禁写边界；如需长文，串行调用一个强内容模型生成初稿；Codex 再做事实核查、脱敏和结构调整。
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
- Column fit: suitable for `project-notes` only if the article focuses on why the workbench needs citations, rules, evaluation, and human review. A feature catalog would duplicate the project detail page.
- Evidence to refresh before writing body:
  - Current API routes and shared types for RAG, citations, review, quality, and evaluation.
  - Current eval fixtures for RAG and contract review.
  - Current project detail page copy in `src/data/portfolio.ts`.
  - Any latest deployment/demo status that is safe to publish.
- Human approval checklist:
  - Confirm whether the article may mention online deployment status.
  - Confirm screenshots or diagrams to use, if any.
  - Confirm that no legal-advice or production-readiness claim is implied.
  - Confirm whether model-assisted drafting is allowed for this specific post.

## Promotion Checklist
- [ ] Convert reviewed content into `src/data/blog-posts/<slug>.ts` only after review.
- [ ] Add summary metadata to `src/data/blog.ts`.
- [ ] Register a loader in `src/data/blogContent.ts` only if the post should be public/loadable.
- [ ] Add `blogCuration` only when ready for public visibility.
- [ ] Run `npm.cmd run blog:audit`, `assistant:index`, `sitemap:generate`, `lint`, and `build` after public promotion.
