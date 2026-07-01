import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-data-retention-policy",
  "title": "AI 应用数据留存策略：原文、Chunk、Prompt 与日志",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "AI 应用会产生大量原文、派生数据和调试日志。本文讨论按数据类型分级、设置留存周期、删除派生数据和审计生命周期。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "数据留存",
    "隐私合规",
    "生命周期管理"
  ],
  "scenarios": [
    "企业知识库运营",
    "合同审查归档",
    "AI 调试与评测"
  ],
  "practiceChecklist": [
    "按数据类型定义留存周期和删除策略",
    "敏感 prompt、原文和日志默认最小化保存",
    "删除文档时同步处理 chunk、embedding、缓存和导出物"
  ],
  "sections": [
    {
      "title": "问题背景：不是所有数据都应该永久保存",
      "body": "AI 应用会产生大量中间数据：原始文件、解析文本、chunk、embedding、prompt、上下文、模型输出、trace、日志、报告和反馈。如果全部永久保存，成本、隐私和合规风险都会上升。留存策略就是明确哪些数据必须保留，哪些可以短期保存，哪些应该尽快删除。"
    },
    {
      "title": "分级管理：按数据类型定义风险",
      "body": "原始文件和解析文本通常最敏感，应该有明确 owner、权限和删除机制；chunk 和 embedding 属于派生数据，需要跟随文档版本和权限；prompt、上下文和输出可能包含敏感片段，调试价值高但风险也高；系统日志应该尽量避免保存完整原文。"
    },
    {
      "title": "留存周期：不同场景使用不同规则",
      "body": "临时问答可以只保存短期会话和统计信息；合同审查报告可能需要按业务要求长期归档；评测样例和人审反馈可以脱敏后长期保存；失败 trace 可以保留较短周期，用于排障后清理。不同场景不能套同一个周期。"
    },
    {
      "title": "删除流程：同步处理派生数据",
      "body": "用户删除文档时，不能只删除 Document 表记录。还要删除或失效原始文件、解析文本、chunk、embedding、检索缓存、报告引用、导出链接和会话上下文。否则用户以为删除了，模型仍可能通过派生数据召回内容。"
    },
    {
      "title": "日志策略：兼顾排障和隐私",
      "body": "调试时很想记录完整 prompt 和 retrievedChunks，但这可能暴露合同、个人信息或商业秘密。更稳的做法是默认记录 traceId、stage、model、token、latency、errorType 和 hash，只有受控调试模式才短期保存脱敏片段。"
    },
    {
      "title": "审计要求：留存策略要可配置可证明",
      "body": "企业场景可以按 tenant、workspace、documentType 或 sensitivity 设置留存策略。每次删除、归档、导出和脱敏都应写入审计日志，方便证明系统确实按规则处理了数据生命周期。"
    }
  ],
  "takeaways": [
    "AI 应用数据留存要按原文、派生数据、prompt、输出、日志和报告分级管理。",
    "删除文档必须同步处理 chunk、embedding、缓存、引用和导出物。",
    "日志策略要在排障价值和隐私风险之间取得平衡。"
  ]
}

export default post
