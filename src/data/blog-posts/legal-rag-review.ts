import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "legal-rag-review",
  "title": "合同审查 RAG 项目复盘：引用、诊断、评测与受控演示",
  "tag": "AI 应用",
  "column": "project-notes",
  "detail": "复盘 Legal RAG 如何把文档入库、项目空间、引用问答、合同风险审查、质量面板和登录门禁组织成一个可演示、可复核的法律 AI 工作台。",
  "date": "2026-06-11",
  "readTime": "14 min",
  "series": "项目复盘",
  "knowledgePoints": [
    "Legal RAG",
    "引用溯源",
    "合同风险审查",
    "项目空间",
    "质量评测",
    "受控演示"
  ],
  "scenarios": [
    "合同审查演示",
    "企业法务知识库",
    "AI 应用方案评审",
    "RAG 质量复盘",
    "低权限 demo 验收"
  ],
  "practiceChecklist": [
    "先明确合同审查的输入、输出、引用和人工复核边界",
    "把文档入库、RAG 问答、合同审查和质量面板拆成可演示流程",
    "为每个 chunk 保留 source、section、chunkIndex 和引用证据",
    "合同风险先用规则召回，模型增强必须通过 schema 校验",
    "用 eval set 检查 citation 命中、拒答准确率和风险召回",
    "公开演示只使用低权限 demo 凭据，不公开真实后台密码或模型配置"
  ],
  "sections": [
    {
      "title": "项目目标：把 AI 能力放进法务工作流",
      "body": "合同审查不是一个适合“随便问问”的场景。用户上传合同后，系统需要理解条款结构、找出风险、说明判断依据，并让人能够回到原文复核。Legal RAG 的目标不是泛聊天机器人，而是把文档入库、项目空间、引用问答、合同风险项、质量面板和审计记录组织成一条可演示的法务辅助流程。"
    },
    {
      "title": "演示闭环：从知识库到质量面板",
      "body": "推荐演示路径是：先登录受保护工作台，进入知识库初始化公开安全数据集；再切到智能问答，观察 answer、citations、retrieved chunks 和 diagnostics；随后运行示例合同审查，查看风险条款、风险等级、修改建议和引用；最后打开质量面板，核对 runtime、RAG eval、contract review eval、readiness checks 和趋势。这个顺序能让访客看到完整闭环，而不是只看到一段生成文本。"
    },
    {
      "title": "项目空间：法律资料需要作用域",
      "body": "法律文档、客户合同、案件材料和示例数据不能混在一个全局知识池里。Project Space 负责限定文档导入、判重、检索、问答和合同审查范围；默认项目让本地演示保持简单，Project Member 则给多用户和私有项目空间留下权限边界。这个设计让系统以后可以解释“谁在什么项目空间里做了什么 AI 操作”。"
    },
    {
      "title": "入库设计：chunk 不是随意切段",
      "body": "文档可以来自粘贴文本、TXT、PDF、DOCX 或公开安全数据集。入库链路会清洗文本、计算项目级 SHA-256 content hash、按章节/段落切分 chunk，并保留 source、page、section、chunkIndex 和 token 估算。引用溯源依赖这些元数据；如果 chunk 没有清楚来源，后续回答就算语言流畅，也很难被法务人员复核。"
    },
    {
      "title": "问答链路：hybrid recall 和 refusal 比流畅更重要",
      "body": "RAG 问答不是把全文塞进模型。系统会先做轻量问题重写，再在当前项目空间内结合向量召回和关键词召回，经过候选合并、相似度/关键词过滤、轻量 rerank 后生成 grounded answer。资料不足、领域外或引用不够时，正确行为是拒答或说明当前材料不能确认，而不是强行给出法律结论。"
    },
    {
      "title": "合同审查：结构化风险项才方便复核",
      "body": "合同审查输出不应只有一段摘要，而应包含 clause、riskLevel、issue、suggestion、citation、requiresHumanReview 和 analysisSource。规则层先召回付款、交付、违约责任、知识产权、争议解决和终止等风险；模型可在已召回风险上改善解释和建议，但必须通过 schema 校验，失败时回退规则结果。"
    },
    {
      "title": "质量面板：让可信度可见",
      "body": "Legal RAG 的质量面板把运行模式、模型/向量库状态、知识库规模、RAG 评测、合同审查评测和 readiness checks 放在一起。RAG eval 检查 citation 命中、可回答准确率和拒答准确率；contract review eval 检查风险类型召回和缺失风险。这样一次改动能通过指标复盘，而不是靠“这次回答看起来不错”判断。"
    },
    {
      "title": "工程取舍：MVP 也要有可替换边界",
      "body": "为了让项目能无 key 本地运行，MVP 保留 mock embedding 和 memory vector store；线上演示则可以切到 OpenAI-compatible 模型、真实 embedding 和 PostgreSQL + pgvector。Embedding provider、VectorStore、Parser、Reviewer 和 shared types 都要保留清楚接口，才能在不破坏演示闭环的情况下升级 parser、队列、reranker、用户权限和部署形态。"
    },
    {
      "title": "公开演示：登录门禁不是缺陷",
      "body": "线上工作台有登录门禁，是为了保护模型网关、上传接口和 pgvector 数据库资源。公开文章可以说明演示路径和凭据原则，但不能放真实后台/admin 密码。如果需要自助体验，应只配置低权限、可回收、可公开的 demo 凭据，并用 credentialed smoke 检查 health、登录、公开数据集初始化、RAG 问答、合同审查和质量面板。"
    },
    {
      "title": "证据边界：本文依据哪些公开材料",
      "body": "本文依据的是公开安全材料：src/data/portfolio.ts 的 Legal RAG 项目详情，src/data/statusTargets.ts 的可靠性检查定义，legal-rag 的 CONTEXT.md、README、docs/architecture.md、docs/demo-script.md、apps/api/package.json、eval/rag-eval-set.json、eval/contract-review-eval-set.json，以及当前 Trellis 任务记录中的低敏本地验证摘要。文章不公开真实合同、登录密码、模型 key、数据库 URL 或部署后台配置。"
    },
    {
      "title": "后续路线：从演示闭环走向团队试用",
      "body": "下一阶段重点不是把页面再堆多，而是继续补数据库用户表、邀请流程、项目成员权限、持久队列、OCR/表格解析、专门 rerank、更多脱敏评测集、质量趋势和 credentialed synthetic。等低权限 demo 凭据和受保护工作流验收完成后，再把状态页里的问答、合同审查和质量面板从 planned/unchecked 提升为更高可信状态。"
    }
  ],
  "takeaways": [
    "合同审查 RAG 的核心价值是引用可追溯、风险可结构化、结论可复核。",
    "项目空间、ingestion job、audit log 和质量面板让法律 AI 从聊天框走向工作台。",
    "模型增强不能越过规则召回、schema 校验、citation 和人审边界。",
    "公开访问应使用低权限 demo 凭据和 credentialed smoke，不把真实后台密码写进文章。"
  ]
}

export default post
