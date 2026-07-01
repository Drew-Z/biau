import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "sse-streaming-ai-progress",
  "title": "SSE 流式交互：AI 应用如何把生成过程交给用户",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 问答、合同审查和生成管线都不是瞬时完成的请求。本文讨论如何用 SSE 推送文本流、阶段进度和最终状态，让长任务可感知、可恢复。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "SSE",
    "流式响应",
    "任务进度推送"
  ],
  "scenarios": [
    "AI 打字机输出",
    "RAG 问答生成中状态",
    "文档解析和审查进度"
  ],
  "practiceChecklist": [
    "单向服务端推送优先考虑 SSE",
    "长任务采用 jobId + 状态落库 + 事件流",
    "为心跳、断线重连、失败事件和最终结果设计清晰协议"
  ],
  "sections": [
    {
      "title": "概念：流式交互解决等待感",
      "body": "AI 应用最常见的体验问题不是结果错误，而是用户不知道系统是否还在工作。大模型生成、文档解析、embedding、合同审查和素材生成都可能持续数秒到数分钟。SSE 的价值是把过程拆成可见事件，让用户看到部分文本、阶段进度、警告和最终状态。"
    },
    {
      "title": "流程：请求创建任务，事件展示过程",
      "body": "更稳的流程不是让一个 HTTP 请求一直等到结束，而是先由 API 创建 job 并返回 jobId；Worker 异步执行解析、检索、生成或审查；服务端通过 SSE 推送 started、progress、partial、warning、completed、failed 等事件；前端根据事件更新 UI，同时保留状态查询接口兜底。"
    },
    {
      "title": "工程取舍：SSE 与 WebSocket 怎么选",
      "body": "SSE 适合服务端向浏览器单向推送事件，浏览器原生支持 EventSource，协议简单，也适合 AI 打字机输出和任务进度。WebSocket 更适合双向实时通信，例如多人协作、实时编辑、游戏或复杂控制指令。多数 AI 问答和进度展示并不需要双向通道，SSE 通常更轻。"
    },
    {
      "title": "协议设计：事件要能被前端稳定消费",
      "body": "每个事件最好包含 jobId、stage、message、payload、timestamp 和可选 errorCode。partial 事件负责增量文本，progress 事件负责阶段进度，warning 事件提示低置信度或可恢复问题，completed 和 failed 负责结束态。事件命名稳定后，前端、日志和测试都能围绕同一套协议工作。"
    },
    {
      "title": "项目例子：合同审查的进度展示",
      "body": "在 legal-rag 中，合同审查可以依次推送 uploaded、parsing、chunking、embedding、retrieving、reviewing、completed。用户看到的不再是一个转圈按钮，而是清楚知道系统正在解析文档、建立索引还是生成风险项。即使连接断开，前端也能通过 jobId 查询任务最终状态。"
    },
    {
      "title": "可靠性：事件流不能代替持久化状态",
      "body": "SSE 连接可能断开，浏览器可能刷新，网络也可能抖动。因此最终状态必须落库，SSE 只是展示过程的通道。前端重连后可以查询 job 当前状态，必要时恢复最近事件；后端也要发送心跳，避免中间代理误判连接空闲。"
    }
  ],
  "takeaways": [
    "SSE 适合 AI 文本流和单向任务进度推送，能显著改善长等待体验。",
    "长任务要用 jobId、状态落库和事件流组合设计，而不是绑死单个请求。",
    "最终结果以服务端任务状态为准，事件流只负责让过程可见。"
  ]
}

export default post
