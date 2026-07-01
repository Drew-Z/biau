import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "legal-rag-disclaimer-human-review",
  "title": "法律 RAG 责任边界：AI 辅助、人工复核与免责声明",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "法律场景需要清晰说明 AI 输出的辅助定位。本文讨论免责声明、人工复核、低置信度提示、引用依据和报告边界如何共同降低误用风险。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "Legal RAG",
  "knowledgePoints": [
    "责任边界",
    "人工复核",
    "法律科技产品"
  ],
  "scenarios": [
    "合同审查报告",
    "法律智能助手",
    "企业法务工作台"
  ],
  "practiceChecklist": [
    "在产品入口、结果页和导出报告中说明 AI 辅助定位",
    "高风险、低置信度和引用不足结果必须进入人工复核",
    "保留 citation、reviewer、version 和 audit log 便于追溯"
  ],
  "sections": [
    {
      "title": "问题背景：法律场景不能模糊责任",
      "body": "合同审查、法律问答和制度解读都属于高风险文本场景。AI 可以提升检索、摘要和初筛效率，但如果没有明确边界，用户可能把辅助结果当成最终法律意见。责任边界设计的目标，是让系统能力、证据来源和人工复核关系清楚可见。"
    },
    {
      "title": "定位说明：AI 是辅助工具，不是最终判断",
      "body": "产品入口、结果页面和导出报告都应说明 AI 输出基于当前资料和检索结果生成，仅用于辅助审查。对于需要法律判断、谈判策略或对外承诺的结论，应由具备权限的人进行确认。说明要清晰具体，不要藏在难以发现的位置。"
    },
    {
      "title": "复核机制：把高风险结果交给人",
      "body": "高风险、低置信度、引用不足、涉及重大金额或关键权利义务的结果，应进入人工复核。复核记录应包含 reviewer、decision、note、reviewedAt 和 resultVersion。这样既能降低误用风险，也能为后续质量改进提供数据。"
    },
    {
      "title": "输出约束：没有依据就不要强答",
      "body": "法律 RAG 应要求模型只基于检索上下文回答。没有足够依据时，系统应该明确说明无法从当前资料确认，而不是生成看似完整的结论。每个关键风险项都应绑定 citation，报告中也要保留引用来源和原文摘录。"
    },
    {
      "title": "工程取舍：提示语不能替代系统设计",
      "body": "免责声明很重要，但不能替代权限、引用、评测和人审。真正可靠的边界来自多层设计：检索前权限过滤、生成时引用约束、输出后结构校验、高风险人工复核、导出报告留痕和审计日志。"
    },
    {
      "title": "项目例子：合同审查报告的边界字段",
      "body": "Legal RAG 的报告可以包含 disclaimer、scope、riskItems、citations、confidence、needsHumanReview、reviewerNote 和 generatedAt。用户能看到系统审查范围、风险依据和哪些结论需要人工确认，避免把模型输出误认为最终法律意见。"
    }
  ],
  "takeaways": [
    "法律 RAG 要明确 AI 辅助定位和人工复核边界。",
    "免责声明必须和 citation、低置信度提示、人审和审计一起设计。",
    "没有依据时明确无法确认，比生成完整但不可核验的结论更安全。"
  ]
}

export default post
