import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "rag-operations-console",
  "title": "RAG 运营后台：文档质量、查询质量、反馈与 Owner 任务",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "RAG 上线后需要持续运营。本文讨论如何把文档质量、查询失败、用户反馈、引用问题和 owner 任务组织成可执行后台。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "RAG 运营",
    "质量看板",
    "Owner 任务"
  ],
  "scenarios": [
    "企业知识库运营",
    "RAG 质量维护",
    "内容治理后台"
  ],
  "practiceChecklist": [
    "运营后台至少包含文档质量、查询质量、反馈列表和 owner 任务",
    "把无答案、低置信度、引用错误转成可处理工单",
    "任务处理后回写 documentVersion、promptVersion、evalSet 和发布记录"
  ],
  "sections": [
    {
      "title": "问题背景：RAG 质量会随时间漂移",
      "body": "RAG 系统上线后，业务问题会变、文档会过期、用户表达会变化，最初表现不错的检索链路也可能逐渐失准。没有运营后台，团队只能等用户抱怨后手工排查，很难形成持续改进机制。"
    },
    {
      "title": "文档质量：看解析、chunk 和 metadata",
      "body": "文档质量看板可以展示解析成功率、空文档、超长 chunk、缺失 metadata、过期文档、无 owner 文档和权限异常文档。质量问题不是模型问题，很多时候是资料结构和入库流程没有处理好。"
    },
    {
      "title": "查询质量：从无答案和低置信度入手",
      "body": "查询质量看板应记录 query、rewrittenQuery、filters、retrievedChunks、citations、answerStatus、confidence、latency 和 feedback。高频无答案、低置信度、引用不匹配和用户差评，都应该进入问题池。"
    },
    {
      "title": "反馈闭环：从反馈到任务",
      "body": "用户反馈不能只存成一行日志。系统要把反馈分类为资料缺失、检索失败、引用错误、回答不可用、权限问题或交互问题，并分配给 owner。处理动作可以是补文档、改 metadata、调整 chunk、增加评测样例或修改提示词。"
    },
    {
      "title": "工程取舍：后台先做可行动项",
      "body": "运营后台不需要一开始就做复杂 BI。MVP 可以先做问题列表、任务状态、责任人、处理结果和版本记录。关键是每个指标都能指向动作，否则看板会变成好看的噪声。"
    },
    {
      "title": "项目例子：合同知识库运营台",
      "body": "Legal RAG 可以把付款、违约、保密、知识产权和管辖相关查询分组统计。某类问题频繁无答案时，后台生成 owner 任务，要求补充合同模板、调整标签或把失败样例加入 Golden Set。"
    }
  ],
  "takeaways": [
    "RAG 运营后台要把质量指标转成 owner 可处理任务。",
    "文档质量、查询质量和用户反馈需要统一闭环。",
    "版本记录能说明一次治理动作到底影响了哪些答案。"
  ]
}

export default post
