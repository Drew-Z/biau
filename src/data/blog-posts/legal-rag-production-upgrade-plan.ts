import type { BlogPost } from '../blogShared'

const post: BlogPost = {
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
  ],
  "scenarios": [
    "法律文档问答",
    "合同风险审查",
    "RAG 项目生产化",
    "质量面板验收",
    "低权限 demo 演示"
  ],
  "practiceChecklist": [
    "先保留可演示闭环，再替换 parser、vector store、auth 和评测等关键依赖",
    "文档入库要保留 source、page、section、chunkIndex 和 content hash",
    "查询链路要同时处理 query rewrite、vector recall、keyword recall、filter、rerank 和 refusal",
    "合同审查先由规则召回风险，模型只在 schema 校验后改写解释与建议",
    "质量面板要展示 citation 命中、拒答准确率、合同风险召回和 readiness checks",
    "公开 demo 凭据只能是低权限、可回收、可公开的账号，不能写真实后台密码"
  ],
  "sections": [
    {
      "title": "生产化不是推翻 MVP",
      "body": "Legal RAG 的 MVP 价值在于跑通文档导入、chunk、embedding、向量召回、RAG 问答、citations 和合同风险审查闭环。生产化不是把这个闭环推倒重做，而是在保留演示路径的前提下，把易丢失、难审计、不可复盘的部分替换成可持久化、可评测、可授权和可观察的模块。"
    },
    {
      "title": "项目空间：先解决资料边界",
      "body": "法律场景不能把所有文档都放进一个全局知识池。Legal RAG 使用 Project Space 来限定文档、重复检测、召回、问答和合同审查范围；Project Member 和默认项目则让本地 demo 保持简单，同时给多用户演示留下授权边界。后续生产化优先继续补用户表、邀请流程和更细粒度角色，而不是只优化聊天回答。"
    },
    {
      "title": "入库链路：从上传文件到可引用 chunk",
      "body": "导入不只是把文本塞进模型。文本、TXT、PDF、DOCX 或公开安全数据集会经过清洗、项目级 SHA-256 判重、章节感知 chunk、token 估算、embedding 和存储。每个 chunk 都需要保留 source、page、section、chunkIndex 等元数据，后续 citation 才能指向可核验片段。复杂合同还需要继续补 OCR、表格和版式清洗能力。"
    },
    {
      "title": "存储选择：pgvector 让演示可复现",
      "body": "本地 demo 可以使用 mock embedding 和 memory vector store，保证没有模型 key 或数据库时也能运行；线上演示则使用 PostgreSQL + pgvector 持久化 documents、chunks、metadata 和 vectors。这个选择适合中小规模 RAG 第一版：业务数据和向量检索在同一数据库里，部署和备份边界更清楚，重启后知识库不会丢失。"
    },
    {
      "title": "检索链路：不是一次向量搜索就结束",
      "body": "问答链路会先做轻量 query rewrite，处理“它、这个、上述”等追问；然后在当前项目空间内同时执行向量召回和关键词召回，合并候选，再用相似度阈值、关键词命中和轻量 rerank 筛到可回答上下文。资料不足或领域外时应拒答，而不是为了流畅强行生成。"
    },
    {
      "title": "合同审查：规则召回优先，模型只做增强",
      "body": "合同风险审查使用可解释规则作为召回层，覆盖付款节点、验收标准、违约责任、知识产权、争议解决和终止等风险。配置真实 chat model 后，模型可以改写已召回风险的 issue 和 suggestion，但不能新增未召回风险；输出必须通过 schema 校验，失败时回退到规则结果。这样合同审查既能演示 AI 增强，也保留稳定评测基线。"
    },
    {
      "title": "质量面板：把 RAG 效果变成可验收指标",
      "body": "生产化 RAG 需要能解释“这次回答为什么可信”。Legal RAG 的质量面板展示运行模式、模型/向量库状态、知识库规模、RAG eval、contract review eval、readiness checks 和趋势记录。RAG 评测关注 citation 命中、可回答准确率和拒答准确率；合同审查评测关注标注风险召回和缺失风险。这比只看一段模型回答是否顺滑更可靠。"
    },
    {
      "title": "审计与人审：高风险结论要留下轨迹",
      "body": "法律问答和合同审查不是一次性文本生成。项目创建、文档导入、数据集初始化、RAG 问答、合同审查等敏感操作都应记录 audit log，包含 acting user、action、target、summary 和 timestamp。高风险结论、缺引用结论、低置信 OCR 结果或生产 demo 异常，都应该进入人工复核，而不是被自动化流程悄悄吞掉。"
    },
    {
      "title": "部署与 demo gate：可访问不等于完全开放",
      "body": "线上形态可以拆成 Web 静态站、API Web Service、PostgreSQL/pgvector、模型网关和 embedding provider。工作台有登录门禁，是为了保护模型调用、上传接口和数据库资源。如果页面显示公开 demo 凭据，访客只能使用低权限、可回收、可公开的账号；如果没有显示凭据，就仍是受控演示。真实后台密码、模型 key、数据库连接串和部署控制台信息都不能写进公开文章或项目页。"
    },
    {
      "title": "证据边界：本文依据哪些公开材料",
      "body": "本文依据的是公开安全材料：src/data/portfolio.ts 中的 Legal RAG 项目详情，src/data/statusTargets.ts 的 Legal RAG 可靠性检查定义，legal-rag 的 CONTEXT.md、README、docs/architecture.md、docs/demo-script.md、apps/api/package.json、eval/rag-eval-set.json、eval/contract-review-eval-set.json，以及当前 Trellis 任务记录中的低敏本地验证摘要。文章不公开 demo 密码、模型网关、数据库 URL、Render/Supabase 后台配置或真实上传文档。"
    },
    {
      "title": "后续优化方向：从可演示走向可运营",
      "body": "下一轮优先补数据库用户表、邀请和项目成员权限；把 ingestion job 从进程内适配器推进到持久队列；增强 OCR、表格解析和复杂合同结构化；引入更强 rerank；扩充脱敏评测集和趋势报告；把 credentialed synthetic、API health、质量面板和低敏指标接入定时观察。只有这些 gate 收口后，项目页才适合把受保护问答、合同审查和质量面板标成稳定在线。"
    }
  ],
  "takeaways": [
    "Legal RAG 的生产化重点是项目空间、持久化向量库、可解释检索、质量评测和权限边界。",
    "合同审查应由规则召回风险，模型只做 schema 受控的解释增强。",
    "质量面板和 eval set 能让 RAG 从“看起来会回答”变成“可比较、可复盘”。",
    "公开 demo 必须用低权限可回收凭据；没有凭据时入口仍应被描述为受控演示。"
  ]
}

export default post
