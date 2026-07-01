import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "embedding-vector-search",
  "title": "Embedding 与向量检索：让业务文本进入语义搜索系统",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "Embedding 让文本可以参与相似度计算，但向量检索不是全部答案。本文从概念、流程、工程取舍和合同审查项目例子，梳理语义检索如何落地。",
  "date": "2026-06-20",
  "readTime": "11 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Embedding",
    "向量相似度检索",
    "向量库选型"
  ],
  "scenarios": [
    "知识库问答",
    "相似条款检索",
    "合同风险依据召回"
  ],
  "practiceChecklist": [
    "保证文档入库和用户查询使用同一套 embedding 版本",
    "先用 metadata filter 限定业务范围，再做相似度检索",
    "把向量检索、关键词检索和 rerank 组合起来验证引用质量"
  ],
  "sections": [
    {
      "title": "概念：Embedding 把文本变成可计算的语义向量",
      "body": "Embedding 可以理解为文本的数字表示。它把一句话、一段合同条款或一段技术文档转换成向量，让系统可以计算不同文本之间的语义距离。比如“付款周期过长”和“账期超过 90 天”字面不完全一样，但语义上接近，Embedding 能让它们在向量空间里靠得更近。"
    },
    {
      "title": "流程：从文档 chunk 到 TopK 召回",
      "body": "向量检索通常从入库开始：系统先把文档解析并切成 chunk，再为每个 chunk 生成 embedding，连同来源元数据写入向量库。用户提问时，系统也把问题转成 embedding，然后在向量库里查找最相似的 TopK 片段。这些片段会进入后续 rerank 和上下文拼接流程，最终交给模型生成答案。"
    },
    {
      "title": "工程取舍：TopK、阈值和召回噪声",
      "body": "TopK 过小可能漏掉关键证据，TopK 过大又会增加无关上下文和 token 成本。相似度阈值可以过滤低相关片段，但阈值太高会导致系统找不到可用依据。真实项目里通常要同时调 TopK、score threshold、metadata filter 和 rerank，并用标准问题观察正确引用是否进入最终上下文。"
    },
    {
      "title": "业务边界：为什么需要 metadata filter",
      "body": "向量检索只知道语义相似，不知道业务权限和文档边界。用户问某一份合同的问题，系统不能从另一份合同里召回“看起来相似”的条款；多租户知识库也不能跨客户检索。metadata filter 的作用是在检索前限定 tenantId、documentId、category、version、permissionScope 等条件，把语义搜索放进正确业务范围。"
    },
    {
      "title": "选型：pgvector 与专用向量库怎么取舍",
      "body": "中小型 RAG 项目可以优先考虑 PostgreSQL + pgvector，因为业务表、文档元数据、权限字段和向量索引可以放在同一套数据库里，部署、备份和事务管理更简单。如果数据量很大、向量维度高、检索并发高或需要更复杂的 ANN 调优，再考虑 Qdrant、Milvus 等专用向量库。选型不是越重越好，而是看数据规模和运维能力。"
    },
    {
      "title": "项目例子：合同审查不能只靠向量检索",
      "body": "在合同审查里，向量检索可以找到语义相关条款，但对条款号、金额、日期、专有名词和精确短语并不稳定。用户问“第八条违约金是否过高”，系统既要理解“违约金过高”的语义，也要准确命中“第八条”。因此合同场景更适合向量检索、关键词检索、metadata filter 和 rerank 组合使用。"
    }
  ],
  "takeaways": [
    "Embedding 解决的是语义相似度计算问题，不等于完整的知识库系统。",
    "向量检索必须和业务过滤、阈值、TopK、rerank 一起设计。",
    "合同和法律场景需要补关键词检索与引用评估，才能保证证据准确。"
  ]
}

export default post
