import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "human-in-the-loop-review",
  "title": "Human-in-the-loop 设计：高风险 AI 应用如何接入人工复核",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "法律结论、合同风险、生成内容发布和外部平台写入都不能完全交给模型。本文讨论人工复核的触发规则、状态设计、审计记录和反馈闭环。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Human-in-the-loop",
    "人工复核",
    "审核审计"
  ],
  "scenarios": [
    "合同高风险条款",
    "AI 生成内容发布",
    "外部平台写操作"
  ],
  "practiceChecklist": [
    "定义 riskLevel、confidence、citationCount 等人审触发条件",
    "保留审核人、审核时间、决策、修改记录和引用证据",
    "让人工复核成为状态机节点，而不是页面上的临时备注"
  ],
  "sections": [
    {
      "title": "概念：人工复核是安全边界，不是 AI 的补丁",
      "body": "AI 应用越接近真实业务，越不能完全依赖模型自动决策。法律建议、合同风险、内容发布、外部平台写入、金额和权限相关操作都需要人做最终判断。Human-in-the-loop 的价值不是削弱 AI，而是让 AI 输出进入可控、可追责的流程。"
    },
    {
      "title": "流程：从触发条件到审核决策",
      "body": "完整流程通常包括：模型生成结果；系统根据 riskLevel、confidence、citationCount、schemaValidation、operationType 等字段判断是否需要人审；任务进入待审核列表；审核人查看原始输入、AI 结论、引用依据和修改建议；最终做出通过、驳回、要求修改或转人工处理的决策。"
    },
    {
      "title": "工程取舍：人审不是一个按钮",
      "body": "只做一个“通过/拒绝”按钮，很难支撑后续追责和质量改进。完整的人审设计应包括原始输入、模型输出、引用证据、审核意见、驳回原因、审核人、审核时间、修改记录和状态流转。所有关键字段都应该落库。"
    },
    {
      "title": "状态设计：让人审进入主流程",
      "body": "人工复核应该是状态机的一部分，例如 needs_human_review、approved、rejected、revision_required、published。这样前端、后端、Worker 和日志都知道任务当前卡在哪里，也能让 SSE、通知和审核页面共享同一套状态。"
    },
    {
      "title": "项目例子：三个项目里的同一种边界",
      "body": "legal-rag 中，高风险合同项和引用不足的回答进入人工复核；Pet Workspace 中，生成资产通过 QA Gate 后仍要人审发布；Ozon ERP 中，高风险外部平台写入通过 PendingAction 和 AuditLog 控制。这三类项目不同，但工程思想一致：模型可以建议，最终动作要可审核。"
    },
    {
      "title": "反馈闭环：人审数据反过来优化系统",
      "body": "人工修改和驳回原因是很有价值的反馈数据。可以统计哪些风险类型经常被改、哪些引用经常不准、哪些生成产物经常不过审，再反向优化 prompt、检索、规则、QA Gate 和评估集。人审不只是防线，也是系统持续改进的数据来源。"
    }
  ],
  "takeaways": [
    "人工复核是高风险 AI 应用的安全边界，也是可追责流程的一部分。",
    "人审要有触发规则、状态、证据、决策和审计记录。",
    "人审反馈能反向优化检索、生成、QA Gate 和评估集。"
  ]
}

export default post
