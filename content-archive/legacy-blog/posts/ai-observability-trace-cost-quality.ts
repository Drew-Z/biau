import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-observability-trace-cost-quality",
  "title": "AI 应用可观测性：用 Trace 串起日志、成本和质量指标",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 应用上线后不能只看接口错误率。本文讨论如何用 traceId 串起检索、模型、工具、队列、成本、引用质量和人工复核数据。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Observability",
    "Trace",
    "质量指标"
  ],
  "scenarios": [
    "RAG 线上排障",
    "Agent 工具调用追踪",
    "AI 成本和质量复盘"
  ],
  "practiceChecklist": [
    "为每次请求生成 traceId，串联检索、模型、工具、队列和前端状态",
    "记录 token、延迟、错误、引用命中率、结构化失败率和人审结果",
    "把稳定性、成本、质量和安全指标放在同一套观测体系里"
  ],
  "sections": [
    {
      "title": "概念：AI 应用的问题跨越多个阶段",
      "body": "传统后端主要看接口耗时、错误率和数据库指标。AI 应用还要关注检索有没有命中、模型用了哪个版本、prompt 是哪一版、token 花了多少、工具调用是否成功、引用是否支撑答案、人工复核有没有驳回。没有可观测性，线上问题很难定位。"
    },
    {
      "title": "流程：Trace 串起完整请求链路",
      "body": "一次 RAG 请求可能经过 query rewrite、metadata filter、向量检索、关键词检索、rerank、上下文拼接、模型生成、结构化校验和引用返回。每个阶段都应该用同一个 traceId 串起来，这样排障时能看到到底是检索错了、排序错了，还是生成偏离了上下文。"
    },
    {
      "title": "工程取舍：日志要有用，也要克制",
      "body": "模型日志至少包括 model、promptVersion、inputToken、outputToken、latency、temperature、status、errorType 和 requestId。为了保护隐私，日志里不一定保存完整原文，可以保存脱敏摘要、引用 ID 或受控采样。真正需要回溯原文时，应通过权限校验读取。"
    },
    {
      "title": "指标：成本和质量要一起看",
      "body": "AI 应用不能只看成本，也不能只看回答效果。可以同时观察平均 token、平均耗时、缓存命中率、失败重试率、召回命中率、citation 命中率、结构化校验失败率和人工驳回率。这样才知道优化是否真的有效。"
    },
    {
      "title": "项目例子：RAG、Agent 和队列都需要 Trace",
      "body": "legal-rag 的一次合同审查可以用 traceId 串起文档、chunk、检索、模型、风险项和引用；Pet Workspace 可以串起生成、QA、repair、人审和发布；Ozon ERP 可以串起插件采集、API、队列、外部平台写入和审计日志。"
    },
    {
      "title": "持续改进：观测结果要反哺系统",
      "body": "可观测性不是为了堆仪表盘，而是为了持续改进。人工复核经常驳回某类风险，可以回到 prompt、检索或规则层优化；某个模型版本结构化失败率高，可以降级或回滚；某类文档解析失败多，就要改 parser 或清洗规则。"
    }
  ],
  "takeaways": [
    "AI 应用要观察检索、模型、工具、队列、成本和人工复核全链路。",
    "traceId 能帮助定位问题发生在 RAG 或 Agent 的哪个阶段。",
    "成本、质量、隐私和安全指标必须一起看，单独优化任何一边都容易失真。"
  ]
}

export default post
