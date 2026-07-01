import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "rag-batch-jobs-priority",
  "title": "RAG 批量任务设计：Batch、Job、Step 与优先级",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "多文档入库和批量合同审查需要任务化处理。本文讨论 Batch、Job、Step 三层结构、并发限制、失败恢复和成本控制。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "批量任务",
    "任务优先级",
    "队列调度"
  ],
  "scenarios": [
    "多文档知识库入库",
    "批量合同审查",
    "后台任务进度"
  ],
  "practiceChecklist": [
    "把批量任务拆成 batch、job、step 三层",
    "设置并发、优先级、重试和失败汇总",
    "前端展示整体进度和单个文档状态"
  ],
  "sections": [
    {
      "title": "问题背景：批量任务不是循环调用接口",
      "body": "多文档入库和批量合同审查不能简单在前端循环发请求。这样容易超时、丢状态、难重试，也无法统一展示进度。更稳的做法是创建 batch，后端拆成多个 job，再由 Worker 分阶段执行。"
    },
    {
      "title": "任务模型：Batch、Job、Step 三层结构",
      "body": "Batch 表示一次批量操作，例如上传 50 份合同；Job 表示单个文档或单个审查任务；Step 表示 parsing、chunking、embedding、reviewing、exporting 等阶段。三层结构能同时展示整体进度和单项失败原因。"
    },
    {
      "title": "调度策略：优先级和并发限制",
      "body": "批量任务会占用模型、数据库、OCR 和队列资源。系统需要控制并发数量、租户配额和任务优先级。例如小任务和交互式问答优先，后台批量入库低优先级执行，避免批量任务拖慢前台体验。"
    },
    {
      "title": "工程取舍：支持部分成功和失败恢复",
      "body": "批量任务经常部分成功。系统不应该因为一个文件失败就丢掉全部结果，而是记录每个 job 的状态、错误类型和是否可重试。用户可以只重试失败项，或者导出成功项和失败报告。"
    },
    {
      "title": "前端体验：进度展示要可解释",
      "body": "前端不只展示百分比，还要显示当前阶段、已完成数量、失败数量、预计耗时和失败原因。对于文档入库，可以展示 uploaded、scanning、parsing、indexing、ready；对于审查，可以展示 queued、reviewing、needs_review、completed。"
    },
    {
      "title": "运营边界：批量任务必须有成本和限流",
      "body": "批量任务最容易放大成本。系统要记录每个 batch 的 token、模型调用次数、OCR 页数、重试次数和导出次数。必要时设置每日额度、租户限流和人工确认，避免一次批量操作耗尽资源。"
    }
  ],
  "takeaways": [
    "RAG 批量任务要拆成 batch、job、step，而不是前端循环请求。",
    "优先级、并发限制和部分失败恢复决定批量任务是否可运营。",
    "批量任务必须展示进度、错误和成本指标。"
  ]
}

export default post
