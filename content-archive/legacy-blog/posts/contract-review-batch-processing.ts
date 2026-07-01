import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "contract-review-batch-processing",
  "title": "合同审查批量处理：多份合同、批量风险项与报告合并",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "合同审查进入团队使用后，问题会从单份合同扩展到批量任务。本文讨论 batch、job、riskItems、部分失败和报告合并如何设计。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "Legal RAG",
  "knowledgePoints": [
    "批量任务",
    "合同审查",
    "报告合并"
  ],
  "scenarios": [
    "批量合同审查",
    "法务审查工作台",
    "异步报告生成"
  ],
  "practiceChecklist": [
    "用 batchId 管理一批合同，用 jobId 管理单份合同处理过程",
    "风险项按 documentId、riskType、riskLevel 和 status 汇总",
    "批量报告要展示成功、失败、待复核和部分完成状态"
  ],
  "sections": [
    {
      "title": "问题背景：单份审查不等于团队交付",
      "body": "单份合同审查可以通过上传、检索、生成报告完成闭环，但真实业务经常一次处理多份合同、同一客户的一组协议、多个版本或同类模板。批量处理要求系统能排队、并发、失败恢复、进度展示和统一导出。"
    },
    {
      "title": "任务模型：batch 和 job 分层",
      "body": "批量任务可以拆成 Batch 和 Job。Batch 表示一次用户提交，记录 batchId、owner、scope、status、totalCount、successCount、failedCount 和 createdAt；Job 表示单份合同处理，记录 documentId、step、progress、errorCode、retryCount 和 reportId。分层后前端能展示整体进度，也能定位单份失败。"
    },
    {
      "title": "风险项汇总：不要只拼接报告",
      "body": "批量报告不是把多份报告简单拼在一起，而是要按风险类型、等级、合同来源、责任部门和处理状态汇总。riskItems 需要保留 documentId、clauseNo、citations、confidence 和 needsHumanReview，方便法务先处理高风险和低置信度项目。"
    },
    {
      "title": "失败处理：允许部分完成",
      "body": "批量任务中总会出现解析失败、OCR 超时、模型限流、引用不足或导出失败。系统应该允许部分完成，把失败 job 标记为 retryable 或 blocked，并给出可操作原因。用户不应该因为一份合同失败而丢掉整批结果。"
    },
    {
      "title": "工程取舍：并发、成本和稳定性要平衡",
      "body": "批量处理不能无限并发，否则会压垮模型、OCR、向量库和导出服务。更稳妥的方式是用队列控制并发，按租户设置速率限制，高成本任务进入审批或低峰执行，并记录每个 batch 的 token、耗时和失败率。"
    },
    {
      "title": "项目例子：Legal RAG 的批量审查入口",
      "body": "Legal RAG 可以支持上传合同包，系统为每份合同建立 job，生成独立风险报告后再汇总为批量风险清单。前端展示总进度、高风险数量、失败合同和待复核项，导出时提供汇总报告和单份报告索引。"
    }
  ],
  "takeaways": [
    "批量合同审查要用 batch/job 分层管理进度和失败。",
    "批量报告应按风险维度汇总，而不是简单拼接文本。",
    "部分失败、重试和成本控制是批量任务生产化的关键。"
  ]
}

export default post
