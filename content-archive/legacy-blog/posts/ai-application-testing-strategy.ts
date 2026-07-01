import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-application-testing-strategy",
  "title": "AI 应用测试策略：单元测试、Golden Set 与人工验收",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 输出不稳定不代表系统无法测试。本文讨论确定性代码、RAG 评测集、工具调用链路和人工验收如何组合成质量体系。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "AI 测试策略",
    "Golden Set",
    "人工验收"
  ],
  "scenarios": [
    "RAG 回归测试",
    "Agent 工具调用测试",
    "合同审查验收"
  ],
  "practiceChecklist": [
    "确定性逻辑用单元测试",
    "RAG 质量用 golden set 回归",
    "高风险输出保留人工验收和反馈闭环"
  ],
  "sections": [
    {
      "title": "问题背景：AI 应用不是不能测试",
      "body": "很多人觉得大模型输出不稳定，所以 AI 应用无法测试。其实应该把系统拆开：确定性工程逻辑用传统测试，检索和生成质量用评测集，高风险业务结果用人工验收。不能因为模型不稳定就放弃测试。"
    },
    {
      "title": "第一层：单元测试覆盖确定性逻辑",
      "body": "文档 hash、chunk 切分、metadata filter、权限判断、schema 校验、idempotencyKey、状态流转和缓存 key 都是确定性逻辑，应该写单元测试。这些部分越稳，模型不确定性造成的问题越少。"
    },
    {
      "title": "第二层：集成测试覆盖核心链路",
      "body": "RAG 入库、查询、引用返回，Agent 工具调用、队列任务、状态更新、SSE 推送，都适合集成测试。测试可以使用 mock provider 和固定 fixture，让 CI 在没有真实模型 key 的情况下验证链路。"
    },
    {
      "title": "第三层：Golden Set 测检索和生成质量",
      "body": "RAG 和合同审查质量要用 golden set 回归。每个样例包含标准问题、标准引用、风险类型和期望字段。每次改 chunk、embedding、rerank 或 prompt 后，都跑同一批样例，看召回、引用和结构化输出有没有退化。"
    },
    {
      "title": "人工验收：高风险结果必须有人接住",
      "body": "法律建议、合同高风险、生成内容发布和外部平台写操作不能只靠自动测试。人工验收要记录审核人、决策、修改原因和时间。这些记录可以反向进入 golden set 或 QA 规则。"
    },
    {
      "title": "质量运营：测试结果要变成指标",
      "body": "除了 CI 通过，还要关注线上指标：结构化校验失败率、citation 命中率、人工驳回率、任务失败率、平均 token、平均延迟。测试和监控结合，才能发现真实用户场景里的质量变化。"
    }
  ],
  "takeaways": [
    "AI 应用测试要拆成确定性测试、评测集和人工验收。",
    "Mock provider 能让核心链路在没有真实模型 key 时也可回归。",
    "Golden set 和线上指标共同反映 RAG 和 Agent 的质量。"
  ]
}

export default post
