# Legal RAG public status health refresh

## Goal

刷新 `/status` 页面里的 Legal RAG 公开可靠性证据：使用已知公开 API health 地址执行一次 live synthetic check，让状态页从“API base 未配置/未检测”推进到“API health 已实测”。本任务只更新公开状态 JSON 和必要任务记录，不部署、不写入 API base URL、不配置真实 demo 密码。

## Requirements

- 使用现有 `npm.cmd run legal-rag:synthetic` 脚本，通过当前 shell 环境临时传入 `LEGAL_RAG_API_BASE_URL`。
- 不提交 `LEGAL_RAG_API_BASE_URL`、真实 demo email/password、模型 key、数据库连接串、Render/Supabase 私有配置。
- 在没有 demo 凭据的情况下，只期望 health 为 live check；法律问答、合同审查、质量面板 protected checks 可以保持 `unchecked`，并显示需要凭据的原因。
- 运行 `npm.cmd run site:status` 聚合 `public/status/legal-rag-synthetic.json` 到 `public/status/site-status.json`。
- 状态页文案/数据应让访客能区分：
  - 工作台入口可达。
  - API health 已实测。
  - 受登录保护的功能检查还未运行。
- 不触发线上部署，不修改 Legal RAG 项目代码。
- 提交前完成最小验证、`git diff --check` 和敏感信息扫描。

## Acceptance Criteria

- [x] `public/status/legal-rag-synthetic.json` 中 `legal-rag-health` 为 `online`，且不包含 API base URL 或凭据。
- [x] `public/status/site-status.json` 中 Legal RAG 的 `API health` 可靠性项合并为 `online`。
- [x] 受凭据保护的 `legal-rag-qa`、`legal-rag-contract-review`、`legal-rag-observability` 未在无凭据情况下误标为 online。
- [x] 通过 `npm.cmd run site:status`。
- [x] 通过 `npm.cmd run lint` 和 `npm.cmd run build`。
- [x] 通过 `git diff --check` 和变更文件敏感扫描。

## Notes

- Legal RAG 代码修复已在上一子任务推送到 `legal-rag` 的 `codex/project-quality-dashboard` 分支；本任务只刷新主站公开状态证据。
- 如果线上 API 仍未部署新镜像，health 仍可在线；质量面板 500 的验证需要部署后或有 demo 凭据时再做 protected synthetic。
- Validation:
  - `npm.cmd run legal-rag:synthetic` passed with temporary shell-only `LEGAL_RAG_API_BASE_URL`; protected checks skipped because credentials are not configured.
  - `npm.cmd run site:status` passed and generated 4 online entry targets.
  - `npm.cmd run lint` passed.
  - `npm.cmd run build` passed with existing Vite dynamic import warnings.
  - `git diff --check` passed.
  - Sensitive scan found only env variable names and existing public entry URL references, no real key/password/API base persisted.
