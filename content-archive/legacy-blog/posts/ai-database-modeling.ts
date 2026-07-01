import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-database-modeling",
  "title": "AI 应用数据库建模：Document、Chunk、Embedding 与审计表",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 应用不只有聊天记录。本文从 Document、Chunk、Embedding、Job、AuditLog 和 Feedback 出发，讨论可追踪的数据边界。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "数据库建模",
    "RAG 数据结构",
    "审计日志"
  ],
  "scenarios": [
    "RAG 知识库",
    "合同审查系统",
    "AI 长任务平台"
  ],
  "practiceChecklist": [
    "把原始文档、chunk、embedding、job、audit log 分表管理",
    "为 documentVersion、chunkVersion、embeddingVersion 预留字段",
    "所有高风险动作写入审计表"
  ],
  "sections": [
    {
      "title": "问题背景：AI 应用不是只有一张聊天表",
      "body": "很多 AI Demo 只保存 messages，但生产化应用需要管理文档、切片、向量、任务、报告、反馈、配置和审计。数据库建模的目标是让每个阶段都可追踪、可重试、可回滚，而不是只把最终回答存下来。"
    },
    {
      "title": "原始资料：Document 表定义资料归属和状态",
      "body": "Document 保存文档级信息，例如 tenantId、workspaceId、ownerId、title、sourceType、storageKey、hash、status、version、mimeType、size、createdAt、updatedAt、expireAt。它回答的是“这份资料是什么、属于谁、现在能不能被使用”。"
    },
    {
      "title": "检索资料：Chunk 和 Embedding 分表管理",
      "body": "Chunk 保存切片文本、section、page、order、metadata、chunkVersion；Embedding 保存向量、model、dimension、embeddingVersion、chunkId。分开后，同一份 chunk 可以在更换 embedding 模型时重新生成向量，而不用复制文档文本。"
    },
    {
      "title": "异步流程：Job 表承接长任务",
      "body": "文档解析、OCR、embedding、批量审查、报告导出都适合 Job 化。Job 可以保存 type、status、priority、progress、attempts、errorType、errorMessage、startedAt、finishedAt、batchId。复杂任务可以再拆 JobStep，方便展示阶段进度。"
    },
    {
      "title": "审计边界：AuditLog 记录关键动作",
      "body": "AI 应用里的配置变更、权限变更、工具调用、报告导出、人审通过、人工驳回都应该进入 AuditLog。常见字段包括 actorId、action、resourceType、resourceId、before、after、traceId、ip、createdAt。审计表不是为了好看，而是为了追责和复盘。"
    },
    {
      "title": "持续优化：反馈表让系统保留学习材料",
      "body": "除了主流程表，还可以有 Feedback、ReviewRecord、EvaluationRun、GoldenCase 等表。它们记录用户反馈、人审修正、评测结果和失败样例，帮助系统从一次性交付变成持续迭代的知识系统。"
    }
  ],
  "takeaways": [
    "AI 应用数据库要覆盖文档、切片、向量、任务、反馈和审计。",
    "Document、Chunk、Embedding 分开后，更容易支持版本管理和模型切换。",
    "Job 和 AuditLog 决定系统是否可追踪、可重试、可复盘。"
  ]
}

export default post
