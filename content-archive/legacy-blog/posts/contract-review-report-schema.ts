import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "contract-review-report-schema",
  "title": "合同审查报告结构：Summary、RiskItems、Citations 与 Recommendations",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "合同审查报告不能只是一段总结。本文讨论如何把摘要、风险项、引用依据、修改建议、人工复核和导出信息组织成稳定 schema。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "Legal RAG",
  "knowledgePoints": [
    "审查报告",
    "结构化输出",
    "合同风险项"
  ],
  "scenarios": [
    "合同审查导出",
    "法律 RAG 报告",
    "人审工作台"
  ],
  "practiceChecklist": [
    "报告包含 scope、summary、riskItems、citations、recommendations 和 disclaimer",
    "每个风险项绑定风险等级、依据、建议和人工复核状态",
    "导出前做 schema 校验、引用校验和版本留痕"
  ],
  "sections": [
    {
      "title": "问题背景：报告是业务交付物",
      "body": "合同审查系统最终交付给用户的往往不是聊天记录，而是一份可阅读、可导出、可复核的审查报告。报告结构决定了用户能否快速理解风险、回到原文依据、采纳修改建议，并把结果交给人工继续处理。"
    },
    {
      "title": "顶层结构：先说明范围和结论",
      "body": "报告顶层可以包含 reportId、documentId、documentVersion、scope、generatedAt、model、promptVersion、summary、overallRiskLevel 和 disclaimer。scope 说明本次审查覆盖哪些合同和条款，summary 给出整体结论，disclaimer 说明 AI 辅助边界。"
    },
    {
      "title": "风险项：riskItems 是报告核心",
      "body": "riskItems 应该是结构化数组，每项包含 riskType、riskLevel、title、reason、impact、suggestion、citations、confidence、needsHumanReview 和 reviewerNote。这样前端可以筛选高风险，导出可以形成表格，人工复核也能逐项处理。"
    },
    {
      "title": "引用依据：citations 要能跳回原文",
      "body": "每个风险项都应该绑定 citations，包括 source、page、section、clauseNo、chunkId 和 quote。引用不是报告装饰，而是让用户确认结论是否真正来自合同原文。如果引用不足，报告应标记低置信度或进入人工复核。"
    },
    {
      "title": "工程取舍：自然语言和结构化输出结合",
      "body": "报告需要可读性，也需要可校验性。可以让模型生成 summary 和建议文本，但服务端必须校验 riskItems schema、citation 是否来自上下文、枚举值是否合规。高风险场景宁可报告进入待复核，也不要强行导出不完整结构。"
    },
    {
      "title": "项目例子：Legal RAG 报告导出",
      "body": "Legal RAG 可以先实现 Markdown 或 HTML 报告，再扩展 PDF/DOCX。报告包含整体风险摘要、风险项列表、原文引用、修改建议和复核状态。导出文件同时记录 reportVersion 和 documentVersion，方便后续追溯。"
    }
  ],
  "takeaways": [
    "合同审查报告要同时服务阅读、引用复核、人工处理和导出。",
    "riskItems、citations 和 recommendations 应该结构化。",
    "导出前必须做 schema 校验、引用校验和版本留痕。"
  ]
}

export default post
