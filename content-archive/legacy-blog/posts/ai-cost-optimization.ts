import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-cost-optimization",
  "title": "AI 成本优化：Token 预算、缓存和模型分级",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "AI 应用进入真实使用后，成本会来自 token、检索、rerank、重试和生成任务。本文整理如何用预算、缓存和模型分级控制成本。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Token 成本",
    "缓存复用",
    "模型分级"
  ],
  "scenarios": [
    "RAG 问答",
    "合同批量审查",
    "AI 生成管线"
  ],
  "practiceChecklist": [
    "记录每次请求的 token、latency、model 和 cost",
    "缓存 embedding、检索结果、稳定摘要和报告中间结果",
    "简单任务用小模型，复杂审查或最终报告再升级模型"
  ],
  "sections": [
    {
      "title": "概念：成本不是上线之后才出现的问题",
      "body": "AI 应用 Demo 阶段调用量少，成本通常不明显；一旦进入批量文档、多人使用或生成管线，token、检索、rerank、图片生成和失败重试都会叠加。成本优化不是最后上线才做，而是要在架构阶段就保留统计、预算和降级入口。"
    },
    {
      "title": "流程：先观测，再优化",
      "body": "成本控制的第一步是记录。每次请求至少要记录 traceId、model、promptVersion、inputTokens、outputTokens、latency、cost、retrievedChunks 和 errorType。没有这些数据，只能凭感觉优化。记录之后再看哪些链路最贵：是上下文太长、重试太多、模型选型过高，还是批量任务没有缓存。"
    },
    {
      "title": "Token 预算：控制上下文和输出长度",
      "body": "RAG 系统里，用户问题、历史消息、检索上下文、系统提示词和输出答案都会消耗 token。上下文越长，成本越高，响应也越慢。工程上可以为历史消息、检索片段和最终回答分别设置预算，控制 TopK，裁剪低相关上下文，并为不同任务设置最大输出长度。"
    },
    {
      "title": "缓存：复用稳定中间结果",
      "body": "很多请求具有重复性，比如同一文档的 embedding、相似问题的检索结果、固定模板的系统提示、稳定的摘要、风险规则结果和报告草稿。这些内容可以缓存或持久化，避免每次重新调用模型。缓存不仅省钱，也能提升响应速度和结果稳定性。"
    },
    {
      "title": "模型分级：不是所有任务都用最强模型",
      "body": "分类、意图识别、问题改写、简单摘要可以使用更便宜或更快的模型；复杂推理、合同风险解释和最终报告再使用能力更强的模型。通过模型分级，可以让系统在质量和成本之间做细粒度平衡，也能在供应商故障或超预算时快速降级。"
    },
    {
      "title": "项目例子：合同批量审查怎么控成本",
      "body": "合同批量审查可以把成本拆成入库成本和审查成本。入库成本包括解析、chunk、embedding 和索引；审查成本包括检索、rerank、上下文 token、生成 token 和报告导出。系统可以缓存文档 embedding，批量任务使用队列限流，简单风险分类先用小模型，复杂条款解释再升级模型，并把人工复核率作为质量指标一起观察。"
    }
  ],
  "takeaways": [
    "AI 成本优化要先有观测数据，再做 token 预算、缓存和模型分级。",
    "RAG 的上下文长度、TopK 和重试次数会直接影响成本。",
    "成本指标必须和引用命中率、人工复核率等质量指标一起看。"
  ]
}

export default post
