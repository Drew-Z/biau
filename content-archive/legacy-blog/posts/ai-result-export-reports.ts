import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-result-export-reports",
  "title": "AI 结果导出：从结构化报告到 Markdown、PDF 与 DOCX",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 审查结果进入业务流程时，需要稳定导出为可阅读、可归档、可编辑的材料。本文讨论报告模型、格式选择和版本记录。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "报告导出",
    "合同审查报告",
    "引用附件"
  ],
  "scenarios": [
    "合同审查报告",
    "RAG 问答记录",
    "AI 复核材料归档"
  ],
  "practiceChecklist": [
    "先定义结构化报告模型，再渲染不同格式",
    "导出内容包含风险、建议、引用和生成版本",
    "PDF/DOCX 导出任务异步执行并保留下载记录"
  ],
  "sections": [
    {
      "title": "问题背景：导出不是把页面截图保存",
      "body": "AI 审查结果如果要进入业务流程，通常需要导出成 Markdown、PDF 或 DOCX。导出不应该依赖页面截图，而应该基于结构化报告模型渲染。这样才能保证格式稳定、可复用、可审计。"
    },
    {
      "title": "数据模型：先设计报告结构",
      "body": "合同审查报告可以包含 summary、riskItems、recommendations、citations、reviewerNotes、generatedAt、model、promptVersion 和 documentVersion。前端展示和导出都使用同一份结构，避免页面一套、导出一套。"
    },
    {
      "title": "Markdown：适合内部流转和版本管理",
      "body": "Markdown 容易生成、易读、便于版本管理，适合内部预览、开发调试和知识库沉淀。它可以保留标题、表格、引用链接和风险列表，但正式交付时通常还需要 PDF 或 DOCX。"
    },
    {
      "title": "PDF：适合固定版式归档",
      "body": "PDF 适合正式归档和对外发送，版式固定、不易被改。导出 PDF 时要注意分页、表格换行、中文字体、引用脚注和附件链接。生成过程可能耗时，应放入异步任务。"
    },
    {
      "title": "DOCX：适合继续编辑和协作修改",
      "body": "合同审查建议往往需要律师、业务或客户继续修改，因此 DOCX 很有价值。DOCX 导出可以保留标题、编号、表格和批注式建议。需要注意模板管理、样式一致性和引用原文的呈现方式。"
    },
    {
      "title": "审计边界：导出也要带版本和权限",
      "body": "导出报告应记录生成时间、模型版本、promptVersion、documentVersion、审核状态和导出人。下载链接要有权限控制和过期时间。原始引用如果用户无权限查看，导出报告也不能绕过权限。"
    }
  ],
  "takeaways": [
    "AI 结果导出应基于结构化报告模型，而不是页面截图。",
    "Markdown、PDF、DOCX 适合不同流转场景。",
    "导出报告要保留引用、版本、权限和下载记录。"
  ]
}

export default post
