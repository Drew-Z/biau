import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-error-handling-retry-human",
  "title": "AI 应用错误处理：可重试错误、不可重试错误和人工接管",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "AI 应用的失败可能来自文件、检索、模型、工具和权限。本文讨论如何分类错误，并在重试、降级与人工接管之间做工程决策。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "错误分类",
    "重试策略",
    "人工接管"
  ],
  "scenarios": [
    "RAG 文档入库",
    "合同审查生成",
    "Agent 工具调用失败"
  ],
  "practiceChecklist": [
    "错误先分类，再决定是否重试",
    "重试要有次数、退避和成本上限",
    "不可自动处理的错误进入人工复核或可解释失败状态"
  ],
  "sections": [
    {
      "title": "问题背景：failed 不能解释复杂链路",
      "body": "AI 应用会在很多阶段失败：上传、解析、OCR、embedding、检索、rerank、模型生成、结构化校验、工具调用和人工审核。如果所有错误都只显示 failed，用户不知道怎么处理，开发也很难定位问题。"
    },
    {
      "title": "错误分类：先判断是否可重试",
      "body": "网络超时、临时限流、供应商 5xx、队列 worker 临时失败通常可以重试；文件格式不支持、权限不足、参数非法、租户越权、schema 长期不合法通常不应该盲目重试。错误类型决定下一步动作。"
    },
    {
      "title": "重试策略：次数、退避和成本上限",
      "body": "AI 调用和 OCR 解析都有成本，不能无限重试。系统应该设置 maxAttempts、backoff、timeout 和 dead-letter 状态。多次失败后，要把错误原因、任务输入和建议动作展示给用户或审核人员。"
    },
    {
      "title": "结构化输出：修复失败要转人工",
      "body": "模型返回 JSON 不合法、字段缺失、枚举错误或 citation 为空时，可以把校验错误反馈给修复 prompt 重试一次。仍然失败时，不应该硬解析，而是进入人工复核或返回格式化失败说明。"
    },
    {
      "title": "人工接管：一种正式业务状态",
      "body": "人工接管可以是一种正式状态，比如 needs_human_review、manual_fix_required、blocked_by_permission。人工处理结果要写回系统，形成修复记录、审核决策和后续评估样例。"
    },
    {
      "title": "可观测性：错误日志要能串起全链路",
      "body": "每个错误都应该带 traceId、jobId、stage、errorType、retryable、attempt、model、promptVersion 和 resourceId。这样前端能展示具体阶段，后端能统计错误分布，后续也能优化 parser、prompt 或模型供应商。"
    }
  ],
  "takeaways": [
    "AI 应用错误要分阶段、分类别处理，不能只有 failed。",
    "可重试错误要有上限和退避，不可重试错误要给出明确处理路径。",
    "人工接管是高风险 AI 系统的重要状态，不是临时备注。"
  ]
}

export default post
