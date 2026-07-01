import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "worker-observability",
  "title": "Worker 可观测性：队列积压、失败率与死信任务",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI Worker 承接解析、Embedding、审查、导出和生成任务。本文讨论如何用队列指标、trace、死信任务和告警动作判断后台是否健康。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Worker 监控",
    "队列指标",
    "死信任务"
  ],
  "scenarios": [
    "批量文档入库",
    "OCR 与 embedding",
    "AI 生成任务处理"
  ],
  "practiceChecklist": [
    "监控 waiting、active、failed、delayed、retry 和 dead-letter 数量",
    "按 jobType 统计成功率、P95 耗时、重试次数和成本",
    "为队列积压、失败率上升和死信增长设置告警"
  ],
  "sections": [
    {
      "title": "问题背景：Worker 是 AI 应用的后台心跳",
      "body": "文档解析、OCR、embedding、批量审查、报告导出和生成任务通常都在 Worker 里跑。页面能打开不代表系统健康，如果队列堆积、失败率升高或 Worker 卡死，用户看到的就是任务一直转圈。"
    },
    {
      "title": "基础指标：先看队列是否堵住",
      "body": "最基础的指标包括 waiting、active、completed、failed、delayed、retry、dead-letter、oldestJobAge 和 throughput。waiting 持续升高说明处理能力不足；failed 增长说明任务质量或依赖异常；oldestJobAge 能反映用户最长等待时间。"
    },
    {
      "title": "任务拆分：按 jobType 观察耗时和风险",
      "body": "不同 jobType 的耗时和风险不一样。OCR、embedding、rerank、review、export、generate 不应该混在一个平均值里看。更实用的是按 jobType 统计成功率、P50/P95/P99 耗时、平均重试次数、token 成本和错误分布。"
    },
    {
      "title": "Trace 串联：从前端任务追到 Worker 日志",
      "body": "每个 job 应该带 traceId、jobId、batchId、tenantId、documentId、step、attempt、workerId、startedAt、finishedAt 和 errorType。这样从前端任务详情、API 日志到 Worker 日志可以串成一条链路。"
    },
    {
      "title": "死信处理：dead-letter 不是垃圾桶",
      "body": "超过最大重试次数的任务应该进入 dead-letter，并保留输入摘要、错误原因、最后一次异常、可否人工重跑。死信任务需要运营入口处理，不能只是躺在后台表里无人看。"
    },
    {
      "title": "告警闭环：每条告警都要有动作",
      "body": "队列积压、失败率上升、模型限流、OCR 超时和死信增长都要触发告警。告警里要包含影响范围、相关 jobType、建议动作和 Runbook 链接，否则只是把焦虑推给值班人。"
    }
  ],
  "takeaways": [
    "AI Worker 可观测性要覆盖队列状态、任务类型、耗时、失败、重试和死信。",
    "每个 job 都要带 traceId，才能把前端、API 和 Worker 串起来。",
    "告警必须指向可执行的处理动作和 Runbook。"
  ]
}

export default post
