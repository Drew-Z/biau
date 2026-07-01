import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "docker-compose-ai-dev",
  "title": "Docker Compose 本地编排：AI 全栈应用如何一键跑起来",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "AI 应用通常包含前端、API、PostgreSQL、Redis、Worker、对象存储和模型配置。本文讨论如何用 Docker Compose 降低本地联调和交付成本。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Docker Compose",
    "本地编排",
    "环境变量"
  ],
  "scenarios": [
    "RAG 本地开发",
    "ERP 队列任务",
    "AI 生成服务联调"
  ],
  "practiceChecklist": [
    "把 web、api、postgres、redis、worker、minio 等拆成服务",
    "敏感配置放入环境变量和 .env.example，不写死在代码里",
    "提供一条命令启动本地依赖，并写清楚本地与生产边界"
  ],
  "sections": [
    {
      "title": "概念：本地可复现是交付能力的一部分",
      "body": "AI 应用通常不只有前端和一个接口，还会有 PostgreSQL、pgvector、Redis、Worker、对象存储、模型配置和第三方 API。手动启动这些依赖容易出错。Docker Compose 的价值，是把本地开发环境编排成一组可复现服务。"
    },
    {
      "title": "流程：把服务边界写进 compose",
      "body": "一个 RAG 或 Agent 应用可以拆成 web、api、postgres、redis、worker、minio 等服务。web 负责前端，api 负责业务接口，postgres 存业务数据和向量，redis 支撑队列和缓存，worker 执行文档解析、embedding、审查和生成任务，minio 模拟对象存储。"
    },
    {
      "title": "工程取舍：环境变量要规范",
      "body": "模型 key、数据库地址、Redis 地址、对象存储凭据、模型名称、向量维度和队列开关都应该通过环境变量配置。不要把密钥和生产地址写进代码或公开文档。公开展示时可以用 .env.example 说明字段，但不放真实值。"
    },
    {
      "title": "边界：Compose 不是完整生产部署",
      "body": "本地 Compose 主要服务开发、联调和演示，不等于完整生产部署。生产环境还需要日志、监控、备份、权限、网络隔离、健康检查、滚动发布和故障恢复。项目说明时要把本地编排和生产部署边界讲清楚。"
    },
    {
      "title": "项目例子：legal-rag 的本地闭环",
      "body": "legal-rag 生产化时，可以用 Compose 启动 API、PostgreSQL + pgvector、Redis 和 Worker。这样文档入库、向量持久化、队列任务和前端演示能在本地形成闭环，也方便别人按文档复现演示环境。"
    },
    {
      "title": "项目例子：ERP 和生成管线的联调",
      "body": "Ozon ERP 天然适合 Compose，因为它有 API、数据库、Redis、Worker 和插件侧联调；Pet Workspace 生成管线也可以通过 Compose 固定服务依赖。Compose 的价值是把“我本机能跑”推进到“别人按文档也能跑”。"
    }
  ],
  "takeaways": [
    "Docker Compose 能把 AI 全栈项目的本地环境变成可复现交付物。",
    "AI 应用通常要编排 web、api、数据库、Redis、Worker 和对象存储。",
    "本地编排和生产部署要区分，敏感配置必须通过环境变量管理。"
  ]
}

export default post
