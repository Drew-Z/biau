import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "rag-incremental-indexing",
  "title": "RAG 增量索引：文档更新、删除与重新 Embedding",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "企业知识库会持续更新。本文讨论 documentVersion、contentHash、软删除、索引切换和缓存失效如何支撑增量索引。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "增量索引",
    "文档版本",
    "缓存失效"
  ],
  "scenarios": [
    "企业知识库更新",
    "合同版本变更",
    "批量文档重建索引"
  ],
  "practiceChecklist": [
    "为 document、chunk、embedding 记录版本和状态",
    "文档更新时只重建受影响 chunk 和 embedding",
    "删除或归档文档时同步失效检索缓存和 citation"
  ],
  "sections": [
    {
      "title": "问题背景：知识库不是一次性导入",
      "body": "企业文档会不断更新、替换、归档和删除。如果每次变化都全量重建索引，成本高、耗时长，也容易造成服务不可用。增量索引的目标是只处理发生变化的内容，同时保证检索结果不读到过期或已删除资料。"
    },
    {
      "title": "版本字段：先让变化可判断",
      "body": "Document 可以有 version、status、updatedAt、deletedAt；Chunk 可以有 chunkVersion、contentHash、documentVersion；Embedding 可以有 embeddingVersion、model、dimension 和 chunkId。版本字段能帮助系统判断哪些内容需要重新处理，哪些结果可以继续复用。"
    },
    {
      "title": "更新策略：只重建受影响内容",
      "body": "文档更新后，可以先比较 hash、章节结构和 chunk 内容。没有变化的 chunk 可以复用 embedding；内容变化的 chunk 重新 embedding；结构变化导致 chunk 边界变化时，再重建对应章节。这样比整份文档全量重跑更稳。"
    },
    {
      "title": "删除策略：软删除和硬删除分开处理",
      "body": "删除文档时，通常先把 Document 标记为 deleted 或 archived，并让检索 filter 默认排除。真正硬删除时，要同步删除原始文件、chunk、embedding、缓存、导出链接和引用关系。软删除能提供恢复窗口，硬删除则要满足隐私和成本要求。"
    },
    {
      "title": "切换流程：避免半成品索引可见",
      "body": "重建索引时，不应该让用户检索到一半旧一半新的数据。可以使用 building、ready、failed 状态，或者用 indexVersion 先构建新版本，完成后再切换 activeVersion。失败时继续使用旧索引并暴露重建失败状态。"
    },
    {
      "title": "一致性：缓存和引用也要跟着失效",
      "body": "文档更新后，旧答案缓存、旧 citation、导出报告和评测样例可能都指向旧版本。系统需要按 documentId、documentVersion、chunkId 和 cacheKey 做失效，避免用户看到已经过期的依据。"
    }
  ],
  "takeaways": [
    "RAG 增量索引要用版本、状态和 hash 判断哪些内容需要重建。",
    "文档删除必须同步处理 chunk、embedding、缓存、引用和导出物。",
    "索引重建要有 activeVersion 或状态切换，避免半成品被检索到。"
  ]
}

export default post
