import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "enterprise-knowledge-base-operations",
  "title": "企业知识库运营：文档生命周期、权限变更与内容质量",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "RAG 上线后，知识库还会过期、变权和积累低质量内容。本文讨论文档 owner、状态、过期提醒、权限联动和内容质量指标。",
  "date": "2026-06-20",
  "readTime": "9 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "知识库运营",
    "文档生命周期",
    "内容质量"
  ],
  "scenarios": [
    "企业知识库维护",
    "合同库运营",
    "制度文件问答"
  ],
  "practiceChecklist": [
    "为文档设置 owner、status、expireAt 和 reviewCycle",
    "权限变化后更新索引和缓存",
    "定期清理过期、低质量和无人负责的文档"
  ],
  "sections": [
    {
      "title": "问题背景：知识库上线后才是真正开始",
      "body": "RAG 项目不是把文档导进去就结束。企业文档会过期、权限会变化、制度会更新、负责人会变更。如果没有运营机制，知识库很快会变成旧资料集合，模型回答也会越来越不可靠。"
    },
    {
      "title": "生命周期：每份文档都要有状态和负责人",
      "body": "文档应该有 owner、status、createdAt、updatedAt、expireAt、reviewCycle 和 source。常见状态包括 draft、active、expired、archived、deleted。查询默认只使用 active 文档，过期文档需要提醒负责人复核。"
    },
    {
      "title": "权限联动：变更必须影响检索和缓存",
      "body": "当员工离职、部门调整、租户权限变化或文档从公开改为私有时，RAG 检索范围和缓存都要更新。权限变更不是只改文档列表，还要影响 metadata filter、citation 展示和检索缓存失效。"
    },
    {
      "title": "质量运营：内容质量要可见",
      "body": "知识库可以记录文档解析成功率、被引用次数、用户反馈、无答案次数、引用错误反馈和人工修正次数。长期无人使用、经常被反馈错误或解析质量低的文档，需要重新清洗、归档或下线。"
    },
    {
      "title": "组织责任：内容 owner 不能缺位",
      "body": "企业知识库需要内容 owner，而不是完全交给技术系统。owner 负责确认文档是否有效、是否过期、是否允许被 AI 使用。系统负责提醒、记录和执行权限边界。"
    },
    {
      "title": "评估闭环：运营数据反向指导补文档",
      "body": "知识库运营数据可以反向进入评估体系。经常被问却答不出的主题，说明需要补文档；经常引用错误的文档，说明需要改 chunk 或清洗；经常过期的制度，说明需要建立复核周期。"
    }
  ],
  "takeaways": [
    "企业知识库需要长期运营，不是一次性入库。",
    "文档生命周期、权限变更和缓存失效要联动。",
    "内容质量指标能帮助判断哪些文档需要更新、清洗或下线。"
  ]
}

export default post
