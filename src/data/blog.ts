import type { BlogPostSummary } from './blogShared'

export { blogColumnMeta, blogColumnOrder } from './blogShared'
export type { BlogColumn, BlogPostSummary } from './blogShared'

export const blogPosts: BlogPostSummary[] = [
  {
    "slug": "legal-rag-review",
    "title": "合同审查 RAG 项目复盘：从可演示 MVP 到生产化路线",
    "tag": "AI 应用",
    "column": "project-notes",
    "detail": "复盘法律智能机器人与合同审查项目的设计思路：如何从文档导入、条款切分、引用问答和风险审查，走向可解释、可复核、可迭代的 AI 应用。",
    "date": "2026-06-11",
    "readTime": "12 min",
    "series": "项目复盘",
    "knowledgePoints": [
      "Legal RAG",
      "合同风险审查",
      "AI 应用 MVP"
    ]
  },
  {
    "slug": "legal-rag-production-upgrade-plan",
    "title": "Legal RAG 生产化改造路线：从 MVP 闭环到可交付原型",
    "tag": "项目复盘",
    "column": "project-notes",
    "detail": "Legal RAG 已经跑通演示闭环，下一步要补文档解析、pgvector、队列、人审、评估和部署。本文把升级路线拆成可执行阶段。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "项目改造清单",
      "RAG 生产化",
      "交付路线"
    ]
  },
  {
    "slug": "ozon-erp-architecture",
    "title": "电商 ERP 架构：后台、队列、插件与审计如何协同",
    "tag": "全栈开发",
    "column": "project-notes",
    "detail": "电商 ERP 的价值不在页面数量，而在业务对象、任务状态、平台写入和审计闭环。本文讨论后台、API、Worker、插件和数据库如何形成可运营系统。",
    "date": "2026-06-12",
    "readTime": "9 min",
    "series": "项目案例",
    "knowledgePoints": [
      "业务建模",
      "异步任务",
      "操作审计"
    ]
  },
  {
    "slug": "pet-workspace-pipeline",
    "title": "AI 生成管线：任务编排、QA Gate 与 App 发布边界",
    "tag": "AI 应用",
    "column": "project-notes",
    "detail": "生成类 AI 项目不能停在单次出图。本文讨论如何把生成任务、自动质检、人工复核、发布记录和 App API 组织成可控管线。",
    "date": "2026-06-14",
    "readTime": "11 min",
    "series": "项目案例",
    "knowledgePoints": [
      "AI 生成管线",
      "QA Gate",
      "App API 契约"
    ]
  },
  {
    "slug": "xunqiu-android64-rebuild",
    "title": "Android 历史项目重构：64 位客户端、接口复用与阶段验收",
    "tag": "移动端",
    "column": "project-notes",
    "detail": "历史移动端项目的难点不只是补页面，而是识别旧依赖、接口边界和发布风险。本文讨论新建 64 位客户端、复用协议和沉淀验收证据的路线。",
    "date": "2026-06-15",
    "readTime": "10 min",
    "series": "项目案例",
    "knowledgePoints": [
      "Android 64 位迁移",
      "历史系统接手",
      "接口脱敏"
    ]
  },
  {
    "slug": "game-showcase-standard",
    "title": "游戏项目展示系统：玩法模型、试玩入口与版本证据",
    "tag": "游戏项目",
    "column": "project-notes",
    "detail": "游戏项目展示不能只放源码和截图。本文讨论如何用玩法模型、操作说明、试玩入口、截图证据和版本状态，让原型被理解成可体验项目。",
    "date": "2026-06-13",
    "readTime": "8 min",
    "series": "项目案例",
    "knowledgePoints": [
      "互动项目展示",
      "Godot Web 导出",
      "版本证据"
    ]
  },
  {
    "slug": "content-modeling-project-site",
    "title": "内容模型设计：项目、资源与博客如何分层",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "产品化展示站点不能把所有内容塞进一个页面。本文讨论如何把项目、资源、博客、案例和试玩入口拆成稳定内容模型。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "公开站点与内容系统",
    "knowledgePoints": [
      "内容模型",
      "信息架构",
      "站点数据治理"
    ]
  },
  {
    "slug": "public-content-governance",
    "title": "公开内容治理：技术案例如何脱敏、分层与版本化",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "公开站点既要展示能力，也要控制信息边界。本文用分层模型、脱敏矩阵、人工 gate 和低敏证据说明技术案例如何安全公开。",
    "date": "2026-06-20",
    "readTime": "12 min",
    "series": "公开站点与内容系统",
    "knowledgePoints": [
      "公开内容分层",
      "脱敏矩阵",
      "敏感信息边界",
      "人工 Gate",
      "低敏证据",
      "状态语言",
      "版本化发布"
    ]
  },
  {
    "slug": "static-site-release-verification",
    "title": "静态站发布验证：构建、缓存、资源指纹与线上检查",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "静态站上线不只是 push 代码。本文把发布验证拆成构建层、内容层、入口层、资源层、外链层和状态层，说明如何用低敏证据确认发布真的生效。",
    "date": "2026-06-20",
    "readTime": "12 min",
    "series": "公开站点与内容系统",
    "knowledgePoints": [
      "静态站部署分层",
      "构建产物验证",
      "资源指纹与缓存",
      "内容安全扫描",
      "外链巡检",
      "低敏状态快照"
    ]
  },
  {
    "slug": "blog-content-system-build-log",
    "title": "博客内容系统构建手记：从清理旧文章到栏目化流水线",
    "tag": "构建手记",
    "column": "build-log",
    "detail": "复盘本站博客从批量生成内容清理、公开策展、栏目迁移，到建立内容生产 skill 的过程：先收口公开面，再把写作变成可验证的流水线。",
    "date": "2026-07-01",
    "readTime": "10 min",
    "series": "站点构建手记",
    "knowledgePoints": [
      "内容系统治理",
      "BlogColumn 栏目模型",
      "AI 写作流水线"
    ]
  },
  {
    "slug": "agentic-rag-frontier-2026",
    "title": "2026 年的 RAG 不再只是检索：Agentic RAG、混合检索与 GraphRAG 的知识地图",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "从问题路由、上下文 chunk、混合召回、融合排序、证据评估、纠错检索、GraphRAG 边界到 eval 与观测，梳理前沿 RAG 架构为什么从“向量 top-k”走向可控的证据系统。",
    "date": "2026-07-04",
    "readTime": "16 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Naive RAG",
      "Agentic RAG",
      "Adaptive-RAG",
      "Self-RAG",
      "CRAG",
      "Contextual Retrieval",
      "Hybrid Retrieval",
      "Dense/Sparse Fusion",
      "RRF/DBSF",
      "Rerank",
      "Evidence Judge",
      "GraphRAG",
      "RAG Evaluation",
      "Retrieval Observability",
      "RAG Eval Set"
    ]
  }
]
