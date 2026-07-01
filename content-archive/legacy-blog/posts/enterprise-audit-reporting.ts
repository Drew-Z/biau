import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "enterprise-audit-reporting",
  "title": "企业审计报表：文档访问、报告导出与工具调用追踪",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "企业 AI 需要回答谁在何时访问了哪些资料、导出了哪些报告、触发了哪些工具。本文讨论审计记录和报表筛选设计。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "审计报表",
    "访问追踪",
    "合规记录"
  ],
  "scenarios": [
    "企业知识库审计",
    "合同审查导出记录",
    "Agent 高风险操作追踪"
  ],
  "practiceChecklist": [
    "记录用户、租户、资源、动作、时间、结果和 traceId",
    "把访问、检索、导出、权限变更和工具调用分类型统计",
    "审计报表支持按用户、文档、时间和风险类型筛选"
  ],
  "sections": [
    {
      "title": "问题背景：企业 AI 需要回答谁做了什么",
      "body": "企业知识库和合同审查系统里，用户访问了哪些文档、检索了哪些片段、导出了哪些报告、触发了哪些工具调用，都可能成为合规和安全问题。审计报表就是把这些行为从日志里提炼成可查询、可复盘的记录。"
    },
    {
      "title": "记录结构：审计字段要服务追溯",
      "body": "审计表可以记录 actorId、tenantId、workspaceId、resourceType、resourceId、action、result、riskLevel、traceId、ip、userAgent、createdAt。对于 AI 场景，还可以记录 model、promptVersion、documentVersion、citationIds 和 toolName。"
    },
    {
      "title": "审计范围：成功、失败和拒绝都要记录",
      "body": "常见行为包括登录、文档上传、文档访问、检索查询、citation 查看、报告导出、权限变更、配置变更、工具调用、人审通过、人审驳回和高风险拦截。失败、拒绝和人工驳回也要记录，因为它们能暴露安全风险和流程瓶颈。"
    },
    {
      "title": "报表查询：支持多维度筛选",
      "body": "审计报表应该支持按用户、租户、工作区、文档、时间范围、动作类型、风险等级和结果筛选。比如查看某位用户一周内导出了哪些合同报告，或某份敏感文档被哪些人检索和引用。"
    },
    {
      "title": "权限联动：用审计确认影响范围",
      "body": "权限变化时，审计报表能帮助确认影响范围。比如某个角色被赋予导出权限后，系统可以观察导出次数是否异常；某个文档改为私有后，可以检查是否仍有访问或缓存命中。"
    },
    {
      "title": "隐私边界：报表不是越详细越好",
      "body": "审计数据本身也可能包含敏感信息。报表默认展示元信息和摘要，完整 prompt、原文片段和模型输出应受权限控制。审计系统同样需要访问控制和留存策略。"
    }
  ],
  "takeaways": [
    "企业 AI 审计报表要回答谁在什么时间对什么资源做了什么动作。",
    "访问、检索、导出、权限变更、工具调用和人工审核都应进入审计范围。",
    "审计数据本身也要做权限控制和留存管理。"
  ]
}

export default post
