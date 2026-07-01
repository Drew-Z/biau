import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "rag-query-log-analysis",
  "title": "RAG 查询日志分析：用户问题、无答案与内容缺口",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "RAG 上线后，用户问题本身就是知识库运营信号。本文讨论如何分析查询日志、无答案问题、低置信度回答和 citation 反馈来改进知识库。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "查询日志",
    "无答案分析",
    "知识库运营"
  ],
  "scenarios": [
    "企业知识库优化",
    "Legal RAG 运营",
    "RAG 效果复盘"
  ],
  "practiceChecklist": [
    "记录 query、rewrittenQuery、topK、citations、answerStatus 和 feedback",
    "把无答案、低置信度、引用错误和用户追问分开统计",
    "将高频失败问题转成补文档、调检索或新增 golden set 的任务"
  ],
  "sections": [
    {
      "title": "问题背景：用户问题是知识库的体温计",
      "body": "RAG 系统上线后，最有价值的数据不只是答案文本，而是用户到底在问什么、哪些问题答不上来、哪些引用被质疑、哪些主题反复出现。查询日志分析能让知识库从一次性导入变成持续运营。"
    },
    {
      "title": "日志字段：只记问题不够",
      "body": "查询日志至少应包含 userScope、query、rewrittenQuery、filters、topK、retrievedChunkIds、citations、answerStatus、confidence、latency、model、promptVersion 和 feedback。字段越结构化，后续越容易判断问题发生在文档缺失、权限过滤、检索召回、rerank 还是生成阶段。"
    },
    {
      "title": "问题分类：把失败原因拆开看",
      "body": "无答案不一定是坏事，可能是知识库确实没有资料，也可能是检索没有召回。低置信度说明证据不足，引用错误说明 chunk、rerank 或生成存在问题，用户连续追问说明答案没有覆盖真实意图。不同类型对应不同改进动作。"
    },
    {
      "title": "运营动作：日志要推动知识库更新",
      "body": "高频无答案问题可以进入补文档清单；引用错误进入 citation 评测集；低置信度问题用于调整 query rewrite 和 rerank；重复追问可以沉淀为 FAQ 或标准问法。日志分析的目标不是看报表，而是驱动知识库治理。"
    },
    {
      "title": "隐私边界：查询日志也可能敏感",
      "body": "用户问题可能包含合同内容、客户名称、金额、个人信息或内部策略。日志默认应保存结构化摘要、hash 或脱敏片段，只有具备权限的角色才能查看完整上下文，并且要有留存期限和审计记录。"
    },
    {
      "title": "项目例子：合同审查问题复盘",
      "body": "Legal RAG 可以按风险类型统计查询：付款、违约、保密、知识产权和管辖。若“付款期限是否合理”经常无答案，就检查付款条款是否被正确解析、chunk 是否保留页码、检索是否命中对应条款，再把失败样例加入 golden set。"
    }
  ],
  "takeaways": [
    "RAG 查询日志能暴露知识库缺口、检索问题和用户真实需求。",
    "无答案、低置信度、引用错误和连续追问要分开分析。",
    "日志分析要转化为补文档、调检索、补评测和内容治理任务。"
  ]
}

export default post
