# Design

## 后端

- 在 internal assistant 服务上新增 admin-only RAG 管理接口：
  - `GET /admin/rag/status`
  - `POST /admin/rag/sync-public`
- 复用已有 `ASSISTANT_RAG_API_BASE_URL`、`RAG_SYNC_TOKEN` 与 RAG Orchestrator 的 `/health`、`/v1/sync`。
- RAG Orchestrator 同步 Qdrant 前确保 collection 存在；collection vector size 使用 `EMBEDDING_DIMENSION` 或默认值。
- 诊断使用低敏字段：`reason`、`scope`、`mode`、`httpStatus`、`issueCount`、`documentCount`、`chunkCount`，不透传密钥或 provider URL。

## 前端

- 在 `/assistant/admin` 新增 RAG 管理卡片，放在摘要/知识管理附近。
- 提供「刷新 RAG 状态」「同步公开知识库」「同步内部知识库」按钮。
- 显示 public/internal collection 状态、总 chunk 数、vectorReady、最近同步诊断。

## 安全

- 仅 admin token 可访问。
- 不暴露 RAG sync token、Qdrant key、embedding key、base URL、数据库 URL。
- 不做 live chat 或模型测活。
