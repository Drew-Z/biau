# Legal RAG synthetic reliability check

## Goal

把 `/status` 中 Legal RAG 的关键功能检查从纯 `planned` 推进到可运行的低敏 synthetic 检查：公开 health 可无凭据检测；登录、公开安全数据集 seed、法律问答、合同审查和质量面板在提供环境变量凭据时检测；结果写入公开状态 JSON，但不保存账号、密码、cookie、模型内容或私有端点。

## Evidence

- `D:\workspace4Cursor\legal-rag\apps\api\src\app.ts`：
  - `GET /api/health` 公开返回 `ok`、`modelProvider`、`vectorStore`、`embeddingModel`。
  - `GET /api/auth/status` 和 `POST /api/auth/login` 在 auth 启用时使用 HTTP-only cookie。
  - `app.use("/api", requireAuth(auth))` 之后保护 `quality/report`、`evaluation/report`、`review/evaluation/report`、`ingestion-jobs/seed`、`rag/query`、`contracts/review`。
- `D:\workspace4Cursor\legal-rag\apps\web\scripts\e2e-smoke.mjs` 已有线上 smoke 思路：health、auth、seed、RAG query。
- `D:\workspace4Cursor\legal-rag\apps\api\src\validate.ts` 已证明本地完整闭环：health、quality、evaluation、review evaluation、RAG query、contract review。

## Requirements

- 新增 `blog-semi` 脚本，不修改 Legal RAG 生产部署。
- 默认不写死任何云端 API 地址；缺少 `LEGAL_RAG_API_BASE_URL` 时所有 live 检查显示 `unchecked`，不能失败整个脚本。
- 提供 `LEGAL_RAG_API_BASE_URL` 但不提供凭据时，只运行无凭据 health / auth status 检查；需要登录的检查显示 `unchecked`。
- 支持环境变量：
  - `LEGAL_RAG_API_BASE_URL`，必填后才执行 live API 检查。
  - `LEGAL_RAG_SYNTHETIC_EMAIL`。
  - `LEGAL_RAG_SYNTHETIC_PASSWORD`。
  - `LEGAL_RAG_SYNTHETIC_PROJECT_ID`，默认 `project_default`。
  - `LEGAL_RAG_SYNTHETIC_TIMEOUT_MS`。
- 输出文件为 `public/status/legal-rag-synthetic.json`，只包含低敏状态、HTTP status、耗时、checkedAt 和 issue 摘要；不包含真实 API base URL。
- `scripts/generate-site-status.ts` 读取该 JSON，如果存在且未过期，就把 Legal RAG 对应 check 状态从 `planned` 合并为 `online`、`degraded`、`offline` 或 `unchecked`。
- 不把真实凭据、cookie、answer 正文、citations 原文、合同文本或模型 provider 私有配置写入仓库。
- 生成脚本保持串行请求，不制造高并发。

## Out of Scope

- 不在本子任务中公开 demo 账号或密码。
- 不在本子任务中把检查接入 CI、定时任务或告警平台。
- 不在本子任务中接入 Prometheus scrape。
- 不在本子任务中修改 Legal RAG 后端代码。

## Acceptance Criteria

- [x] 新增 `npm` script 可运行 Legal RAG synthetic check。
- [x] 缺少 API base 时生成 `unchecked` 报告；提供 API base 但无凭据时至少生成 health 检查结果，并把需要登录的检查标记为 `unchecked`。
- [x] 提供凭据时脚本能按串行流程尝试 auth、seed、RAG query、contract review、quality report。
- [x] `/status` 生成脚本能合并 `public/status/legal-rag-synthetic.json`。
- [x] `/status` 页面无需额外改动即可展示合并后的状态和证据。
- [x] 文档或任务记录说明 env 使用方式和安全边界。
- [x] 通过验证：`npm.cmd run legal-rag:synthetic`、`npm.cmd run site:status`、`npm.cmd run lint`、`npm.cmd run build`。
- [x] 提交前完成 `git diff --check` 和敏感扫描。

## Validation Notes

- `npm.cmd run legal-rag:synthetic`：通过；未配置 `LEGAL_RAG_API_BASE_URL` 时生成 `public/status/legal-rag-synthetic.json`，4 个 live check 均为 `unchecked`。
- `npm.cmd run site:status`：通过；主状态页 JSON 合并 Legal RAG synthetic 结果，L0 入口仍为 4/4 online。
- `npm.cmd run lint`：通过。
- `npm.cmd run build`：通过；仅保留 Vite 既有 dynamic import chunk 提示。
- `npm.cmd run check:ui`：通过，覆盖 9 个路由、桌面与移动视口。
- 安全边界：输出不包含真实 API base、邮箱、密码、cookie、回答正文、citation 原文或合同正文。
