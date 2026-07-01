import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "agent-tool-calling-engineering",
  "title": "Agent Tool Calling 工程化：从聊天回答到可控任务执行",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "Agent 的难点不是让模型多说几句话，而是让模型在受控边界内调用工具、推进状态、处理失败，并把高风险动作交给权限和人工复核。",
  "date": "2026-06-20",
  "readTime": "12 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Agent",
    "Tool Calling",
    "状态与失败处理"
  ],
  "scenarios": [
    "AI 生成管线",
    "合同审查工作流",
    "自动化运营助手"
  ],
  "practiceChecklist": [
    "为每个工具定义稳定 schema、权限边界和幂等键",
    "把工具调用结果写入任务状态和审计日志",
    "将发布、删除、付款、外部写入等高风险动作放入人工确认流程"
  ],
  "sections": [
    {
      "title": "概念：Agent 比 ChatBot 多了行动边界",
      "body": "普通 ChatBot 主要根据上下文生成回答；Agent 则围绕一个目标决定下一步动作：是否检索资料、是否调用业务接口、是否创建任务、是否等待人工确认。真正的 Agent 系统不是让模型自由操作一切，而是把模型放进预先设计好的工具、权限、状态和审计边界里。"
    },
    {
      "title": "流程：模型决策，工程系统执行",
      "body": "Tool Calling 的基本流程是：开发者定义工具 schema，模型根据用户目标选择工具并填参数，服务端校验参数和权限，业务系统执行工具，执行结果再回到模型或任务状态里。模型负责推理和编排，数据库写入、文件处理、队列任务、第三方 API 调用仍然由确定性的工程代码完成。"
    },
    {
      "title": "工具设计：schema 决定可控性",
      "body": "工具 schema 不能只写一个自由文本参数。以合同审查为例，一个工具可以明确 documentId、reviewScope、riskTypes、requireCitation、outputFormat 等字段；以生成管线为例，可以明确 assetType、stylePreset、seedPolicy、qaLevel、publishTarget。参数越清楚，模型越不容易误解任务，服务端也越容易做校验和审计。"
    },
    {
      "title": "工程取舍：成功路径之外还要设计失败路径",
      "body": "真实业务系统里，工具调用会遇到参数缺失、权限不足、文件不存在、任务超时、第三方接口失败、模型输出不符合 schema 等问题。工程上要定义错误码、重试策略、幂等键、超时、fallback 和人工接管。一个 Agent 是否可靠，往往不是看成功调用多炫，而是看失败时能否解释、恢复和追踪。"
    },
    {
      "title": "状态管理：让多步任务可观察",
      "body": "Agent 执行多步任务时不能只依赖一次性对话。生成类任务可以有 queued、running、qa_failed、repairing、reviewing、published 等状态；合同审查可以有 uploaded、indexed、reviewing、needs_human_review、completed 等状态。状态清晰后，前端能展示进度，后端能恢复任务，日志能复盘问题，人审也能接入流程。"
    },
    {
      "title": "项目例子：生成管线和合同审查的不同边界",
      "body": "Pet Workspace 的生成管线更强调任务编排、QA Gate、人审发布和 App API 契约；合同审查 RAG 更强调文档检索、引用溯源、风险项输出和人工复核。两类项目都可以使用 Tool Calling，但工具边界不同：前者关注生成资产能否安全进入 App，后者关注法律结论能否回到原文证据。"
    }
  ],
  "takeaways": [
    "Agent 的价值在于把模型推理接入工具和流程，而不是让模型绕过工程系统。",
    "Tool Calling 要重点设计 schema、权限、幂等、状态、失败处理和审计。",
    "高风险业务动作必须可追踪、可回滚、可人工接管。"
  ]
}

export default post
