import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-cost-budget-sheet",
  "title": "AI 成本预算表：模型、Token、OCR、存储与人审",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "AI 成本来自完整业务链路，而不只是一次模型回答。本文把入库、查询、生成、导出和人工审核拆成可估算预算表。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "成本预算",
    "Token 成本",
    "资源配额"
  ],
  "scenarios": [
    "合同批量审查",
    "企业知识库问答",
    "AI 生成任务平台"
  ],
  "practiceChecklist": [
    "把成本按入库、查询、生成、导出、人工审核拆分",
    "记录 token、OCR 页数、embedding 数量、存储大小和任务重试次数",
    "按租户、用户和功能设置预算与告警"
  ],
  "sections": [
    {
      "title": "问题背景：AI 成本不只来自聊天模型",
      "body": "AI 应用的成本通常分散在多个环节：文档解析、OCR、embedding、向量存储、检索、rerank、生成模型、队列 Worker、对象存储、报告导出和人工审核。只看一次回答的 token 费用，很容易低估真实成本。"
    },
    {
      "title": "成本结构：按业务链路拆开",
      "body": "RAG 可以拆成入库成本和查询成本。入库成本包括上传存储、解析、OCR、chunk、embedding 和索引；查询成本包括 query rewrite、检索、rerank、上下文 token、生成 token 和缓存。合同批量审查还要加报告生成和人工复核成本。"
    },
    {
      "title": "预算字段：让每一项成本可追踪",
      "body": "一张实用预算表可以记录 scenario、tenantId、model、inputTokens、outputTokens、embeddingTokens、ocrPages、storageMB、jobCount、retryCount、exportCount、humanReviewMinutes、unitPrice 和 totalCost。这样才能看清成本来自哪里。"
    },
    {
      "title": "工程取舍：成本要和质量一起看",
      "body": "省成本不能只砍 token。topK 降低可能导致漏召回，使用便宜模型可能导致结构化输出失败，关闭 rerank 可能增加人工复核。成本优化要同时观察召回率、引用准确率、人工驳回率、延迟和用户满意度。"
    },
    {
      "title": "运营控制：设置配额和告警",
      "body": "系统可以按租户、用户、项目和功能设置每日或每月预算。接近阈值时给出告警，超过阈值时降级模型、限制批量任务、延迟低优先级任务或要求人工确认。后台批量任务尤其需要预算保护。"
    },
    {
      "title": "优化策略：缓存和分层模型一起用",
      "body": "稳定 FAQ、文档摘要和低风险问答可以使用缓存；复杂审查、法律风险判断和高价值生成使用更强模型。embedding、rerank、generate 可以分别选择模型，不必所有环节都使用最贵方案。"
    }
  ],
  "takeaways": [
    "AI 成本要按完整业务链路估算，不能只看生成模型 token。",
    "预算表应覆盖 token、OCR、存储、任务重试、导出和人工审核。",
    "成本优化必须和召回质量、引用准确率、人工驳回率一起评估。"
  ]
}

export default post
