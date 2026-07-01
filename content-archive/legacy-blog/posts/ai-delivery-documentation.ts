import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-delivery-documentation",
  "title": "AI 应用交付文档：README、架构图、接口说明与 Runbook",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 项目要能被理解、启动、验证、部署和排障。本文讨论 README、架构图、数据模型、API 契约、评测报告和 Runbook 的组织方式。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "交付文档",
    "运维手册",
    "项目说明"
  ],
  "scenarios": [
    "AI 项目交付",
    "公开站内容系统",
    "团队接手维护"
  ],
  "practiceChecklist": [
    "准备 README、架构图、环境变量、启动命令和核心流程说明",
    "补充 API 契约、数据模型、任务状态和错误码文档",
    "交付评测报告、部署步骤、回滚方式和故障 Runbook"
  ],
  "sections": [
    {
      "title": "问题背景：交付文档证明系统能被接手",
      "body": "AI 应用不只是能在开发者电脑上跑起来。别人能否理解架构、配置环境、启动服务、验证效果、处理故障，决定它是不是可交付系统。交付文档就是把隐性经验变成可复用资产。"
    },
    {
      "title": "README：讲清楚定位、能力和边界",
      "body": "README 至少包含项目定位、核心能力、技术栈、目录结构、启动方式、环境变量、演示账号、已实现功能和未实现边界。AI 项目尤其要说明模型供应商、mock 能力、真实依赖和数据安全注意事项。"
    },
    {
      "title": "架构图：说明前端、API、Worker 和数据层关系",
      "body": "架构图要展示前端、API、Worker、数据库、Redis、对象存储、模型供应商和向量库之间的关系。数据模型要说明 Document、Chunk、Embedding、Job、AuditLog、Report、Feedback 等核心表的职责。"
    },
    {
      "title": "接口文档：稳定任务状态和错误语义",
      "body": "AI 应用要记录 API 契约、SSE 事件、异步任务状态、错误码、重试语义和幂等规则。前端、后端和运维都要依赖这些稳定约定，不然排查问题会很痛苦。"
    },
    {
      "title": "验收材料：用评测结果证明质量边界",
      "body": "交付时应准备 golden set、评测指标、测试结果、已知限制和示例报告。RAG 项目要展示召回、引用、无答案处理；Agent 项目要展示工具调用、失败恢复、人审和审计。"
    },
    {
      "title": "Runbook：让常见故障有处理步骤",
      "body": "运维文档要说明部署步骤、日志位置、监控指标、成本告警、常见故障、回滚方式和数据备份。模型不可用、队列堆积、向量库异常、解析失败，都应该有对应处理步骤。"
    }
  ],
  "takeaways": [
    "AI 应用交付文档要让别人能理解、启动、验证、部署和排障。",
    "README、架构图、数据模型、API 契约和评测报告是核心材料。",
    "运维 Runbook 能把故障处理从临场发挥变成标准流程。"
  ]
}

export default post
