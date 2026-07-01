import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-permission-testing-strategy",
  "title": "AI 应用权限测试：跨租户、过期链接、导出与工具调用",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 应用权限测试不能只验证登录。本文讨论如何覆盖 RAG 检索、citation、报告导出、缓存、工具调用和多租户隔离中的越权风险。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "权限测试",
    "多租户隔离",
    "越权防护"
  ],
  "scenarios": [
    "企业 RAG 权限验收",
    "Agent 工具调用测试",
    "报告导出安全"
  ],
  "practiceChecklist": [
    "准备跨租户、跨工作区、角色不足、资源删除和链接过期样例",
    "检索、citation、缓存、导出和工具调用都要验证权限",
    "把拒绝访问、人工接管和审计日志纳入测试断言"
  ],
  "sections": [
    {
      "title": "问题背景：AI 权限不止登录态",
      "body": "传统应用常把权限测试集中在页面和接口，但 AI 应用还有检索上下文、引用片段、模型输出、导出报告、缓存结果和工具调用。如果权限只在前端或入口检查，模型可能基于用户无权访问的资料生成答案。"
    },
    {
      "title": "测试范围：从资源到动作都要覆盖",
      "body": "权限测试至少覆盖 tenant、workspace、role、resource ACL、document visibility、report export、tool action 和 audit log。用户能否访问文档、能否检索 chunk、能否查看 citation、能否导出报告、能否调用写操作工具，都要分别验证。"
    },
    {
      "title": "RAG 场景：检索前过滤是关键",
      "body": "RAG 权限测试要确认 metadata filter 在检索前生效，而不是等模型回答后再遮盖。测试样例可以包括跨租户相似文档、同名合同、已归档文档、已删除 chunk、权限变更后的旧缓存和过期分享链接。"
    },
    {
      "title": "Agent 场景：工具调用要按 action 授权",
      "body": "Agent 工具调用不能只相信模型选择。服务端要在工具执行前校验 actor、action、resource 和 scope。测试要覆盖未授权删除、越权导出、重复写入、绕过 PendingAction、使用管理员身份执行等请求，并检查是否写入审计。"
    },
    {
      "title": "工程取舍：权限测试要有负例",
      "body": "只测“有权限的人能访问”是不够的。更重要的是负例：无权限的人不能访问，权限变化后旧缓存失效，删除后 citation 不再可见，过期链接不能导出，模型不能通过提示词绕过权限。负例能暴露真正的安全边界。"
    },
    {
      "title": "项目例子：企业合同库权限验收",
      "body": "Legal RAG 可以准备两个租户、多个工作区和几份相似合同。测试同一问题在不同用户下是否只能召回授权文档；ERP 可以测试只有审批角色能执行平台写入；Pet 可以测试只有审核角色能发布生成资产。"
    }
  ],
  "takeaways": [
    "AI 应用权限测试要覆盖检索、引用、缓存、导出和工具调用。",
    "跨租户、权限变更、过期链接和删除资源是重点负例。",
    "权限拒绝和高风险拦截都应该写入审计日志。"
  ]
}

export default post
