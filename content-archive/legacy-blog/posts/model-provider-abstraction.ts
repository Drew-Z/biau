import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "model-provider-abstraction",
  "title": "模型供应商抽象：让生成、Embedding 与 Rerank 可切换",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "AI 应用不应该把业务逻辑绑死在单一 SDK 上。本文讨论 provider 抽象、OpenAI-compatible 接口、本地模型和模型切换评估。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Provider 抽象",
    "模型切换",
    "OpenAI-compatible"
  ],
  "scenarios": [
    "RAG 模型替换",
    "本地演示无 key",
    "多供应商降级"
  ],
  "practiceChecklist": [
    "按能力拆 generate、embed、rerank、moderate 接口",
    "把模型名、baseURL、key 和超时放进服务端配置",
    "为每个 provider 记录成本、延迟、失败率和输出质量"
  ],
  "sections": [
    {
      "title": "问题背景：业务逻辑不能绑定单一模型 SDK",
      "body": "AI 应用不能把业务逻辑绑死在某一个模型 SDK 上。生成、Embedding、Rerank、安全审核可能来自不同供应商，也可能从云端模型切到本地模型。Provider 抽象能让上层业务依赖统一接口，底层再根据配置选择具体模型。"
    },
    {
      "title": "接口设计：按能力拆 provider",
      "body": "不要只抽象一个 chat 方法。更清楚的方式是拆成 generate、streamGenerate、embed、rerank、moderate、structuredOutput 等能力。RAG 问答主要用 generate 和 embed，检索精排用 rerank，内容安全用 moderate。不同能力可以接不同供应商。"
    },
    {
      "title": "兼容接口：OpenAI-compatible 降低接入成本",
      "body": "很多模型服务提供 OpenAI-compatible API，这意味着可以用相近的请求格式切换 baseURL 和 model。它降低接入成本，但不代表完全兼容。结构化输出、流式协议、错误码、token 计费和工具调用细节仍然需要适配。"
    },
    {
      "title": "部署取舍：本地模型和云端模型各有边界",
      "body": "云端模型通常效果好、维护成本低，但有成本、网络和数据合规问题；本地模型可控性强，适合私有化和敏感数据场景，但部署、显存、吞吐和效果都要评估。抽象 provider 后，可以在不同场景下选择不同模型。"
    },
    {
      "title": "质量控制：切换模型要结合评测",
      "body": "模型切换不能只看接口能不能调用成功。每次切换 embedding、生成模型或 reranker，都要用 golden set 验证召回、引用、结构化输出和成本。否则模型换了，系统看起来能跑，质量却可能下降。"
    },
    {
      "title": "观测审计：记录 provider、模型和成本",
      "body": "模型配置应该放在服务端环境变量或配置中心，包括 provider、baseURL、model、timeout、maxTokens 和价格信息。每次请求记录 provider、model、promptVersion、token 和延迟，方便成本统计、问题回溯和降级切换。"
    }
  ],
  "takeaways": [
    "模型供应商抽象能让业务逻辑不绑定单一 SDK。",
    "生成、Embedding、Rerank、安全审核应按能力拆开。",
    "模型切换必须结合评测、成本和日志，而不是只看接口兼容。"
  ]
}

export default post
