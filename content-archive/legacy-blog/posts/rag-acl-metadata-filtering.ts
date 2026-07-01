import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "rag-acl-metadata-filtering",
  "title": "RAG 权限过滤：让检索、上下文和引用都遵守访问边界",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "企业 RAG 的权限风险不在页面列表，而在检索链路。本文讨论 document ACL、metadata filter、检索缓存和 citation 展示如何统一。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "ACL",
    "Metadata Filter",
    "引用权限"
  ],
  "scenarios": [
    "企业知识库",
    "多租户 RAG",
    "合同文档权限控制"
  ],
  "practiceChecklist": [
    "查询前计算用户可访问的 document scope",
    "向量检索必须带 tenant/workspace/document/status filter",
    "引用展示再次校验权限，避免检索缓存越权"
  ],
  "sections": [
    {
      "title": "问题背景：权限不能停在前端列表",
      "body": "企业 RAG 的权限不能只靠前端隐藏文档列表。真正的风险发生在检索阶段：如果向量库直接全库 TopK，系统可能召回用户无权限的 chunk，再把它放进模型上下文或 citations。权限过滤必须进入检索、上下文拼接和引用展示全链路。"
    },
    {
      "title": "核心概念：Document ACL 是检索范围的来源",
      "body": "文档级权限可以包括 owner、tenantId、workspaceId、departmentId、role、visibility、status 等字段。用户发起查询时，服务端先根据身份计算可访问 document scope，再把这个 scope 转成 metadata filter，交给向量检索和关键词检索。"
    },
    {
      "title": "检索流程：metadata filter 和向量排序一起工作",
      "body": "向量相似度只判断语义相关，不判断权限。检索时要同时带 tenantId、workspaceId、documentId、status、deletedAt 等过滤条件。PostgreSQL + pgvector 的优势之一，就是可以把 SQL 过滤和向量排序放在同一查询里，减少越权召回。"
    },
    {
      "title": "工程取舍：citation 展示也要二次校验",
      "body": "即使检索阶段做了过滤，引用展示前仍然应该校验 citation 对应的 document 和 chunk 是否可见。原因是缓存、异步任务、权限变更或历史结果可能带来状态变化。citation 卡片必须遵守当前权限，而不是历史权限。"
    },
    {
      "title": "缓存设计：权限范围必须进入 key",
      "body": "检索结果缓存不能只按 query 缓存，要带 tenantId、workspaceId、documentScopeHash、filter 和权限版本。否则用户 A 的检索结果可能被用户 B 复用。权限变化后，相关缓存也应该失效。"
    },
    {
      "title": "验证方法：用跨租户相似文档做回归",
      "body": "可以准备两个租户、两个用户和多份相似文档，用同样问题查询。测试目标是：用户只能召回自己有权限的文档；权限撤销后旧引用不可见；缓存不会跨租户复用；人工复核后台也遵守相同 ACL。"
    }
  ],
  "takeaways": [
    "RAG 权限控制必须进入检索、上下文拼接和引用展示全链路。",
    "向量检索要结合 document ACL 和 metadata filter。",
    "缓存和历史结果也要考虑权限变化，不能只在上传时校验。"
  ]
}

export default post
