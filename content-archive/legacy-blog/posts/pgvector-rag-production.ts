import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "pgvector-rag-production",
  "title": "pgvector 落地方案：中小型 RAG 项目如何持久化向量",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "RAG 从内存 Demo 走向可交付系统，必须解决文档、chunk、embedding 和权限过滤的持久化问题。本文讨论 PostgreSQL + pgvector 的落地方式。",
  "date": "2026-06-20",
  "readTime": "11 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "pgvector",
    "PostgreSQL",
    "向量持久化"
  ],
  "scenarios": [
    "合同知识库",
    "企业文档问答",
    "RAG MVP 生产化"
  ],
  "practiceChecklist": [
    "document、chunk、embedding 分层建表并保留版本信息",
    "向量查询必须结合 tenant、document、status 等 metadata filter",
    "数据量增长后再评估 HNSW/IVFFlat 索引和专用向量库"
  ],
  "sections": [
    {
      "title": "概念：向量库首先是数据持久化问题",
      "body": "RAG Demo 可以用内存向量库证明流程，但真实系统要面对重启恢复、权限隔离、历史版本、增量更新和备份。pgvector 的优势是把向量检索放进 PostgreSQL，让业务表、文档元数据、chunk 和 embedding 共用一套数据库能力。"
    },
    {
      "title": "流程：从 document 到 chunk 再到 embedding",
      "body": "常见设计是 document 表保存文件级信息，例如文件名、hash、上传人、租户、版本和状态；chunk 表保存切分片段、页码、章节、条款号、quote 和 token 估算；embedding 字段或 embedding 表保存向量、模型名、维度和生成版本。这样后续查询、重建索引和引用回溯都有数据基础。"
    },
    {
      "title": "工程取舍：先过滤业务范围，再算相似度",
      "body": "RAG 查询通常不是全库搜索。用户可能只问某个合同、某个客户、某个项目或某个权限范围内的文档。PostgreSQL + pgvector 的价值在于可以把 tenantId、documentId、status、category、version 等 SQL 过滤和向量相似度结合起来，减少错召回和权限风险。"
    },
    {
      "title": "索引：不要过早复杂化",
      "body": "小数据量阶段可以先用直接相似度查询，便于验证效果和调试引用。数据量增长后，再考虑 HNSW 或 IVFFlat 等近似索引提高检索速度。索引会带来构建成本、存储成本和召回行为变化，所以要用评估集观察延迟和引用命中率，而不是只看查询速度。"
    },
    {
      "title": "项目例子：legal-rag 从 MemoryVectorStore 升级",
      "body": "legal-rag 的 MVP 可以使用 MemoryVectorStore 跑通导入、检索和 citations。生产化时，只要 VectorStore 抽象稳定，就可以替换为 PgVectorStore：文档和 chunk 持久化到 PostgreSQL，embedding 写入 pgvector，查询时结合 documentId、tenantId 和 status 做过滤，上层问答流程不需要大改。"
    },
    {
      "title": "边界：什么时候考虑专用向量库",
      "body": "如果向量规模很大、并发很高、需要复杂集合管理、跨语言服务或更强 ANN 能力，可以评估 Qdrant、Milvus 等专用向量库。但中小型 RAG 项目优先使用 pgvector，通常能换来更低的部署和运维成本。"
    }
  ],
  "takeaways": [
    "pgvector 适合中小型 RAG 项目从内存 Demo 走向可持久化系统。",
    "向量检索必须和业务元数据、权限和版本过滤结合使用。",
    "索引和专用向量库应按规模与评估结果升级，不必一开始就上重方案。"
  ]
}

export default post
