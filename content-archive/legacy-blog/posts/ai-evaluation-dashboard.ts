import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-evaluation-dashboard",
  "title": "AI 评测看板：召回、引用、延迟、成本与反馈",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "AI 质量需要被持续观察。本文讨论如何把离线 Golden Set、线上 trace、质量、成本、错误和人工反馈放进统一看板。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "评测看板",
    "质量指标",
    "反馈闭环"
  ],
  "scenarios": [
    "RAG 质量监控",
    "合同审查评测",
    "Agent 线上质量追踪"
  ],
  "practiceChecklist": [
    "把 offline golden set 和线上 trace 指标分开展示",
    "同时观察质量、延迟、成本、错误和人工反馈",
    "按模型、promptVersion、tenant、场景和时间维度筛选"
  ],
  "sections": [
    {
      "title": "问题背景：没有看板就很难持续优化",
      "body": "AI 应用上线后，不能只靠用户说好不好用。需要把召回、引用、延迟、成本、错误和反馈变成可观察指标。评测看板的价值，是让优化不再依赖感觉，而是能看到某次模型切换或 prompt 调整到底带来了什么影响。"
    },
    {
      "title": "数据来源：区分离线评测和线上指标",
      "body": "离线评测基于 golden set，适合看 recall、citation hit、answer faithfulness 和结构化输出正确率。线上指标来自真实 trace，适合看 latency、token、cost、errorType、fallback 触发率、人工驳回率和用户反馈。两者要分开看，也要能关联。"
    },
    {
      "title": "RAG 视角：召回、引用和无答案处理",
      "body": "RAG 看板可以展示检索命中率、TopK 命中、citation 命中率、无答案率、低置信度比例、rerank 前后排名变化和引用反馈。按文档类型、租户、问题类型和 promptVersion 分组，能更快定位问题来源。"
    },
    {
      "title": "Agent 视角：步骤、工具和人工接管",
      "body": "Agent 看板可以展示平均步骤数、工具调用成功率、循环调用次数、人工接管率、任务完成率、失败阶段分布和高风险工具拦截次数。这样能判断 Agent 是真的完成任务，还是把复杂度转移给人工。"
    },
    {
      "title": "经营视角：成本和质量要放在一起",
      "body": "只看成本容易误伤质量，只看质量又可能失控。看板应该把 token、OCR 页数、embedding 次数、模型费用、P95 延迟、人工复核时间和用户反馈放在同一视角里，方便判断某次优化是否值得。"
    },
    {
      "title": "行动闭环：看板要服务决策",
      "body": "好的看板不只是图表堆叠。它要能回答“这次发版有没有变差”“哪个租户失败率最高”“哪个 promptVersion 成本异常”“哪些问题应该进入 golden set”。指标最终要能推动行动。"
    }
  ],
  "takeaways": [
    "AI 评测看板要同时覆盖离线 golden set 和线上 trace 指标。",
    "质量、延迟、成本、错误和人工反馈要放在同一观察体系里。",
    "看板的目标是支持调参、回滚、补文档和沉淀评测样例。"
  ]
}

export default post
