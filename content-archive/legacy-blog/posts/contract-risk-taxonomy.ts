import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "contract-risk-taxonomy",
  "title": "合同审查风险分类：付款、违约、期限、保密与管辖如何建模",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "合同审查不能只输出泛泛风险提示。本文讨论如何把付款、违约、期限、保密、知识产权和争议解决等风险建成可检索、可评估、可复核的分类体系。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "Legal RAG",
  "knowledgePoints": [
    "合同风险分类",
    "结构化审查",
    "人工复核"
  ],
  "scenarios": [
    "合同审查报告",
    "法律 RAG 风险识别",
    "企业法务知识库"
  ],
  "practiceChecklist": [
    "先定义风险类型、风险等级、判断依据和修改建议字段",
    "每个风险项必须绑定 citation 和人工复核状态",
    "用真实合同样例持续补充风险分类和边界案例"
  ],
  "sections": [
    {
      "title": "问题背景：风险提示需要可分类",
      "body": "合同审查如果只输出“存在一定风险”，用户很难判断风险来自哪里、是否严重、下一步该怎么改。风险分类的目标，是把分散在合同各处的条款问题整理成稳定结构，让系统能检索依据、生成报告，也方便人工复核和后续统计。"
    },
    {
      "title": "分类维度：从业务风险开始建模",
      "body": "常见分类可以包括付款与结算、交付与验收、违约责任、责任上限、保密义务、知识产权、合同期限、解除条件、争议解决和管辖条款。分类不是为了贴标签，而是为了让每类风险有明确判断标准、证据来源和修改建议。"
    },
    {
      "title": "结构设计：风险项不是自然语言段落",
      "body": "一个可落地的 riskItem 至少包含 riskType、riskLevel、summary、reason、suggestion、citations、confidence 和 needsHumanReview。高风险场景还可以增加 affectedClause、missingClause、recommendedWording 和 reviewerNote。结构化后，报告导出、筛选统计和人工复核才有数据基础。"
    },
    {
      "title": "检索策略：不同风险需要不同证据",
      "body": "付款风险需要关注金额、账期、发票和付款条件；违约风险需要关注赔偿责任、违约金和解除条件；保密风险需要关注范围、期限和例外；管辖风险需要关注法院、仲裁机构和适用法律。风险分类会反过来影响 query rewrite、metadata filter 和 rerank 策略。"
    },
    {
      "title": "工程取舍：分类不能替代法律判断",
      "body": "风险分类能提升系统一致性，但不能把模型输出当成最终结论。合同条款常有上下文、行业惯例和双方谈判背景。系统应该输出辅助审查结果，并为高风险、低置信度或引用不足的结论保留人工复核入口。"
    },
    {
      "title": "项目例子：Legal RAG 的风险报告",
      "body": "Legal RAG 可以先覆盖付款期限、违约责任、责任上限、知识产权归属和争议解决五类风险。每类风险准备标准问题、标准引用和预期输出字段，用来评估系统是否能召回正确条款、生成结构化风险项，并把结论回到原文证据。"
    }
  ],
  "takeaways": [
    "合同审查风险要建成稳定分类和结构化 riskItem。",
    "每个风险结论都应绑定 citation、置信度和人工复核状态。",
    "风险分类会影响检索、rerank、报告导出和评测集设计。"
  ]
}

export default post
