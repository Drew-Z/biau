import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "frontend-ai-task-state-management",
  "title": "前端任务状态管理：AI 长任务的进度、取消与恢复",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 长任务不能只显示 loading。本文讨论前端如何基于后端状态枚举展示进度、失败原因、取消、重试、人工处理和刷新恢复。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "前端状态管理",
    "AI 长任务",
    "交互反馈"
  ],
  "scenarios": [
    "文档入库进度",
    "合同批量审查",
    "AI 生成任务工作台"
  ],
  "practiceChecklist": [
    "前端用稳定状态机展示 queued、running、review、completed、failed",
    "为取消、重试、继续处理和人工复核提供明确入口",
    "断线或刷新后能通过 jobId 恢复任务状态"
  ],
  "sections": [
    {
      "title": "问题背景：长任务不能只有 loading",
      "body": "AI 文档解析、OCR、embedding、批量审查和生成任务可能持续几十秒到几分钟。只显示 loading 会让用户不知道系统是否还在工作、卡在哪一步、能不能离开页面。前端需要把长任务设计成可恢复、可解释的状态流。"
    },
    {
      "title": "状态来源：和后端枚举保持一致",
      "body": "前端状态不应该随意自造。最好直接消费后端的 queued、running、retrying、waiting_review、completed、failed、cancelled 等状态，并根据 currentStep 展示 parsing、indexing、reviewing、exporting 等阶段。"
    },
    {
      "title": "进度表达：百分比之外还有阶段和数量",
      "body": "很多 AI 阶段无法准确计算百分比，但可以展示当前阶段、已处理文件数、失败数量、预计耗时、最近更新时间和下一步动作。对于批量任务，整体进度和单项状态要同时可见。"
    },
    {
      "title": "交互边界：取消和重试都要走后端状态",
      "body": "不是所有任务都能随时取消。前端需要区分 canCancel、canRetry、canResume 和 canReview。取消请求也应该走后端状态流，避免前端显示取消成功但 Worker 仍在继续写入。"
    },
    {
      "title": "失败体验：错误提示要能指导下一步",
      "body": "失败提示要告诉用户发生在哪个阶段、是否可重试、需要换文件还是联系管理员。比如 unsupported_file_type、permission_denied、model_timeout、citation_missing，对应的下一步完全不同。"
    },
    {
      "title": "恢复机制：刷新和断线后继续接上任务",
      "body": "AI 长任务不能依赖页面内存。前端提交任务后应该持有 jobId 或 batchId，刷新页面后重新查询状态；SSE 断线后可以回退到轮询；任务完成后保留结果入口和审计信息。"
    }
  ],
  "takeaways": [
    "AI 长任务前端要用状态机思维设计，而不是一个 loading。",
    "进度展示要包含阶段、数量、失败原因和下一步动作。",
    "刷新、断线、取消和重试都要通过后端任务状态恢复。"
  ]
}

export default post
