import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-access-control-model",
  "title": "AI 应用权限模型：租户、工作区、角色与资源 ACL",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 权限模型必须覆盖资料检索和工具调用。本文讨论 tenant、workspace、RBAC、ACL、metadata filter 和 action scope 如何统一。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "权限模型",
    "多租户隔离",
    "资源 ACL"
  ],
  "scenarios": [
    "企业知识库",
    "合同审查平台",
    "Agent 工具调用"
  ],
  "practiceChecklist": [
    "区分 tenant、workspace、role、resource ACL 和 action scope",
    "检索前按权限过滤文档、chunk 和 citation",
    "所有高风险 action 做后端授权和审计"
  ],
  "sections": [
    {
      "title": "问题背景：权限不是登录校验",
      "body": "用户登录只能证明“是谁”，不能证明“能看什么、能做什么”。AI 应用会访问文档、chunk、引用片段、报告、任务和工具，如果权限模型不完整，模型可能把不该看的资料带入上下文，或者让 Agent 执行越权操作。"
    },
    {
      "title": "层级设计：先拆清 tenant、workspace 和 action",
      "body": "常见层级包括 tenant、workspace、project、resource 和 action。tenant 用来隔离客户或组织，workspace 用来隔离团队或业务域，resource 表示 document、report、job、tool 等具体对象，action 表示 read、write、review、export、delete、execute。"
    },
    {
      "title": "授权方式：RBAC 和 ACL 要配合",
      "body": "RBAC 适合描述角色能力，例如 admin、member、reviewer、viewer；ACL 适合描述具体资源授权，例如某份合同只允许法务组访问。企业 RAG 通常需要两者结合：先看用户角色，再看文档、目录或标签级资源权限。"
    },
    {
      "title": "RAG 检索：权限要前置到召回之前",
      "body": "权限过滤必须发生在检索前。系统应该把 tenantId、workspaceId、documentId、ownerId、visibility、status、allowedRoles 等元数据写入索引，并在 vector search、keyword search 和 rerank 前应用 filter。不能先召回全部片段再让模型决定是否保密。"
    },
    {
      "title": "Agent 工具：授权要按动作判断",
      "body": "Agent 调工具时，后端要根据 user、resource、action 和参数做授权。读状态、查资料、生成草稿是低风险动作；导出报告、修改配置、发布内容、删除数据是高风险动作。高风险动作要进入 PendingAction 或人工确认。"
    },
    {
      "title": "缓存审计：权限变化要驱动失效",
      "body": "员工离职、部门调整、文档从公开改私有、角色权限变化时，检索缓存、报告下载链接、citation 展示和长期会话上下文都要失效。权限模型如果不和缓存、审计联动，很容易留下隐性数据泄露风险。"
    }
  ],
  "takeaways": [
    "AI 应用权限模型要覆盖租户、工作区、角色、资源和动作。",
    "RAG 权限必须前置到检索阶段，而不是依赖模型隐藏信息。",
    "权限变化要联动缓存、citation、导出链接和审计日志。"
  ]
}

export default post
