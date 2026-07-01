import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "contract-review-collaborative-review",
  "title": "合同审查协同复核：法务、业务与管理员如何分工",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "合同审查系统进入真实流程后，风险项需要多人协同处理。本文讨论法务、业务、管理员和系统任务如何围绕风险项分工。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "Legal RAG",
  "knowledgePoints": [
    "协同复核",
    "风险项流转",
    "角色权限"
  ],
  "scenarios": [
    "合同审查工作台",
    "法务协同",
    "风险项处理流程"
  ],
  "practiceChecklist": [
    "把 riskItem 设计成可分派、可评论、可变更状态的工作项",
    "区分法务、业务、管理员和系统自动任务的职责边界",
    "所有复核结论、修改建议和导出动作都写入审计记录"
  ],
  "sections": [
    {
      "title": "问题背景：风险识别只是流程起点",
      "body": "合同审查系统能识别风险并不等于业务已经完成处理。真实流程里，高风险条款需要法务判断，业务要确认商业背景，管理员要维护模板和权限。协同复核的目标，是把 AI 发现的问题变成可跟踪、可分派、可关闭的工作项。"
    },
    {
      "title": "角色分工：不同角色看不同问题",
      "body": "法务负责判断风险类型、风险等级、法律影响和修改建议；业务负责确认交易背景、价格条件、交付计划和客户关系；管理员负责维护合同模板、知识库、权限和审计配置。系统负责生成候选风险项和证据，但不替代最终复核。"
    },
    {
      "title": "状态流：riskItem 要能被处理",
      "body": "riskItem 可以设计为 open、assigned、in_review、needs_business_input、accepted、rejected、resolved 和 exported 等状态。每次状态变化都记录 actor、reason、comment 和 timestamp，让团队知道风险项是否已处理、由谁处理、为什么这样处理。"
    },
    {
      "title": "协作体验：评论和证据要在同一处",
      "body": "复核页面不应该让用户在聊天记录、原文合同和报告之间来回找依据。更好的设计是风险项、citation、原文定位、修改建议、评论和处理动作放在同一个上下文里，减少沟通成本。"
    },
    {
      "title": "工程取舍：流程够用比流程复杂更重要",
      "body": "协同流程过轻会导致责任不清，过重会让团队不愿使用。MVP 可以先支持分派、评论、状态变更和导出留痕，再逐步增加 SLA、提醒、批量处理和复核统计。"
    },
    {
      "title": "项目例子：Legal RAG 的复核工作台",
      "body": "Legal RAG 可以让 AI 生成 riskItems 后进入复核列表。法务确认风险和建议，业务补充交易背景，管理员处理模板或权限问题。导出报告时只包含已确认或标注待复核的风险项。"
    }
  ],
  "takeaways": [
    "合同审查协同要把风险项变成可分派、可评论、可关闭的工作项。",
    "法务、业务和管理员的职责边界要在产品流程中体现。",
    "复核结论、状态变化和导出动作都应保留审计记录。"
  ]
}

export default post
