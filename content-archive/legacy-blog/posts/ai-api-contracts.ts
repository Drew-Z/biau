import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-api-contracts",
  "title": "AI 应用 API 契约：流式响应、任务状态与错误语义",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI API 不应该只返回 answer 字符串。本文讨论同步、SSE、异步 job、任务状态、错误码、取消、重试和幂等语义。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "API 契约",
    "任务状态",
    "重试语义"
  ],
  "scenarios": [
    "RAG 问答接口",
    "AI 长任务提交",
    "合同审查报告生成"
  ],
  "practiceChecklist": [
    "区分同步响应、SSE 流式响应和异步 job API",
    "为任务状态、错误码、取消和重试定义稳定枚举",
    "写操作使用 idempotencyKey 避免重复提交"
  ],
  "sections": [
    {
      "title": "AI API 不能只返回一段文本",
      "body": "AI 应用通常包含检索、生成、引用、任务状态、成本、错误和人工处理。接口如果只返回 answer 字符串，前端很难展示进度、引用、失败原因和重试入口。API 契约要把“模型输出”变成可消费的业务结果。"
    },
    {
      "title": "同步、流式和异步要分清",
      "body": "短问答可以使用同步接口；需要逐字输出和中间事件时适合 SSE；文档解析、批量审查、报告导出和长时间生成应该使用异步 job API。不要让前端长时间挂一个普通 HTTP 请求等待 OCR、embedding 或批量模型调用。"
    },
    {
      "title": "任务状态要稳定",
      "body": "异步任务可以定义 queued、running、waiting_review、retrying、completed、failed、cancelled、expired 等状态，并返回 progress、currentStep、errorType、retryable、createdAt、updatedAt。状态枚举要稳定，前端才能写出可靠的进度和错误展示。"
    },
    {
      "title": "流式响应要有事件类型",
      "body": "SSE 不应该只推 token。可以定义 message_start、retrieval_done、delta、citation、tool_call、warning、message_end、error 等事件。这样前端能在生成过程中展示检索完成、引用到达、工具调用和最终完成状态。"
    },
    {
      "title": "重试和幂等语义",
      "body": "AI 写操作和任务提交必须考虑重复点击、网络超时和前端重试。创建审查任务、导出报告、提交发布动作时应该支持 idempotencyKey，同一个键重复请求返回同一任务，而不是创建多份重复任务。"
    },
    {
      "title": "错误码要可行动",
      "body": "错误响应要同时服务用户和开发者。用户需要知道能否重试、是否需要补权限或换文件；开发者需要 traceId、stage、errorType 和 detailCode。好的 API 契约能让前端不靠字符串判断错误。"
    }
  ],
  "takeaways": [
    "AI API 契约要覆盖 answer、citation、状态、错误、成本和人工处理，不只是文本返回。",
    "同步、SSE 流式和异步 job API 适合不同耗时和交互场景。",
    "任务提交要有幂等键，错误码要能指导前端展示和后端排查。"
  ]
}

export default post
