import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-tool-permission-audit",
  "title": "AI 工具调用权限与审计：让 Agent 行动保持可控",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "Agent 能调用工具后，风险从“答错”升级为“做错”。本文讨论后端权限校验、PendingAction、审计日志和高风险动作确认如何共同构成安全边界。",
  "date": "2026-06-20",
  "readTime": "11 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "权限控制",
    "审计日志",
    "高风险动作确认"
  ],
  "scenarios": [
    "Agent 工具调用",
    "ERP 外部平台写入",
    "合同审查结果发布"
  ],
  "practiceChecklist": [
    "工具执行前校验用户身份、租户、资源归属和操作范围",
    "高风险写操作先生成 PendingAction，再由人工确认执行",
    "审计日志记录 who、what、when、input、output、decision 和 traceId"
  ],
  "sections": [
    {
      "title": "概念：Tool Calling 把模型输出变成系统动作",
      "body": "Agent 只能聊天时，主要风险是回答不准确；Agent 能调用工具后，风险会变成查错数据、写错记录、发布错误内容或触发外部平台操作。模型不应该天然拥有系统权限，工具执行前必须由后端根据用户身份、资源归属和操作类型做权限校验。"
    },
    {
      "title": "流程：模型建议，后端校验，系统执行",
      "body": "安全的工具调用流程应该是：模型选择工具并生成参数；后端校验 userId、tenantId、role、resourceId、operationScope 和参数 schema；低风险动作可以直接执行；高风险动作生成 PendingAction，展示影响范围、引用依据和 AI 建议，由人工确认后再执行。"
    },
    {
      "title": "工程取舍：权限不能写在 prompt 里",
      "body": "提示词可以提醒模型不要执行某些动作，但真正的安全边界必须落在工程系统。权限校验、资源归属、操作范围、速率限制、幂等键和审计日志都要由后端保证。否则模型一次错误规划，就可能越权读取或写入业务数据。"
    },
    {
      "title": "审计日志：记录成功，也记录拒绝",
      "body": "审计日志至少要记录操作人、租户、工具名、资源 ID、输入参数、输出结果、执行状态、时间、错误原因、人工决策和 traceId。权限拒绝、参数不合法、人工驳回、模型输出不合规同样要记录，因为这些数据能暴露权限配置问题和高风险流程瓶颈。"
    },
    {
      "title": "项目例子：ERP、RAG 和生成发布的同一条边界",
      "body": "Ozon ERP 里的 PendingAction 和 AuditLog 可以作为安全写入经验；legal-rag 的合同审查可以把高风险条款和缺引用结论送入人工复核；Pet Workspace 的生成内容发布也需要审核记录。这些项目可以用同一套“权限、确认、审计”逻辑串起来。"
    },
    {
      "title": "验证：权限测试要覆盖负例",
      "body": "工具权限不能只测成功路径，还要构造跨租户资源、无权限用户、高风险操作、重复提交、非法参数和人工驳回等负例。只有这些负例被稳定拦截并进入审计，Agent 工具调用才算具备可交付的安全边界。"
    }
  ],
  "takeaways": [
    "Agent 工具调用的安全边界必须由后端权限系统保证，而不是依赖提示词。",
    "高风险写操作应先生成 PendingAction，再由人工确认并记录审计。",
    "权限负例测试和审计日志共同证明 AI 行动链路可控。"
  ]
}

export default post
