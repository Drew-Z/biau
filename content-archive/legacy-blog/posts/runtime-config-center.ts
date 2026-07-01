import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "runtime-config-center",
  "title": "运行时配置中心：模型、Prompt 与检索参数的灰度调整",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "模型、Prompt 和检索参数上线后会持续调整。本文讨论运行时配置的作用域、审计、灰度、回滚和前端调试配合。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "运行时配置",
    "动态参数",
    "灰度发布"
  ],
  "scenarios": [
    "RAG 参数调优",
    "模型切换",
    "Prompt 灰度发布"
  ],
  "practiceChecklist": [
    "把模型、promptVersion、topK、threshold、rerank 开关做成可配置项",
    "记录每次配置变更的操作者、原因和影响范围",
    "高风险配置先按租户、用户或流量比例灰度"
  ],
  "sections": [
    {
      "title": "问题背景：不能把所有参数写死",
      "body": "AI 应用上线后，模型、prompt、检索参数和安全阈值都会持续调整。如果每次改 topK、温度、rerank 开关或 prompt 版本都要重新发版，调优速度会很慢，也很难快速回滚。运行时配置中心的价值，就是把需要频繁调整的策略从代码里拆出来。"
    },
    {
      "title": "配置范围：哪些参数适合动态化",
      "body": "常见配置包括 provider、model、temperature、maxTokens、promptVersion、topK、scoreThreshold、rerankEnabled、citationRequired、cacheTTL、fallbackModel、guardrailLevel。它们不应该散落在业务代码里，而应该按场景、租户、环境和版本集中管理。"
    },
    {
      "title": "作用域设计：配置不能只有全局键值",
      "body": "配置中心不能只有一个全局键值表。更实用的结构是按 environment、tenant、workspace、feature、scenario 分层覆盖。比如合同审查场景可以使用更严格的 citationRequired 和 guardrailLevel，普通知识问答可以使用更宽松的召回阈值。"
    },
    {
      "title": "发布策略：灰度和回滚",
      "body": "prompt 或模型切换不能直接全量上线。可以按租户、用户组、文档类型或流量比例灰度，并记录实验组和对照组的命中率、引用准确率、延迟和成本。如果指标变差，配置中心应该支持快速回滚到上一版。"
    },
    {
      "title": "审计边界：配置变更也要记录原因",
      "body": "AI 配置会直接影响输出质量和成本，所以每次变更都要记录 operator、reason、oldValue、newValue、scope、createdAt。高风险配置可以走审批，例如关闭 citationRequired、调低安全阈值、切换到未评测模型。"
    },
    {
      "title": "前端配合：展示必要调试信息",
      "body": "前端工作台可以展示当前使用的模型、promptVersion、检索参数和是否命中灰度。调试模式下还可以展示配置快照，方便排查“为什么这次回答和上次不一样”。但普通用户界面只需要呈现稳定结果，不需要暴露全部内部参数。"
    }
  ],
  "takeaways": [
    "运行时配置中心能让 AI 应用在不发版的情况下调模型、prompt 和检索参数。",
    "配置需要作用域、版本、审计、灰度和回滚能力。",
    "配置变更会影响质量和成本，不能当成普通键值表随意修改。"
  ]
}

export default post
