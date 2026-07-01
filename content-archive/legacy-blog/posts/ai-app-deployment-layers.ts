import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "ai-app-deployment-layers",
  "title": "AI 应用部署分层：静态站、API、Worker 和数据服务如何协作",
  "tag": "全栈开发",
  "column": "knowledge",
  "detail": "展示站可以静态托管，模型调用、数据库、队列和文件处理必须留在服务端。本文梳理 Cloudflare Pages、API、Worker、PostgreSQL、Redis 和对象存储的部署边界。",
  "date": "2026-06-20",
  "readTime": "11 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "部署分层",
    "Cloudflare Pages",
    "API / 数据库边界"
  ],
  "scenarios": [
    "博客展示站部署",
    "RAG API 服务部署",
    "AI 任务队列和数据库托管"
  ],
  "practiceChecklist": [
    "展示型前端优先走 Pages 或 CDN",
    "模型 key、数据库、队列、对象存储写权限必须放在服务端",
    "为 API、Worker、数据库、Redis 和对象存储分别准备环境变量、健康检查和备份策略"
  ],
  "sections": [
    {
      "title": "概念：静态展示和业务服务是两类部署问题",
      "body": "AI 项目展示站、博客系统、项目官网这类前端可以优先部署到 Cloudflare Pages 或其他静态托管平台。它们适合承载 React/Vite 构建产物、图片、文章和项目展示。但模型 key、数据库连接、向量检索、队列任务和文件解析不能放在纯前端里，必须由后端服务承接。"
    },
    {
      "title": "流程：前端、API、Worker、数据服务分层",
      "body": "一个可交付 AI 应用通常分成前端站点、API 服务、Worker、数据库、Redis、对象存储和模型供应商几层。前端负责交互和展示；API 负责权限、业务校验和任务创建；Worker 负责文档解析、embedding、审查和生成；数据库保存业务数据和向量；对象存储保存原始文件和导出结果。"
    },
    {
      "title": "工程取舍：Cloudflare Pages 适合展示站",
      "body": "Cloudflare Pages 适合部署 blog-semi 这类展示型站点，因为构建后是静态资源，访问速度快、部署成本低，也方便绑定域名。对于只需要公开展示项目、博客和案例的系统，静态托管可以先解决上线问题。"
    },
    {
      "title": "服务端：API 和 Worker 可以分开部署",
      "body": "RAG API 和 Worker 需要运行在服务端环境，可以选择容器云、Render、Railway、Fly.io、国内服务器或自建 Docker。API 处理请求、权限和任务创建；Worker 专注长任务。两者通过数据库和 Redis/BullMQ 协作，避免文档解析或生成任务阻塞接口。"
    },
    {
      "title": "安全边界：数据库和密钥不能进前端",
      "body": "PostgreSQL、pgvector、Redis、对象存储写权限和模型 key 都属于后端资源。公开前端只应该拿到受控 API，不应该直接暴露数据库地址、模型密钥或对象存储写权限。部署文档里要明确哪些变量放在前端，哪些只放在服务端。"
    },
    {
      "title": "项目路线：从 blog-semi 到 legal-rag",
      "body": "可以先把 blog-semi 部署成静态展示站，证明项目和文章可访问；再把 legal-rag 部署为独立 API + 前端工作台；最后补数据库、队列、对象存储、监控和备份。分层部署的价值是每一层职责清楚，也方便逐步上线。"
    }
  ],
  "takeaways": [
    "展示站适合静态托管，模型调用和数据处理必须走服务端。",
    "AI 应用部署要拆成前端、API、Worker、数据库、Redis 和对象存储。",
    "部署分层清楚，项目才容易从本地演示走向可访问、可维护的系统。"
  ]
}

export default post
