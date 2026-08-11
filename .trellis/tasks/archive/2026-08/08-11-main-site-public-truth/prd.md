# Main site public truth alignment

## Goal

使主站公开内容、助手知识、状态页与当前 Supabase pgvector 生产合同及已经完成的 Operator/internal-RAG 退役记录一致。

## Dependency

本子任务没有实现前置依赖，是父任务的第一个交付切片。它完成并生成稳定公开投影后，CSS 与验证诊断子任务才能把这些页面作为最终回归基线。

## Requirements

- 以 `server/src/ragPostgresStore.ts` 和当前 backend quality spec 为生产事实源。
- Qdrant 仅保留为可选/回滚适配器，不删除相关代码和环境变量。
- 更新 typed public source、README、部署文档、项目档案、人工队列和 public-assistant spec 中的旧生产描述。
- 重新生成公开助手知识与站点状态，不手改生成 JSON。
- 增加 contract 以阻止 `store=qdrant`、`Qdrant public alias` 或“旧 Operator 尚待退役”再次进入当前生产说明。
- 不覆盖 `public/status/blog-semi-synthetic.json` 的现有用户改动。

## Acceptance Criteria

- [ ] 当前生产拓扑统一为 public-only RAG Orchestrator + server-only Supabase pgvector 4096 维精确余弦检索。
- [ ] Qdrant 只在 optional/rollback/compatibility 语境出现。
- [ ] 旧 Operator/internal-RAG 退役不再出现在未完成队列中。
- [ ] `assistant:index`、`assistant:kg-check`、`site:status`、`status:contract`、`docs:deployment-check`、`docs:manual-gates-check` 和 `docs:project-notes-check` 通过。
- [ ] `lint`、`build` 和 `git diff --check` 通过。
- [ ] `public/status/blog-semi-synthetic.json` 不包含本子任务产生的差异。

## Out Of Scope

- 删除 Qdrant adapter、改变生产环境变量或执行真实 RAG 同步。
- 修改模型、embedding、reranker 或数据库配置。
