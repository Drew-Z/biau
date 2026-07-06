# Manual gates

这些事项需要用户在平台、凭据或真实内容层面确认；它们不阻塞本地代码实现，但不能由 Codex 自动完成。

- Render: 确认 `biau-internal-assistant-api` 的 `DATABASE_URL`、`ADMIN_TOKEN`、`ASSISTANT_MODEL_*`、`ASSISTANT_RAG_API_BASE_URL`、`ASSISTANT_RAG_API_KEY`、可选 `ASSISTANT_RAG_SYNC_TOKEN`。
- Render: 如需成员级多模型分配，确认 `ASSISTANT_MODEL_CHANNELS_JSON` 中每个渠道的 `id`、`label`、`provider`、`model`、`baseUrl`、`apiKey`；真实值只能放平台环境变量，不进入仓库或聊天记录。
- Render: 确认 `biau-rag-orchestrator` 的 `RAG_STORE_PROVIDER=qdrant`、`QDRANT_*`、`RAG_PUBLIC_API_KEY`、`RAG_INTERNAL_API_KEY`、`RAG_SYNC_TOKEN`、`EMBEDDING_*`。
- Database: 生产迁移执行前由用户确认数据库备份/回滚策略；当前至少需要执行 `20260706000000_internal_assistant_member_controls`、`20260706010000_internal_knowledge_admin` 和 `20260706020000_chat_message_meta`，否则成员状态/模型渠道、内部知识源和历史回答诊断无法完整工作。
- Internal corpus: 第一批内部知识文档来源和脱敏标准由用户确认；没有确认前不得导入真实私有材料。
- Qdrant sync: 真实 internal collection 同步会调用 embedding provider，需要用户批准真实同步任务。
- Model validation: 真实回答质量验证只能使用用户批准的业务问题，不做测活、小诗、doctor 或 provider ping。
- Visibility: 用户最终确认 `/assistant` 是否继续作为隐藏内部入口，还是在站点导航中显示内部入口。
