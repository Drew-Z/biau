import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "rag-cache-strategy",
  "title": "RAG 缓存策略：Embedding、检索结果和答案如何安全复用",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "RAG 缓存能降低成本和延迟，但也可能带来权限、版本和旧答案风险。本文讨论 documentHash、embedding 缓存、检索缓存、答案缓存和失效策略。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "缓存策略",
    "Embedding 复用",
    "缓存失效"
  ],
  "scenarios": [
    "文档重复入库",
    "相似问题查询",
    "高频知识库问答"
  ],
  "practiceChecklist": [
    "用 documentHash 和 textHash 避免重复解析、切分和 embedding",
    "检索缓存必须带 tenant、documentScope、query、filter 和版本信息",
    "答案缓存只用于低风险稳定问题，并设置明确失效条件"
  ],
  "sections": [
    {
      "title": "概念：缓存能省成本，也会放大旧结果风险",
      "body": "RAG 系统里文档解析、OCR、chunk、embedding、检索、rerank 和模型生成都可能消耗时间和成本。缓存可以避免重复处理相同文档、相同 chunk 或相似查询，同时提升响应速度。但缓存必须和权限、版本、数据更新一起设计。"
    },
    {
      "title": "流程：从文件 hash 到查询缓存",
      "body": "上传文件可以先计算 documentHash，如果文件内容相同，就避免重复解析和切分；chunk 可以基于 textHash 判断是否需要重新 embedding；查询阶段可以缓存检索结果；最终答案则只在低风险场景谨慎缓存。"
    },
    {
      "title": "工程取舍：Embedding 缓存最常见",
      "body": "Embedding 对同一段文本通常是稳定的，因此可以按 model、dimension、textHash 缓存。需要注意的是，换 embedding 模型、换维度、清洗策略或 chunk 版本后，旧 embedding 可能不再适用，需要重新生成。"
    },
    {
      "title": "权限：检索缓存必须带范围",
      "body": "检索结果缓存不能只按 query 缓存，还要带 tenantId、workspaceId、documentScopeHash、filter、embeddingModel 和 rerankVersion。否则不同租户或不同文档范围可能复用到错误结果，造成数据泄露或回答不准。"
    },
    {
      "title": "项目例子：合同审查答案缓存要谨慎",
      "body": "最终答案缓存适合低风险、稳定、权限范围明确的问题，比如公开 FAQ 或固定制度解释。合同审查、高风险法律建议、最新业务数据和带人工复核的结果不适合随意复用答案，至少要带版本和失效条件。"
    },
    {
      "title": "失效：缓存规则比缓存实现更重要",
      "body": "文档更新、权限变化、promptVersion 改动、embeddingModel 更换、rerank 策略变化和人工审核修正，都可能让缓存失效。生产系统要记录缓存 key 组成和失效规则，避免用旧结果回答新问题。"
    }
  ],
  "takeaways": [
    "RAG 缓存可以降低成本和延迟，但必须带权限和版本信息。",
    "Embedding 缓存常用，答案缓存要谨慎。",
    "文档、模型、prompt、权限变化都可能触发缓存失效。"
  ]
}

export default post
