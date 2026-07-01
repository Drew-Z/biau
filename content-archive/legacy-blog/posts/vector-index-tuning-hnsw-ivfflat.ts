import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "vector-index-tuning-hnsw-ivfflat",
  "title": "向量索引调优：从精确查询到 HNSW 与 IVFFlat",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "向量检索从小规模精确查询走向近似索引时，必须同时关注召回、延迟、过滤条件和维护成本。本文讨论 HNSW 与 IVFFlat 的取舍。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "向量索引",
    "HNSW",
    "IVFFlat"
  ],
  "scenarios": [
    "pgvector 检索优化",
    "企业知识库扩容",
    "RAG 延迟优化"
  ],
  "practiceChecklist": [
    "小数据量先用简单精确查询验证质量",
    "数据增长后再引入 HNSW 或 IVFFlat",
    "调索引时同时观察召回率、延迟和过滤条件影响"
  ],
  "sections": [
    {
      "title": "问题背景：不要一开始就调索引",
      "body": "RAG 早期更重要的是切分、清洗、引用和评估。数据量小的时候，精确向量查询已经足够，过早调 HNSW 或 IVFFlat 反而会增加复杂度。先用 golden set 验证检索质量，再根据数据量和延迟需求优化索引。"
    },
    {
      "title": "核心概念：精确查询和近似查询",
      "body": "精确查询会计算更完整的相似度，结果更稳定，但数据量大时会慢。近似索引通过图结构或聚类减少搜索范围，能降低延迟，但可能牺牲部分召回。RAG 系统要在响应速度和找全正确证据之间平衡。"
    },
    {
      "title": "HNSW：适合读多写少的高频查询",
      "body": "HNSW 通常召回效果好、查询速度快，适合读多写少、对延迟敏感的场景。代价是索引构建和内存成本较高，参数也会影响召回和速度。对于企业知识库，如果文档稳定、查询频繁，HNSW 是常见选择。"
    },
    {
      "title": "IVFFlat：参数和数据分布更敏感",
      "body": "IVFFlat 通过聚类把向量分桶，查询时只搜索部分列表。它对数据分布和 lists、probes 参数比较敏感。参数太小可能漏召回，参数太大又接近全量扫描。适合在数据规模变大后结合评测集逐步调参。"
    },
    {
      "title": "工程取舍：metadata filter 会影响索引收益",
      "body": "企业 RAG 常常先按 tenant、workspace、document、status 过滤，再做向量检索。过滤条件太细时，索引收益可能下降；如果先向量再过滤，又可能召回无权限或无关结果。索引调优要和 metadata filter 一起看。"
    },
    {
      "title": "评估方法：同时看召回、延迟和维护成本",
      "body": "不要只看查询耗时。至少要观察 TopK 命中率、citation 命中率、P95 延迟、索引构建时间、内存占用和更新成本。每次调整索引参数，都用固定 golden set 验证检索质量是否退化。"
    }
  ],
  "takeaways": [
    "向量索引调优要在召回率、延迟和维护成本之间取舍。",
    "HNSW 常适合高查询性能场景，IVFFlat 对参数和数据分布更敏感。",
    "索引调优必须结合 metadata filter 和 golden set 验证。"
  ]
}

export default post
