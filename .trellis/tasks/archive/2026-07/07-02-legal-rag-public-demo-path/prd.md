# Legal RAG 公开演示路径补强

## Goal

把 Legal RAG 仓库中已经整理好的公开演示路径同步到 BIAU Port 项目详情页和公开助手知识，让非开发访客能快速理解“先看哪里、每一步验证什么”。

## Requirements

- 证据来源必须来自当前仓库和 Legal RAG 本地项目文件：
  - `src/data/portfolio.ts` 中当前 `legal-rag` 项目数据。
  - `D:\workspace4Cursor\legal-rag\README.md` 的线上 Demo、5 分钟演示路径和质量面板说明。
  - `D:\workspace4Cursor\legal-rag\docs\demo-script.md` 的 90 秒演示、常见追问和演示故障处理。
  - `D:\workspace4Cursor\legal-rag\CONTEXT.md` 的 domain terms 与安全约束。
  - `D:\workspace4Cursor\legal-rag\apps\web\src\components\QaView.vue` 的 answer/citations/diagnostics UI。
  - `D:\workspace4Cursor\legal-rag\apps\web\src\components\QualityView.vue` 的 runtime、评测、readiness、趋势、审计日志 UI。
- 只修改 `blog-semi` 的公开项目数据和生成索引。
- 不公开登录账号、密码、模型 key、数据库连接串、Render/Supabase 后台变量或部署后台。
- 不新增或验证 demo 登录凭据；API health 链接沿用现有公开链接，不新增私有信息。
- 不修改 `legal-rag` 仓库，不部署任何项目。
- 若改动 `src/data/portfolio.ts`，必须同步生成 assistant knowledge 和 sitemap。

## Acceptance Criteria

- [x] `legal-rag` 项目详情新增或补强“公开演示路径”，覆盖登录保护、公开数据集初始化、RAG 问答 citation/diagnostics、合同审查和质量面板。
- [x] 项目详情对“资料不足拒答、引用溯源、评测用例、readiness checks、审计日志”的说明准确，不夸大成法律意见服务。
- [x] `assistantContext` 同步包含推荐演示顺序，且不泄露任何凭据。
- [x] 运行 `npm.cmd run assistant:index`、`npm.cmd run sitemap:generate`、`npm.cmd run blog:check`、`npm.cmd run lint`、`npm.cmd run build`、必要时 `npm.cmd run check:ui`。
- [x] 运行 `git diff --check` 和敏感信息扫描。

## Notes

- 人工 gate：不公开 demo 登录凭据；不验证线上登录；不部署任何项目。
- 证据记录：
  - `legal-rag/README.md` 记录线上 demo、API health、5 分钟演示路径、质量面板、评测报告和 CI 验证。
  - `legal-rag/docs/demo-script.md` 记录 90 秒演示：登录、知识库、公开数据集、RAG 问答、citations/diagnostics、合同审查和质量面板。
  - `legal-rag/CONTEXT.md` 定义 citation、diagnostics、quality report、audit log 和“答案必须有引用或拒答”的约束。
  - `QaView.vue` 当前展示 answer source、vector/keyword/filter/rerank diagnostics 和 citations。
  - `QualityView.vue` 当前展示 runtime、RAG citation/refusal 评测、合同审查召回、readiness checks、质量趋势和审计日志。
- 验证记录：
  - `npm.cmd run assistant:index`：通过，生成 23 条公开知识。
  - `npm.cmd run sitemap:generate`：通过，生成 25 个 URL；本轮无实际 sitemap diff。
  - `npm.cmd run blog:check`：通过。
  - `npm.cmd run lint`：通过。
  - `npm.cmd run build`：通过；仅有现有 dynamic import chunk 提示。
  - `npm.cmd run check:ui`：通过。
  - `git diff --check`：通过；仅有工作区 LF/CRLF 转换提示。
  - 敏感信息扫描：无命中。
