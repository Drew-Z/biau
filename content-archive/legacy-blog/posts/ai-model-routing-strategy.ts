import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-model-routing-strategy",
  "title": "多模型路由策略：快模型、强模型与本地模型如何分工",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "不同 AI 任务对质量、延迟、成本和合规要求不同。本文讨论如何设计多模型路由，让快模型、强模型和本地模型各司其职。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用工程化",
  "knowledgePoints": [
    "模型路由",
    "任务分级",
    "模型抽象"
  ],
  "scenarios": [
    "企业 AI 网关",
    "RAG 生成链路",
    "Agent 工具执行"
  ],
  "practiceChecklist": [
    "按任务风险、输入长度、输出结构和合规要求选择模型",
    "用 provider 抽象隔离不同模型 API 差异",
    "记录 routingReason、modelVersion、fallbackReason 和质量反馈"
  ],
  "sections": [
    {
      "title": "问题背景：一个模型不适合所有任务",
      "body": "AI 应用里既有低风险摘要、关键词提取、问题改写，也有合同风险判断、结构化报告和高风险工具调用。所有任务都用最强模型会成本高、延迟大；都用轻量模型又可能影响质量和安全。"
    },
    {
      "title": "任务分级：先定义任务风险",
      "body": "模型路由可以按任务风险、输入长度、输出结构、实时性、隐私要求和失败代价分级。问题改写、分类和候选摘要适合快模型；合同风险判断、复杂推理和导出报告适合强模型；敏感数据或专有环境可以选择本地模型或企业模型网关。"
    },
    {
      "title": "路由决策：规则和评测结合",
      "body": "早期可以用规则路由，例如 taskType、riskLevel、tenantPolicy 和 maxCost。成熟后可以结合评测数据，根据质量、延迟、成本和失败率自动调整。每次路由都应记录 routingReason，方便后续分析。"
    },
    {
      "title": "失败回退：fallback 不能改变业务边界",
      "body": "模型不可用或超时时可以 fallback 到备选模型，但要保证输出 schema、citation 要求和安全策略不降低。高风险任务如果无法使用合适模型，应该进入人工处理，而不是静默用低能力模型生成结论。"
    },
    {
      "title": "工程取舍：抽象 provider，但不要抹平差异",
      "body": "provider 抽象能隔离不同模型 API、鉴权和调用方式，但不能假装所有模型能力完全相同。系统需要记录模型能力、上下文长度、结构化输出稳定性、成本和安全限制，让路由有依据。"
    },
    {
      "title": "项目例子：Legal RAG 的模型分工",
      "body": "Legal RAG 可以用快模型做 query rewrite 和风险类型初筛，用强模型生成 riskItems 和审查报告，用企业模型网关处理敏感合同。每次报告记录 modelVersion 和 routingReason，方便复核和成本分析。"
    }
  ],
  "takeaways": [
    "多模型路由要按任务风险、质量、延迟、成本和合规要求分工。",
    "fallback 不能降低高风险任务的安全和引用要求。",
    "provider 抽象要保留模型能力差异，便于评测和治理。"
  ]
}

export default post
