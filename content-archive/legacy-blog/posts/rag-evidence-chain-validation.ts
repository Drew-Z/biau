import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "rag-evidence-chain-validation",
  "title": "RAG 证据链校验：Citation、Quote、ChunkId 与版本一致性",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "RAG 的可信度不只取决于有没有引用，还取决于引用是否能回到正确版本的原文。本文讨论证据链一致性如何校验。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "证据链",
    "Citation 校验",
    "版本一致性"
  ],
  "scenarios": [
    "法律 RAG 报告",
    "企业知识库问答",
    "审计追溯"
  ],
  "practiceChecklist": [
    "citation 至少绑定 documentId、documentVersion、chunkId、quote 和定位信息",
    "生成后校验 quote 是否来自对应 chunk 原文",
    "文档更新、删除和重建索引后要让旧 citation 可追溯或明确失效"
  ],
  "sections": [
    {
      "title": "问题背景：有引用不等于可信",
      "body": "很多 RAG 系统会在答案后附上引用，但如果引用和结论不一致，或者引用指向了旧版本文档，用户仍然无法核验答案。证据链校验要解决的是答案、引用、原文和版本之间是否真的对应。"
    },
    {
      "title": "字段设计：citation 要能回到原文",
      "body": "citation 至少包含 documentId、documentVersion、chunkId、source、page、section、clauseNo、quote 和 score。documentVersion 确认引用的是哪一版文档，chunkId 用于定位切片，quote 用于给用户快速核验。"
    },
    {
      "title": "生成后校验：quote 必须来自上下文",
      "body": "模型生成 citation 后，服务端应该校验 quote 是否出现在对应 chunk 原文中，chunk 是否属于当前用户可访问文档，documentVersion 是否匹配，风险结论是否至少有一个可核验引用。无法通过校验的结论应标记低置信度或进入人工复核。"
    },
    {
      "title": "版本问题：文档更新后如何处理旧报告",
      "body": "文档更新会导致 chunkId、embedding 和 quote 变化。旧报告可以继续指向历史 documentVersion，也可以提示“引用基于旧版本文档”。如果旧版本不再保留，就要明确 citation 已失效，而不是悄悄指向新文档。"
    },
    {
      "title": "工程取舍：强校验会增加成本",
      "body": "强证据链校验会增加存储和计算成本，但在法律、合同、审计等场景非常必要。可以先对高风险结论和导出报告做强校验，对普通问答做轻量校验，再逐步扩大范围。"
    },
    {
      "title": "项目例子：Legal RAG 的报告引用校验",
      "body": "Legal RAG 可以在导出报告前遍历每个 riskItem，检查 citations 是否存在、quote 是否来自 chunk、documentVersion 是否一致、用户是否有权限查看原文。校验失败的 riskItem 进入待复核状态。"
    }
  ],
  "takeaways": [
    "RAG 可信度要看答案、citation、quote、chunk 和文档版本是否一致。",
    "导出报告前应做引用来源、权限和版本校验。",
    "文档更新后旧 citation 要能追溯历史版本或明确失效。"
  ]
}

export default post
