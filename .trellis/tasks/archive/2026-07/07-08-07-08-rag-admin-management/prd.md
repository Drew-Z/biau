# RAG 管理面板与 Qdrant 同步产品化

## 背景

当前 RAG Orchestrator 已经支持 Qdrant、embedding、公开知识库和内部知识库同步，但实际操作仍依赖手动命令、手动创建 collection、手动判断失败原因。用户希望在 `/assistant/admin` 里完成正常的一键式管理，不再拼 PowerShell 或猜测 Qdrant 状态。

## 目标

- 在管理端展示 RAG 状态，包括 store、public/internal collection readiness、chunk 数、embedding 配置边界和最近同步结果。
- 支持从管理端触发公开知识库同步。
- 保留并改善内部知识库同步体验。
- Qdrant 同步前自动确保 collection 存在，避免用户手动创建 collection。
- 同步失败时返回低敏、可读的诊断原因，不暴露 key、URL、token、数据库连接串或原始文档正文。

## 非目标

- 不在前端展示任何模型 key、Qdrant key、sync token 或 provider base URL。
- 不做真实模型聊天测活。
- 不引入新的云服务或替换现有 Qdrant 架构。

## 验收

- `/assistant/admin` 可看到 RAG 管理区域。
- 管理端可刷新 RAG 状态。
- 管理端可触发公开知识库同步。
- 内部知识同步仍可用，并显示更清楚的 accepted / issue / diagnostic。
- `npm.cmd run verify` 通过。
