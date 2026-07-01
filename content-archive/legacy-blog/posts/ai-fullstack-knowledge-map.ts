import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-fullstack-knowledge-map",
  "title": "AI 应用全栈知识图谱：从业务入口到交付运营",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "AI 应用全栈不是模型调用清单。本文把业务入口、RAG、Agent、前端工作台、后端任务、监控评测和运营串成一张知识图谱。",
  "date": "2026-06-20",
  "readTime": "11 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "知识图谱",
    "AI 全栈",
    "工程闭环"
  ],
  "scenarios": [
    "技术体系梳理",
    "项目复盘",
    "AI 应用架构设计"
  ],
  "practiceChecklist": [
    "用输入、处理、生成、审核、交付、运营六层梳理系统",
    "把每个知识点关联到一个真实项目模块",
    "定期用故障、反馈和评测结果补全知识图谱"
  ],
  "sections": [
    {
      "title": "入口层：先从业务动作看系统",
      "body": "AI 应用全栈不是从模型开始，而是从业务入口开始。用户上传文档、提交问题、发起审查、创建生成任务，这些入口决定了权限、数据结构、任务状态和前端交互。模型只是其中一个能力节点。"
    },
    {
      "title": "证据层：RAG 负责让回答有依据",
      "body": "RAG 链路包含文档解析、清洗、chunk、embedding、向量检索、混合检索、rerank、上下文拼接、生成和 citation。它解决的是“模型凭什么回答”和“用户如何验证回答”的问题。"
    },
    {
      "title": "流程层：Agent 把能力变成任务执行",
      "body": "Agent 不只是聊天，它把检索、工具调用、任务拆解、状态流转和人工确认串起来。可控 Agent 要有工具 schema、权限边界、幂等、失败重试、状态机和 Human-in-the-loop。"
    },
    {
      "title": "工程层：前后端和部署支撑稳定交付",
      "body": "前端要展示进度、引用、风险、错误和人工操作；后端要管理 API、队列、Worker、数据库、缓存和对象存储；部署要区分前端、API、Worker、PostgreSQL、Redis 和模型供应商。全栈工程决定 AI 能力能不能被真实使用。"
    },
    {
      "title": "质量层：监控和评测负责持续变好",
      "body": "AI 应用不能只靠功能测试。还要记录 trace、promptVersion、model、token、latency、retrievedChunks、citations、errorType 和 userFeedback。再用 golden set 做回归，观察召回率、引用准确率、人工驳回率和成本变化。"
    },
    {
      "title": "运营层：让知识系统长期有效",
      "body": "知识库、prompt、模型和配置都会过期。系统需要文档 owner、reviewCycle、配置审计、反馈闭环和发布检查清单。这样 AI 应用才不是一次 Demo，而是可维护、可调优、可解释的长期系统。"
    }
  ],
  "takeaways": [
    "AI 应用全栈要把业务入口、RAG、Agent、全栈工程、监控评测和运营串成闭环。",
    "模型能力只是系统的一部分，真正难点在权限、数据、流程、质量和交付。",
    "每个知识点最好都能落到一个项目模块，而不是停在概念层。"
  ]
}

export default post
