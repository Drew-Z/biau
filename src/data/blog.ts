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
    "title": "Legal RAG 生产化路线：项目空间、pgvector、评测与受控演示",
    "tag": "项目复盘",
    "column": "project-notes",
    "detail": "Legal RAG 已经从 MVP 闭环推进到更接近可交付原型：项目空间、异步入库、pgvector、hybrid recall、合同审查评测、质量面板和受控 demo gate 都需要一起看。",
    "date": "2026-06-20",
    "readTime": "14 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "RAG 生产化",
      "项目空间",
      "pgvector 持久化",
      "Hybrid Retrieval",
      "质量评测",
      "受控演示"
    ]
  },
  {
    "slug": "ozon-erp-architecture",
    "title": "电商 ERP 架构：后台、队列、插件与审计如何协同",
    "tag": "全栈开发",
    "column": "project-notes",
    "detail": "电商 ERP 的价值不在页面数量，而在业务对象、注册/登录边界、任务状态、平台写入和审计闭环。本文复盘后台、API、Worker、插件和数据库如何形成可演示的运营系统。",
    "date": "2026-06-12",
    "readTime": "12 min",
    "series": "项目案例",
    "knowledgePoints": [
      "业务建模",
      "异步任务",
      "注册登录边界",
      "浏览器插件",
      "操作审计",
      "演示 Gate"
    ]
  },
  {
    "slug": "pet-workspace-pipeline",
    "title": "AI 桌宠工程：社区 App、生成管线与 APK 发布门禁",
    "tag": "AI 应用",
    "column": "project-notes",
    "detail": "AI 桌宠项目不能只展示生成效果，还要说明 Android App、Community API、人审发布、pet.zip 契约和 APK gate 如何协同。本文复盘 Pet Workspace 当前可展示的工程边界。",
    "date": "2026-06-14",
    "readTime": "14 min",
    "series": "项目案例",
    "knowledgePoints": [
      "WIP 工程展示",
      "Community API",
      "Android 社区 App",
      "人审发布",
      "pet.zip 契约",
      "APK 发布门禁"
    ]
  },
  {
    "slug": "xunqiu-android64-rebuild",
    "title": "Android 历史项目重构：64 位客户端、接口复用与阶段验收",
    "tag": "移动端",
    "column": "project-notes",
    "detail": "历史移动端项目的难点不只是补页面，而是识别旧依赖、接口边界、现代后端、发布风险和公开展示边界。本文复盘寻球 64 位客户端与 Spring Boot 后端重建路线。",
    "date": "2026-06-15",
    "readTime": "12 min",
    "series": "项目案例",
    "knowledgePoints": [
      "Android 64 位迁移",
      "历史系统接手",
      "旧接口兼容",
      "Spring Boot 3",
      "阶段 APK",
      "迁移验收"
    ]
  },
  {
    "slug": "game-showcase-standard",
    "title": "游戏项目展示系统：玩法模型、试玩入口与版本证据",
    "tag": "游戏项目",
    "column": "project-notes",
    "detail": "游戏项目展示不能只放源码和截图。本文复盘 BIAU Playlab 如何用玩法模型、试玩入口、截图证据、版本状态和外链检查，把多个 Godot 原型整理成可体验案例。",
    "date": "2026-06-13",
    "readTime": "11 min",
    "series": "项目案例",
    "knowledgePoints": [
      "互动项目展示",
      "Godot Web 导出",
      "试玩入口",
      "截图证据",
      "版本状态",
      "外链巡检"
    ]
  },
  {
    "slug": "content-modeling-project-site",
    "title": "内容模型设计：项目、资源与博客如何分层",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "产品化展示站点不能把所有内容塞进一个页面。本文从实体、索引、正文加载、策展、关联和质量门禁出发，说明项目站如何建立稳定内容模型。",
    "date": "2026-06-20",
    "readTime": "12 min",
    "series": "公开站点与内容系统",
    "knowledgePoints": [
      "内容实体建模",
      "摘要索引",
      "正文 Loader",
      "公开策展",
      "项目关联",
      "助手索引",
      "质量门禁"
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
