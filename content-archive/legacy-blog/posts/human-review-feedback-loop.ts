import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "human-review-feedback-loop",
  "title": "人审反馈闭环：把审核结果变成系统改进数据",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "Human-in-the-loop 不只是让人点通过。本文讨论审核记录如何沉淀为规则、Prompt 调整、Golden Set 和质量指标。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "人审反馈",
    "质量闭环",
    "评测样例沉淀"
  ],
  "scenarios": [
    "合同风险复核",
    "AI 生成内容审核",
    "RAG 引用质量反馈"
  ],
  "practiceChecklist": [
    "记录审核决策、修改原因和引用问题",
    "把高价值失败案例沉淀为 golden set",
    "定期统计人审反馈，反向调整 prompt、规则和检索策略"
  ],
  "sections": [
    {
      "title": "问题背景：人审不是流程终点",
      "body": "Human-in-the-loop 不只是让人点通过或拒绝。人工审核记录是非常有价值的质量数据，可以告诉系统哪些风险经常误判、哪些引用经常不准、哪些输出格式经常需要修改。"
    },
    {
      "title": "数据结构：审核记录应该结构化",
      "body": "审核数据最好包含 decision、reviewerId、reasonCode、editedFields、citationFeedback、riskType、confidence、createdAt。结构化记录比自由文本备注更容易统计，也更容易转化成规则和评测样例。"
    },
    {
      "title": "反馈到规则：让审核数据回到系统配置",
      "body": "如果人工经常驳回某类低置信度引用，可以增加 citation 阈值；如果某类风险经常漏判，可以补充检索关键词、风险规则或 prompt 约束。人审反馈应该定期回到系统配置，而不是停在审核表里。"
    },
    {
      "title": "反馈到 Golden Set：把失败变成回归样例",
      "body": "高价值失败案例应该进入 golden set。比如模型引用错条款、风险等级判断过高、OCR 识别错金额、输出结构缺字段，这些都可以变成回归样例，防止后续优化再次犯同样错误。"
    },
    {
      "title": "工程取舍：人审反馈也有质量问题",
      "body": "人工审核并不总是完全一致。系统需要区分审核人、审核标准、业务场景和修改原因。对于争议样例，可以标记为需要二次复核，而不是直接把一次人工修改当成绝对真相。"
    },
    {
      "title": "运营指标：观察系统是不是真的变好",
      "body": "可以持续观察人工驳回率、字段修改率、引用错误率、风险类型修正率、二次复核率和反馈进入评测集的比例。这些指标能说明 AI 系统是在变好，还是只是把工作转移给人工。"
    }
  ],
  "takeaways": [
    "人审反馈是优化 AI 应用的重要数据源。",
    "审核记录要结构化，才能反向改规则、prompt 和评测集。",
    "人审质量也需要管理，不能把一次人工修改当成绝对真相。"
  ]
}

export default post
