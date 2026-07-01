import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "rag-data-versioning",
  "title": "RAG 数据版本：文档、Chunk 与 Embedding 如何支持回溯",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "文档会更新，切分策略和 embedding 模型也会升级。本文讨论 documentVersion、chunkVersion、embeddingVersion 和 reindex 任务如何支撑审计。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "数据版本",
    "重新索引",
    "版本兼容"
  ],
  "scenarios": [
    "合同版本更新",
    "chunk 策略调整",
    "embedding 模型升级"
  ],
  "practiceChecklist": [
    "document、chunk、embedding 分别记录版本",
    "切分或模型变化后标记需要重新索引",
    "回答和 citation 保留产生时的数据版本，方便回溯"
  ],
  "sections": [
    {
      "title": "问题背景：回答必须知道基于哪一版资料",
      "body": "企业文档会更新，chunk 策略会调整，embedding 模型也可能升级。如果系统不记录版本，就很难知道某个回答基于哪一版文档、哪一版切分和哪一个 embedding 生成。生产化 RAG 必须能回溯数据版本。"
    },
    {
      "title": "文档版本：保留 active 与历史状态",
      "body": "同一个业务文档可以有多个版本，例如合同初稿、修订稿和最终稿。document 表可以保留 documentId、version、fileHash、status、uploadedAt 和 supersededBy。查询时默认使用 active 版本，但历史回答仍然能回到当时引用的版本。"
    },
    {
      "title": "Chunk 版本：来自解析和切分策略",
      "body": "chunk 不是永久不变的。chunkSize、overlap、清洗规则、标题识别和表格处理变化后，同一份文档会产生不同 chunk。chunk 记录里应该包含 chunkVersion、parserVersion、cleanerVersion 和 chunkerVersion，方便判断是否需要重建索引。"
    },
    {
      "title": "Embedding 版本：来自模型、维度和供应商",
      "body": "embeddingModel、dimension、provider 和归一化策略变化后，旧向量可能不能和新向量混用。embedding 记录应保存 embeddingVersion、model、dimension 和 createdAt。升级模型时可以并行保留旧索引和新索引，逐步切流。"
    },
    {
      "title": "工程取舍：重新索引要任务化",
      "body": "文档版本、解析器、chunker 或 embedding 模型变化后，系统可以创建 reindex job。Worker 按文档范围重新解析、切分、生成 embedding，并更新索引状态。前端展示 reindexing 状态，避免用户误以为知识库已经完全更新。"
    },
    {
      "title": "审计回溯：回答结果也要记录版本",
      "body": "RAG 回答和合同审查报告应该记录 documentVersion、chunkVersion、embeddingVersion、promptVersion 和 model。这样当用户质疑某个结论时，系统能回到当时的数据和模型环境，而不是只看到当前最新文档。"
    }
  ],
  "takeaways": [
    "RAG 数据版本要覆盖文档、chunk、embedding、prompt 和模型。",
    "切分策略或 embedding 模型变化后，需要重新索引任务。",
    "回答结果记录版本信息，才能支持回溯和审计。"
  ]
}

export default post
