import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "multi-tenant-rag-isolation",
  "title": "多租户 RAG 数据隔离：避免向量检索跨边界召回",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "企业 RAG 的安全底线是不能跨租户、跨工作区、跨权限召回数据。本文讨论 tenantId、metadata filter、缓存隔离和跨租户测试。",
  "date": "2026-06-20",
  "readTime": "11 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "多租户隔离",
    "Metadata Filter",
    "数据权限"
  ],
  "scenarios": [
    "企业知识库",
    "合同文档管理",
    "SaaS 型 RAG 应用"
  ],
  "practiceChecklist": [
    "document、chunk、embedding、job 和 audit 都保存 tenantId/workspaceId",
    "检索前先做权限过滤，再做向量相似度和 rerank",
    "构造跨租户相似文档测试，确保不能召回无权限数据"
  ],
  "sections": [
    {
      "title": "概念：语义相似不能越过数据边界",
      "body": "企业 RAG 不是个人笔记搜索，通常会服务多个客户、团队、项目或部门。不同租户的数据绝不能互相召回。即使模型回答看起来合理，只要引用来自错误租户，就是严重的数据泄露，系统也不具备交付条件。"
    },
    {
      "title": "流程：隔离信息进入全链路",
      "body": "document、chunk、embedding、job、auditLog 都应该包含 tenantId、workspaceId 或 ownerId。上传、解析、embedding、检索、rerank、引用展示和日志查看都要携带当前用户的数据边界，而不是只在前端过滤一次。"
    },
    {
      "title": "工程取舍：先过滤，再检索",
      "body": "向量检索不能直接全库 TopK。正确做法是先根据用户身份和资源权限限定 tenant、workspace、document status，再在这个范围内做向量相似度和 rerank。PostgreSQL + pgvector 的优势之一，就是可以把 SQL 权限过滤和向量查询放在同一层处理。"
    },
    {
      "title": "缓存和日志：隔离不只发生在数据库",
      "body": "多租户不仅影响查询，也影响缓存、embedding 任务、评测样例和日志查看。相似问题缓存不能跨租户复用，检索结果缓存要带 tenant key，日志平台也要避免把其他租户的文档片段暴露给无权限人员。"
    },
    {
      "title": "项目例子：单租户 MVP 如何升级",
      "body": "legal-rag 可以先作为单租户 MVP 展示导入、检索和引用闭环；生产化时补 tenantId、workspaceId、document ACL 和 metadata filter。Ozon ERP 的店铺、用户、角色和审计经验也可以迁移到多租户 RAG 的权限模型里。"
    },
    {
      "title": "验证：跨租户相似文档测试",
      "body": "可以准备两个租户，各上传一份主题相似但金额、条款或责任主体不同的合同，然后用相同问题查询。系统必须只召回当前租户文档，不能因为语义相似而拿到另一个租户的 chunk。权限测试应该成为 RAG 回归测试的一部分。"
    }
  ],
  "takeaways": [
    "企业 RAG 必须把租户隔离放进上传、检索、引用和日志全链路。",
    "向量检索要先做权限和 metadata filter，再做相似度排序。",
    "跨租户相似文档测试是 RAG 生产化前必须补的安全验证。"
  ]
}

export default post
