import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "langgraph-agent-state-machine",
  "title": "Agent 状态机设计：用 LangGraph 思路拆解复杂工作流",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "复杂 Agent 不能只靠一段大 prompt 推进。本文用 LangGraph 的 State、Node、Edge、条件路由和 checkpoint 思路，说明如何让 Agent 可追踪、可恢复。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "StateGraph",
    "条件路由",
    "Checkpoint"
  ],
  "scenarios": [
    "多步骤 Agent",
    "AI 生成修复轮次",
    "合同审查人工复核"
  ],
  "practiceChecklist": [
    "把任务拆成 State、Node、Edge 和条件分支",
    "不要把关键流程规则藏进一段大 prompt",
    "在检索、工具调用、校验和人审前后保存 checkpoint"
  ],
  "sections": [
    {
      "title": "概念：复杂 Agent 需要显式流程",
      "body": "简单问答可以一次模型调用完成，但复杂 Agent 通常包含规划、检索、工具调用、结果校验、失败修复和人工确认。如果这些步骤都塞进一个 prompt，系统很难追踪、恢复和调试。状态机思路能把复杂流程拆成明确节点和状态。"
    },
    {
      "title": "流程：State、Node、Edge 分别承担什么",
      "body": "State 保存任务当前数据，例如用户输入、检索结果、工具结果、错误信息和审核状态；Node 是处理步骤，例如生成查询、检索文档、调用工具、生成答案、人工审核；Edge 决定节点之间如何流转，条件边可以根据状态选择下一步。"
    },
    {
      "title": "工程取舍：规则要显式，不要藏在 prompt 里",
      "body": "Agent 不应该每一步都让模型自由决定。检索结果不足就改写问题，引用不可靠就重新检索，结构化输出不合法就重试，高风险结果进入人工复核。这些规则应该通过条件路由表达出来，而不是藏在一句“请谨慎处理”的提示词里。"
    },
    {
      "title": "Checkpoint：让长任务可恢复",
      "body": "长任务可能失败或中断，如果没有 checkpoint，就只能从头再跑。保存关键状态后，系统可以从失败节点恢复，也可以让人工在中间阶段介入。对于生成管线和合同审查，这种可恢复性比单次成功更重要。"
    },
    {
      "title": "项目例子：Pet 生成管线",
      "body": "Pet Workspace 可以用状态机表达为 queued、running、qa_failed、repairing、reviewing、packaged、published。每个状态对应不同节点和规则：AI 负责生成和修复，QA Gate 负责质量检查，人审负责发布决策，工程状态机负责推进流程。"
    },
    {
      "title": "项目例子：RAG 合同审查",
      "body": "合同审查可以拆成 uploaded、indexed、retrieved、reviewing、needs_human_review、completed。检索不充分、引用缺失、风险等级过高都可以触发不同分支。这样 AI 审查不再是黑盒，而是一个可解释、可恢复、可人工接管的工作流。"
    }
  ],
  "takeaways": [
    "复杂 Agent 要拆成状态、节点、边和条件路由，不能只依赖长 prompt。",
    "Checkpoint 能提升长任务的恢复能力和人工接管能力。",
    "AI 决策应该被工程状态机约束，关键动作要可解释、可追踪。"
  ]
}

export default post
