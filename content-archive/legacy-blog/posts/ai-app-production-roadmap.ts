import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-app-production-roadmap",
  "title": "AI 应用生产化路线：从可演示 MVP 到可交付系统",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "AI MVP 证明的是链路能跑通，生产化系统要证明能被别人稳定使用。本文梳理模型、数据、队列、权限、评估、监控和交付材料的升级路线。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "MVP 生产化",
    "工程闭环",
    "交付清单"
  ],
  "scenarios": [
    "RAG 项目交付",
    "AI 生成管线产品化",
    "企业内部智能助手"
  ],
  "practiceChecklist": [
    "先跑通端到端闭环，再替换生产级依赖",
    "把模型调用、数据存储、队列、权限和评估拆成可替换模块",
    "用 golden set、日志、成本指标和人工复核证明系统质量"
  ],
  "sections": [
    {
      "title": "概念：MVP 证明价值，生产化证明可交付",
      "body": "MVP 的目标是证明业务链路能跑通，例如文档能导入、问题能检索、回答能带引用、合同能输出风险报告。生产化系统的目标是稳定交付给别人使用，需要解决持久化、权限、并发、失败恢复、日志、监控、成本和数据安全。"
    },
    {
      "title": "第一阶段：先跑通端到端闭环",
      "body": "AI 应用早期不要一上来追求复杂架构，而是先把用户输入、模型能力、业务结果和前端展示串起来。legal-rag 可以先用 mock embedding 和 memory vector store 验证文档入库、检索问答和 citations；Pet Workspace 可以先跑通生成、QA、人审和发布记录。"
    },
    {
      "title": "第二阶段：替换生产级依赖",
      "body": "闭环成立后，再把临时实现替换成生产依赖：真实 embedding provider、PostgreSQL + pgvector、Redis/BullMQ、对象存储、PDF/DOCX/OCR parser、结构化输出校验和环境变量配置。关键是前期抽象边界要清楚，替换底层实现时不要重写上层业务。"
    },
    {
      "title": "第三阶段：补可靠性和安全边界",
      "body": "可交付 AI 应用必须能处理失败。模型超时、解析失败、检索为空、输出不合法、队列重试、权限不足都要有明确状态和错误提示。高风险动作还要加人工复核、审计日志和回滚策略，不能让模型直接决定最终写入或发布。"
    },
    {
      "title": "第四阶段：建立质量和成本评估",
      "body": "生产化不是只看页面能不能点通，而是要知道效果是否稳定。RAG 项目需要 golden set，评估召回命中率、citation 命中率和答案忠实度；生成管线需要 QA Gate、人审通过率和失败原因统计；业务系统需要任务成功率、响应时间、错误分布和成本指标。"
    },
    {
      "title": "交付材料：让别人能理解和复现",
      "body": "交付材料至少包括启动方式、环境变量说明、架构图、数据模型、核心接口、任务状态、错误处理、评估样例和演示脚本。这样别人不仅能看到系统，也能理解它为什么可靠、边界在哪里、后续怎么继续迭代。"
    }
  ],
  "takeaways": [
    "AI 应用生产化是从价值闭环走向稳定交付的过程。",
    "替换生产依赖前要先设计好 provider、store、queue、review 等边界。",
    "质量评估、成本观测、安全、人审和交付文档共同决定系统是否可交付。"
  ]
}

export default post
