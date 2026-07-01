import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "legal-rag-golden-set-evaluation",
  "title": "合同审查 Golden Set：让 RAG 质量从演示走向可评估",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "合同审查不能只靠临场演示判断效果。本文讨论如何设计标准问题、标准引用、风险标签和人工复核样例，让 RAG 优化有回归基准。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Golden Set",
    "合同审查评测",
    "回归测试"
  ],
  "scenarios": [
    "RAG 效果验收",
    "合同审查质量评估",
    "检索策略回归"
  ],
  "practiceChecklist": [
    "准备覆盖事实问答、引用定位和风险审查的样例",
    "每条样例标注 expectedAnswer、expectedCitations、riskType 和 reviewerNote",
    "调整 chunk、检索、rerank、prompt 后重复跑同一批样例"
  ],
  "sections": [
    {
      "title": "概念：Golden Set 是质量回归基准",
      "body": "合同审查不能只靠演示时问几个问题。系统可能在某一份合同上表现不错，换成另一类条款就漏召回、引用错或风险判断不稳定。Golden set 是一组固定标准样例，用来衡量系统改动前后的真实效果。"
    },
    {
      "title": "流程：从问题类型到标准引用",
      "body": "合同评测集可以分三类：事实问答，例如“付款期限是什么”；引用定位，例如“违约责任在哪一条”；风险审查，例如“是否存在单方解除风险”。三类问题分别检验检索准确性、引用溯源和审查判断能力。"
    },
    {
      "title": "样例结构：标准答案之外还要标引用",
      "body": "一条完整样例至少包含 question、documentId、expectedAnswer、expectedCitations、riskType、riskLevel、mustMention 和 reviewerNote。expectedCitations 要精确到条款或页码，这样才能判断系统引用是否真的命中，而不是只看答案表述是否接近。"
    },
    {
      "title": "覆盖面：围绕真实合同风险组织",
      "body": "合同审查评测集可以覆盖付款周期、交付验收、违约责任、责任上限、知识产权归属、保密义务、竞业限制、单方解除、争议解决和管辖地等风险。每类准备 2-3 条样例，早期就能形成 20-30 条可用基准。"
    },
    {
      "title": "项目例子：每次改策略都要回归",
      "body": "legal-rag 每次调整 chunk size、overlap、embedding、hybrid search、rerank 或 prompt，都应该用同一批 golden set 跑一遍。观察召回命中率、TopK 命中率、citation 命中率、风险类型命中率和结构化输出成功率。如果某项下降，就回看对应样例。"
    },
    {
      "title": "持续迭代：人审失败样例反哺评测集",
      "body": "人工审核中被驳回、修改或标记不确定的案例非常有价值。它们可以转化成新的 golden set 样例，帮助系统覆盖真实失败场景。这样评测集不是一次性文档，而是随着项目使用持续增长的质量资产。"
    }
  ],
  "takeaways": [
    "Golden set 能让合同审查 RAG 的效果可比较、可回归。",
    "评测样例要同时覆盖事实问答、引用定位和风险审查。",
    "人工复核中的失败案例应该反向沉淀成新的评测样例。"
  ]
}

export default post
