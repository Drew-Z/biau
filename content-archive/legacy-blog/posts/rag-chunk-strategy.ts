import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "rag-chunk-strategy",
  "title": "RAG 文档切分策略：Chunk Size、Overlap 与元数据设计",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "文档切分决定了 RAG 能否检索到正确证据。本文围绕 chunk size、overlap、结构化元数据和合同条款切分，整理一套可落地的设计方法。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Chunk 切分策略",
    "Chunk overlap",
    "来源元数据设计"
  ],
  "scenarios": [
    "合同条款审查",
    "企业制度问答",
    "长文档知识库入库"
  ],
  "practiceChecklist": [
    "先尊重文档结构，再用 token 长度兜底",
    "为每个 chunk 保留 source、page、section、chunkIndex 和 quote",
    "通过标准问题检查引用是否完整，而不是只检查切分是否成功"
  ],
  "sections": [
    {
      "title": "概念：chunk 是 RAG 的最小证据单元",
      "body": "RAG 不是把整份文档扔进模型，而是把文档拆成一个个可检索、可引用、可排序的片段。这个片段就是 chunk。一个好的 chunk 应该足够完整，能保留上下文；也要足够聚焦，避免把太多无关内容带进回答。切分质量会直接影响召回质量、引用准确性和最终答案可信度。"
    },
    {
      "title": "流程：先按结构切，再按长度兜底",
      "body": "实际项目里不建议一开始就按固定字数硬切。更稳的做法是先读取文档结构：标题、章节、条款号、列表、表格、页码；然后按语义段落或条款形成初始片段；最后再用 token 长度做兜底，处理过长段落。这样既能尊重文档原有结构，也能避免单个 chunk 超出上下文预算。"
    },
    {
      "title": "取舍：chunk size 没有统一答案",
      "body": "技术文档适合按小节切，客服知识库适合按问答对切，合同文档则更适合按条款和标题层级切。chunk 太大，召回后上下文噪声会多；chunk 太小，模型可能只看到风险句，却看不到定义、例外或限制条件。设计时要把文档类型、查询方式、引用展示和 token 成本一起考虑。"
    },
    {
      "title": "Overlap：保护跨段语义，但不能滥用",
      "body": "Overlap 用来保留相邻片段之间的连续语义。比如合同里上一段定义“交付成果”，下一段描述验收和违约，如果完全切断，检索可能只命中后半段，导致答案缺少前提。适度 overlap 能减少这种问题，但 overlap 过大也会产生重复上下文，让 rerank 和模型生成受到干扰。"
    },
    {
      "title": "元数据：让 chunk 能回到原文",
      "body": "RAG 的可信度不只来自正文，还来自元数据。合同场景至少应该记录 source、page、section、clauseNo、chunkIndex 和 quote。回答返回 citation 时，前端可以展示文件、页码、章节和原文摘录，用户才能确认系统没有引用错条款，也能在审查报告里保留可追溯证据。"
    },
    {
      "title": "项目例子：合同条款如何切分",
      "body": "在合同审查 RAG 中，付款、交付、违约、保密、知识产权和争议解决等条款通常需要完整保留。如果某个条款跨页，parser 和 chunker 要尽量保留连续结构；如果表格里有金额和期限，不能简单转成散乱文本。验证切分是否合理，应该用标准问题检查：系统能否召回正确条款，引用是否完整，风险说明是否能回到原文。"
    }
  ],
  "takeaways": [
    "Chunk 是 RAG 的最小证据单元，切分质量决定了后续检索和引用质量。",
    "合同类文档要优先保留条款结构、页码、章节和原文摘录。",
    "判断切分好不好，要看真实问题下的召回和 citation 命中率，而不是只看切分数量。"
  ]
}

export default post
