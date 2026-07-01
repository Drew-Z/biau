import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-gradual-release-strategy",
  "title": "AI 应用灰度发布：模型、Prompt 与检索参数如何逐步放量",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 应用发布不能只切一次开关。本文讨论如何对模型、prompt、检索参数、工具调用和用户范围做灰度发布与回滚。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用工程化",
  "knowledgePoints": [
    "灰度发布",
    "运行时配置",
    "回滚策略"
  ],
  "scenarios": [
    "模型升级",
    "Prompt 迭代",
    "RAG 参数调优"
  ],
  "practiceChecklist": [
    "模型、prompt、topK、rerank、阈值和工具开关都走运行时配置",
    "按租户、角色、任务类型和比例逐步放量",
    "灰度期间监控质量、延迟、成本、错误和人工接管"
  ],
  "sections": [
    {
      "title": "问题背景：AI 变更风险更难预测",
      "body": "传统功能发布通常验证路径较明确，而 AI 应用改模型、prompt、检索参数或工具策略后，输出质量可能在某些长尾问题上变化。一次性全量发布容易让质量、成本或安全问题同时暴露。"
    },
    {
      "title": "配置维度：不要把参数写死",
      "body": "运行时配置可以管理 model、promptVersion、embeddingVersion、topK、similarityThreshold、rerankEnabled、toolPolicy、safetyLevel 和 fallbackModel。配置和代码分离后，团队可以快速灰度、回滚和对比不同策略。"
    },
    {
      "title": "放量策略：从小范围到全量",
      "body": "灰度可以按租户、工作区、角色、任务类型、流量比例或白名单放量。先给低风险任务和内部用户，再扩展到真实业务用户；高风险动作可以保持人工确认，直到质量指标稳定。"
    },
    {
      "title": "监控指标：质量和成本一起看",
      "body": "灰度期间要同时看采纳率、引用命中率、结构化成功率、人工复核通过率、延迟、token 成本、失败率、越权拦截和用户反馈。只看调用成功率会漏掉“答案能生成但不可用”的问题。"
    },
    {
      "title": "工程取舍：回滚要比上线更快",
      "body": "灰度发布的核心不是慢，而是可控。每次变更都要记录 configVersion、promptVersion 和 modelVersion；出现异常时可以快速回退到上一版，并保留对比数据用于复盘。"
    },
    {
      "title": "项目例子：Legal RAG 的 prompt 灰度",
      "body": "Legal RAG 可以先对低风险合同类型启用新版 riskItem prompt，只给部分用户使用。系统对比 citation 命中、风险项采纳、人工复核结果和成本，稳定后再扩大到更多合同类型。"
    }
  ],
  "takeaways": [
    "AI 应用发布要把模型、prompt 和检索参数纳入运行时配置。",
    "灰度放量应按风险和用户范围逐步扩大。",
    "可观测和快速回滚比一次性全量更适合 AI 输出变更。"
  ]
}

export default post
