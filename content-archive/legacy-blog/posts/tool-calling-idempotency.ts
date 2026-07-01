import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "tool-calling-idempotency",
  "title": "Tool Calling 幂等性：Agent 重试时如何避免重复写入",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "Agent 调用工具会遇到重试、超时和重复提交。本文讨论 idempotencyKey、数据库约束、外部平台写入和人工确认如何让重试变安全。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "幂等性",
    "Tool Calling",
    "重复写入控制"
  ],
  "scenarios": [
    "Agent 外部工具调用",
    "ERP 写操作",
    "AI 生成任务重试"
  ],
  "practiceChecklist": [
    "为写操作设计 idempotencyKey",
    "工具执行前检查业务唯一约束和任务状态",
    "高风险动作先创建 PendingAction，再由人工确认执行"
  ],
  "sections": [
    {
      "title": "问题背景：工具调用会天然遇到重复执行",
      "body": "Agent 调用工具时可能遇到模型重试、网络超时、Worker 崩溃、用户重复点击和前端重发请求。如果工具是写操作，比如创建任务、发布内容、写入外部平台或生成订单，没有幂等设计就可能重复写入。"
    },
    {
      "title": "核心概念：幂等让重试变安全",
      "body": "幂等的意思是同一个业务动作执行一次和执行多次，最终结果应该一致。它不阻止重试，而是让重试变安全。比如同一个 documentHash 不应该重复入库，同一个 reviewJobId 不应该生成多个审查结果，同一个 publishAction 不应该发布两次。"
    },
    {
      "title": "流程设计：idempotencyKey 代表业务意图",
      "body": "idempotencyKey 可以由 userId、tenantId、operationType、resourceId、requestId 或业务 hash 组成。关键是它要代表同一个业务意图，而不是每次请求随机生成。服务端收到写请求时先检查这个 key 是否已经执行过，再决定返回旧结果或继续执行。"
    },
    {
      "title": "工程取舍：数据库约束是最后防线",
      "body": "幂等不能只靠代码 if 判断。重要写操作应该有唯一索引、状态机约束或事务保护。例如 documentHash + tenantId 唯一，jobId 唯一，externalActionId 唯一。即使并发请求同时到达，数据库也能防止重复落库。"
    },
    {
      "title": "外部系统：写入失败不能盲目补发",
      "body": "调用外部平台时，本地成功但外部响应超时是常见难题。此时不能盲目再发一次，可以先查询外部状态，或使用外部平台支持的幂等 key。如果外部不支持，就要把动作放进 PendingAction，让人工确认后再重试。"
    },
    {
      "title": "项目例子：RAG、Pet 和 ERP 的共同需求",
      "body": "Legal RAG 的文档入库、合同审查 job、报告导出都需要幂等；Pet Workspace 的生成、repair、发布也需要幂等；ERP 的同步和外部平台写入经验可以直接迁移到 Agent 工具调用。"
    }
  ],
  "takeaways": [
    "Agent 写操作必须设计幂等，重试才不会产生脏数据。",
    "idempotencyKey 要代表业务意图，并配合数据库唯一约束。",
    "外部平台写入失败时要查询状态、限制重试或进入人工确认。"
  ]
}

export default post
