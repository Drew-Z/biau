import type { BlogPostSummary } from './blogShared'

export { blogColumnMeta, blogColumnOrder } from './blogShared'
export type { BlogColumn, BlogPostSummary } from './blogShared'

export const blogPosts: BlogPostSummary[] = [
  {
    "slug": "ai-fullstack-day-01-rag-overview",
    "title": "RAG 系统入门：从检索增强生成到合同审查应用",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "从业务问题出发理解 RAG：它为什么不是一个聊天框，如何通过文档入库、检索召回、引用溯源和人工复核支撑合同审查类应用。",
    "date": "2026-06-20",
    "readTime": "12 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "检索增强生成",
      "文档入库与 chunk 切分",
      "向量检索与引用溯源"
    ]
  },
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
    "slug": "rag-chunk-strategy",
    "title": "RAG 文档切分策略：Chunk Size、Overlap 与元数据设计",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "文档切分决定了 RAG 能否检索到正确证据。本文围绕 chunk size、overlap、结构化元数据和合同条款切分，整理一套可落地的设计方法。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Chunk 切分策略",
      "Chunk overlap",
      "来源元数据设计"
    ]
  },
  {
    "slug": "embedding-vector-search",
    "title": "Embedding 与向量检索：让业务文本进入语义搜索系统",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "Embedding 让文本可以参与相似度计算，但向量检索不是全部答案。本文从概念、流程、工程取舍和合同审查项目例子，梳理语义检索如何落地。",
    "date": "2026-06-20",
    "readTime": "11 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Embedding",
      "向量相似度检索",
      "向量库选型"
    ]
  },
  {
    "slug": "agent-tool-calling-engineering",
    "title": "Agent Tool Calling 工程化：从聊天回答到可控任务执行",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "Agent 的难点不是让模型多说几句话，而是让模型在受控边界内调用工具、推进状态、处理失败，并把高风险动作交给权限和人工复核。",
    "date": "2026-06-20",
    "readTime": "12 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Agent",
      "Tool Calling",
      "状态与失败处理"
    ]
  },
  {
    "slug": "rag-hybrid-search",
    "title": "混合检索：让 RAG 同时抓住语义与精确事实",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "向量检索擅长语义召回，关键词检索擅长精确命中。本文讨论如何把两者组合起来，让 RAG 在合同、政策和企业知识库场景中更可靠。",
    "date": "2026-06-20",
    "readTime": "11 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Hybrid Search",
      "BM25 / 关键词检索",
      "结果合并去重"
    ]
  },
  {
    "slug": "rag-rerank",
    "title": "Rerank 精排：从初召回到高质量上下文",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 的初召回只负责找候选，Rerank 负责把真正能支撑回答的证据排到前面。本文讨论精排在上下文质量和引用准确性中的作用。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "初召回",
      "精排",
      "上下文质量控制"
    ]
  },
  {
    "slug": "rag-citations-grounding",
    "title": "引用溯源设计：让 AI 回答回到原文证据",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 的可信度不只取决于答案是否流畅，更取决于答案能否回到原文。本文整理 citation 字段、前端展示和低幻觉输出策略。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Citations",
      "Grounding",
      "低幻觉回答"
    ]
  },
  {
    "slug": "rag-evaluation",
    "title": "RAG 评估体系：召回、引用和答案如何一起验收",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 系统不能只凭“答案看起来不错”验收。本文整理 golden set、召回命中、citation 命中率和错误案例复盘的评估方法。",
    "date": "2026-06-20",
    "readTime": "11 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Golden Set",
      "召回评估",
      "Citation 命中率"
    ]
  },
  {
    "slug": "ai-cost-optimization",
    "title": "AI 成本优化：Token 预算、缓存和模型分级",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "AI 应用进入真实使用后，成本会来自 token、检索、rerank、重试和生成任务。本文整理如何用预算、缓存和模型分级控制成本。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Token 成本",
      "缓存复用",
      "模型分级"
    ]
  },
  {
    "slug": "sse-streaming-ai-progress",
    "title": "SSE 流式交互：AI 应用如何把生成过程交给用户",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 问答、合同审查和生成管线都不是瞬时完成的请求。本文讨论如何用 SSE 推送文本流、阶段进度和最终状态，让长任务可感知、可恢复。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "SSE",
      "流式响应",
      "任务进度推送"
    ]
  },
  {
    "slug": "bullmq-ai-long-tasks",
    "title": "BullMQ 长任务队列：让 AI 文档处理和生成管线跑稳",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 应用里的文档解析、embedding、批量审查和素材生成都不适合同步请求。本文讨论如何用 BullMQ 设计任务状态、重试、幂等和失败恢复。",
    "date": "2026-06-20",
    "readTime": "11 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "BullMQ",
      "Worker",
      "幂等与重试"
    ]
  },
  {
    "slug": "pgvector-rag-production",
    "title": "pgvector 落地方案：中小型 RAG 项目如何持久化向量",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 从内存 Demo 走向可交付系统，必须解决文档、chunk、embedding 和权限过滤的持久化问题。本文讨论 PostgreSQL + pgvector 的落地方式。",
    "date": "2026-06-20",
    "readTime": "11 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "pgvector",
      "PostgreSQL",
      "向量持久化"
    ]
  },
  {
    "slug": "structured-output-validation",
    "title": "结构化输出校验：让 AI 结果从文本变成可用数据",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "AI 结果要进入业务系统，必须从自然语言变成可校验、可存储、可展示的数据。本文讨论 JSON Schema、服务端校验、失败重试和人工复核。",
    "date": "2026-06-20",
    "readTime": "11 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Structured Output",
      "Schema 校验",
      "失败重试"
    ]
  },
  {
    "slug": "langgraph-agent-state-machine",
    "title": "Agent 状态机设计：用 LangGraph 思路拆解复杂工作流",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "复杂 Agent 不能只靠一段大 prompt 推进。本文用 LangGraph 的 State、Node、Edge、条件路由和 checkpoint 思路，说明如何让 Agent 可追踪、可恢复。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "StateGraph",
      "条件路由",
      "Checkpoint"
    ]
  },
  {
    "slug": "human-in-the-loop-review",
    "title": "Human-in-the-loop 设计：高风险 AI 应用如何接入人工复核",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "法律结论、合同风险、生成内容发布和外部平台写入都不能完全交给模型。本文讨论人工复核的触发规则、状态设计、审计记录和反馈闭环。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Human-in-the-loop",
      "人工复核",
      "审核审计"
    ]
  },
  {
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
    ]
  },
  {
    "slug": "ai-app-production-roadmap",
    "title": "AI 应用生产化路线：从可演示 MVP 到可交付系统",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "AI MVP 证明的是链路能跑通，生产化系统要证明能被别人稳定使用。本文梳理模型、数据、队列、权限、评估、监控和交付材料的升级路线。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "MVP 生产化",
      "工程闭环",
      "交付清单"
    ]
  },
  {
    "slug": "ai-tool-permission-audit",
    "title": "AI 工具调用权限与审计：让 Agent 行动保持可控",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "Agent 能调用工具后，风险从“答错”升级为“做错”。本文讨论后端权限校验、PendingAction、审计日志和高风险动作确认如何共同构成安全边界。",
    "date": "2026-06-20",
    "readTime": "11 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "权限控制",
      "审计日志",
      "高风险动作确认"
    ]
  },
  {
    "slug": "prompt-version-management",
    "title": "Prompt 版本管理：让提示词迭代可评估、可回滚",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "提示词不是一次性字符串，而是影响 AI 质量的工程资产。本文讨论 promptVersion、模板变量、评测回归、灰度发布和异常回滚。",
    "date": "2026-06-20",
    "readTime": "11 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Prompt 版本",
      "评测回归",
      "灰度与回滚"
    ]
  },
  {
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
    ]
  },
  {
    "slug": "frontend-ai-workbench",
    "title": "前端 AI 工作台设计：把证据、状态和人工决策放到同一界面",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "真实 AI 应用不只是聊天框。本文讨论工作台如何展示输入、证据、AI 结论、任务状态、人工复核和高风险操作，让人机协作可解释。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "AI 工作台",
      "可解释交互",
      "人机协作"
    ]
  },
  {
    "slug": "ai-observability-trace-cost-quality",
    "title": "AI 应用可观测性：用 Trace 串起日志、成本和质量指标",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 应用上线后不能只看接口错误率。本文讨论如何用 traceId 串起检索、模型、工具、队列、成本、引用质量和人工复核数据。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Observability",
      "Trace",
      "质量指标"
    ]
  },
  {
    "slug": "model-fallback-timeout-provider-switch",
    "title": "模型降级与供应商切换：让 AI 调用失败时可恢复",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "模型服务会超时、限流、返回异常或效果波动。本文讨论 timeout、错误分类、retry、fallback、provider 抽象和人工接管如何保证可用性。",
    "date": "2026-06-20",
    "readTime": "11 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Fallback",
      "超时重试",
      "Provider 抽象"
    ]
  },
  {
    "slug": "ai-data-desensitization-privacy",
    "title": "AI 数据脱敏与隐私边界：控制模型输入、日志和引用片段",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "AI 应用会把用户输入、检索上下文、prompt、模型输出和日志串起来。本文讨论如何最小化模型输入、脱敏日志、控制引用片段和人审权限。",
    "date": "2026-06-20",
    "readTime": "11 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "数据脱敏",
      "隐私边界",
      "日志最小化"
    ]
  },
  {
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
    ]
  },
  {
    "slug": "rag-data-cleaning-pdf-docx-ocr",
    "title": "RAG 数据清洗：PDF、DOCX 与 OCR 文本如何变成可靠证据",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 的质量上限往往在入库前就被决定。本文讨论 PDF、DOCX、OCR 解析后的噪声清理、结构保留、表格处理和引用回溯。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "数据清洗",
      "PDF/DOCX/OCR",
      "文档结构保留"
    ]
  },
  {
    "slug": "legal-rag-golden-set-evaluation",
    "title": "合同审查 Golden Set：让 RAG 质量从演示走向可评估",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "合同审查不能只靠临场演示判断效果。本文讨论如何设计标准问题、标准引用、风险标签和人工复核样例，让 RAG 优化有回归基准。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Golden Set",
      "合同审查评测",
      "回归测试"
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
    "slug": "llm-context-window-management",
    "title": "模型上下文管理：System Prompt、历史消息与检索证据如何分配",
    "tag": "AI 应用",
    "column": "project-notes",
    "detail": "模型上下文不是越多越好。本文讨论如何为系统指令、历史消息、检索证据、工具结果和输出约束分配 token 预算。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "上下文窗口",
      "历史消息裁剪",
      "检索上下文预算"
    ]
  },
  {
    "slug": "rag-query-rewrite-routing",
    "title": "RAG Query Rewrite：把口语问题变成可检索查询",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "用户问题常常口语化、范围不清或依赖上下文。本文讨论问题改写、意图识别和检索路由如何提升 RAG 召回质量。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Query Rewrite",
      "意图识别",
      "检索路由"
    ]
  },
  {
    "slug": "prompt-template-variable-design",
    "title": "Prompt 模板设计：把变量、约束和输出格式拆清楚",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "Prompt 不应该是随手拼接的长字符串。本文讨论如何拆分模板、动态变量、任务约束、few-shot 示例和输出 schema。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Prompt 模板",
      "变量注入",
      "输出约束"
    ]
  },
  {
    "slug": "rag-cache-strategy",
    "title": "RAG 缓存策略：Embedding、检索结果和答案如何安全复用",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 缓存能降低成本和延迟，但也可能带来权限、版本和旧答案风险。本文讨论 documentHash、embedding 缓存、检索缓存、答案缓存和失效策略。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "缓存策略",
      "Embedding 复用",
      "缓存失效"
    ]
  },
  {
    "slug": "document-parser-selection-rag",
    "title": "RAG 文档解析器选型：PDF、DOCX、OCR 与 Markdown 如何接入",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 的第一步不是 embedding，而是把业务文档变成可检索、可引用的文本结构。本文讨论不同格式的解析路线、结构保留和失败处理。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "文档解析",
      "格式结构保留",
      "解析失败处理"
    ]
  },
  {
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
    ]
  },
  {
    "slug": "multimodal-rag-images-tables",
    "title": "多模态 RAG：图片、扫描件与表格如何变成可引用证据",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "企业资料经常混合图片、扫描件和表格。本文讨论 OCR、视觉描述、表格结构化和原始位置回溯如何支撑可信检索。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "多模态 RAG",
      "OCR",
      "表格结构化"
    ]
  },
  {
    "slug": "agent-memory-state-design",
    "title": "Agent 记忆系统：短期记忆、长期记忆与任务状态的边界",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "Agent 应用不能把历史消息、用户偏好和任务进度都塞进 memory。本文拆解三类状态的生命周期、存储方式和权限边界。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Agent Memory",
      "任务状态",
      "长期记忆"
    ]
  },
  {
    "slug": "tool-calling-idempotency",
    "title": "Tool Calling 幂等性：Agent 重试时如何避免重复写入",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "Agent 调用工具会遇到重试、超时和重复提交。本文讨论 idempotencyKey、数据库约束、外部平台写入和人工确认如何让重试变安全。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "幂等性",
      "Tool Calling",
      "重复写入控制"
    ]
  },
  {
    "slug": "ai-error-handling-retry-human",
    "title": "AI 应用错误处理：可重试错误、不可重试错误和人工接管",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "AI 应用的失败可能来自文件、检索、模型、工具和权限。本文讨论如何分类错误，并在重试、降级与人工接管之间做工程决策。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "错误分类",
      "重试策略",
      "人工接管"
    ]
  },
  {
    "slug": "frontend-citation-interaction",
    "title": "前端引用交互：citation 卡片、原文定位与风险说明设计",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "RAG 的可信度需要被前端呈现出来。本文讨论 citation 卡片、原文定位、风险说明、低置信度提示和反馈闭环如何设计。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Citation UI",
      "原文定位",
      "风险说明"
    ]
  },
  {
    "slug": "ai-application-testing-strategy",
    "title": "AI 应用测试策略：单元测试、Golden Set 与人工验收",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 输出不稳定不代表系统无法测试。本文讨论确定性代码、RAG 评测集、工具调用链路和人工验收如何组合成质量体系。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "AI 测试策略",
      "Golden Set",
      "人工验收"
    ]
  },
  {
    "slug": "rag-data-versioning",
    "title": "RAG 数据版本：文档、Chunk 与 Embedding 如何支持回溯",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "文档会更新，切分策略和 embedding 模型也会升级。本文讨论 documentVersion、chunkVersion、embeddingVersion 和 reindex 任务如何支撑审计。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "数据版本",
      "重新索引",
      "版本兼容"
    ]
  },
  {
    "slug": "vector-index-tuning-hnsw-ivfflat",
    "title": "向量索引调优：从精确查询到 HNSW 与 IVFFlat",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "向量检索从小规模精确查询走向近似索引时，必须同时关注召回、延迟、过滤条件和维护成本。本文讨论 HNSW 与 IVFFlat 的取舍。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "向量索引",
      "HNSW",
      "IVFFlat"
    ]
  },
  {
    "slug": "file-upload-security-ai",
    "title": "文件上传安全：大小限制、类型校验、病毒扫描和异步处理",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "RAG 文档上传是知识库的入口风险。本文讨论文件大小、类型校验、内容嗅探、隔离存储、扫描和异步入库如何协同。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "文件上传安全",
      "内容校验",
      "异步处理"
    ]
  },
  {
    "slug": "ai-result-export-reports",
    "title": "AI 结果导出：从结构化报告到 Markdown、PDF 与 DOCX",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 审查结果进入业务流程时，需要稳定导出为可阅读、可归档、可编辑的材料。本文讨论报告模型、格式选择和版本记录。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "报告导出",
      "合同审查报告",
      "引用附件"
    ]
  },
  {
    "slug": "model-provider-abstraction",
    "title": "模型供应商抽象：让生成、Embedding 与 Rerank 可切换",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "AI 应用不应该把业务逻辑绑死在单一 SDK 上。本文讨论 provider 抽象、OpenAI-compatible 接口、本地模型和模型切换评估。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Provider 抽象",
      "模型切换",
      "OpenAI-compatible"
    ]
  },
  {
    "slug": "rag-batch-jobs-priority",
    "title": "RAG 批量任务设计：Batch、Job、Step 与优先级",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "多文档入库和批量合同审查需要任务化处理。本文讨论 Batch、Job、Step 三层结构、并发限制、失败恢复和成本控制。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "批量任务",
      "任务优先级",
      "队列调度"
    ]
  },
  {
    "slug": "human-review-feedback-loop",
    "title": "人审反馈闭环：把审核结果变成系统改进数据",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "Human-in-the-loop 不只是让人点通过。本文讨论审核记录如何沉淀为规则、Prompt 调整、Golden Set 和质量指标。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "人审反馈",
      "质量闭环",
      "评测样例沉淀"
    ]
  },
  {
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
    ]
  },
  {
    "slug": "runtime-config-center",
    "title": "运行时配置中心：模型、Prompt 与检索参数的灰度调整",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "模型、Prompt 和检索参数上线后会持续调整。本文讨论运行时配置的作用域、审计、灰度、回滚和前端调试配合。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "运行时配置",
      "动态参数",
      "灰度发布"
    ]
  },
  {
    "slug": "ai-safety-guardrails",
    "title": "AI 安全护栏：从输入拦截到工具调用边界",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "AI 安全不是一个敏感词列表。本文讨论输入识别、检索权限、工具最小权限、输出审核和可解释拦截如何组成完整护栏。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "安全护栏",
      "权限边界",
      "输出审核"
    ]
  },
  {
    "slug": "ai-database-modeling",
    "title": "AI 应用数据库建模：Document、Chunk、Embedding 与审计表",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 应用不只有聊天记录。本文从 Document、Chunk、Embedding、Job、AuditLog 和 Feedback 出发，讨论可追踪的数据边界。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "数据库建模",
      "RAG 数据结构",
      "审计日志"
    ]
  },
  {
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
    ]
  },
  {
    "slug": "rag-retrieval-debugging",
    "title": "RAG 召回失败排查：从入库到 Citation 的逐层定位",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 召回失败可能发生在入库、过滤、召回、精排或生成阶段。本文给出从无结果到错引用的逐层排查路径。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "RAG 排障",
      "召回质量",
      "检索评估"
    ]
  },
  {
    "slug": "agent-planning-debugging",
    "title": "Agent 规划失败排查：循环调用、错误工具与目标漂移",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "Agent 失败通常不是模型突然变差，而是状态、工具、权限或目标约束出了问题。本文讨论 trace、状态机和人工接管的排查方法。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Agent 排障",
      "任务规划",
      "工具调用"
    ]
  },
  {
    "slug": "ai-cost-budget-sheet",
    "title": "AI 成本预算表：模型、Token、OCR、存储与人审",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "AI 成本来自完整业务链路，而不只是一次模型回答。本文把入库、查询、生成、导出和人工审核拆成可估算预算表。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "成本预算",
      "Token 成本",
      "资源配额"
    ]
  },
  {
    "slug": "ai-release-checklist",
    "title": "AI 应用发布检查清单：质量、安全、成本与回滚",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 应用上线不能只看页面能否点击。本文把 RAG 质量、Agent 安全、权限隔离、监控成本、降级和回滚纳入发布检查。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "发布检查",
      "质量门禁",
      "上线准备"
    ]
  },
  {
    "slug": "ai-access-control-model",
    "title": "AI 应用权限模型：租户、工作区、角色与资源 ACL",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 权限模型必须覆盖资料检索和工具调用。本文讨论 tenant、workspace、RBAC、ACL、metadata filter 和 action scope 如何统一。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "权限模型",
      "多租户隔离",
      "资源 ACL"
    ]
  },
  {
    "slug": "ai-data-retention-policy",
    "title": "AI 应用数据留存策略：原文、Chunk、Prompt 与日志",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "AI 应用会产生大量原文、派生数据和调试日志。本文讨论按数据类型分级、设置留存周期、删除派生数据和审计生命周期。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "数据留存",
      "隐私合规",
      "生命周期管理"
    ]
  },
  {
    "slug": "ai-incident-drill",
    "title": "AI 应用故障演练：模型、队列、向量库与解析链路",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 应用依赖模型、向量库、队列、对象存储和解析器。本文讨论如何提前演练故障发现、降级、人工接管和恢复验证。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "故障演练",
      "降级恢复",
      "可观测性"
    ]
  },
  {
    "slug": "ai-environment-config-management",
    "title": "AI 多环境配置管理：dev、staging、prod 的隔离策略",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 应用会同时连接模型、数据库、队列、对象存储和回调服务。本文讨论开发、预发和生产环境如何隔离密钥、数据和写入链路。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "多环境配置",
      "密钥隔离",
      "发布安全"
    ]
  },
  {
    "slug": "ai-api-contracts",
    "title": "AI 应用 API 契约：流式响应、任务状态与错误语义",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI API 不应该只返回 answer 字符串。本文讨论同步、SSE、异步 job、任务状态、错误码、取消、重试和幂等语义。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "API 契约",
      "任务状态",
      "重试语义"
    ]
  },
  {
    "slug": "worker-observability",
    "title": "Worker 可观测性：队列积压、失败率与死信任务",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI Worker 承接解析、Embedding、审查、导出和生成任务。本文讨论如何用队列指标、trace、死信任务和告警动作判断后台是否健康。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Worker 监控",
      "队列指标",
      "死信任务"
    ]
  },
  {
    "slug": "frontend-ai-task-state-management",
    "title": "前端任务状态管理：AI 长任务的进度、取消与恢复",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 长任务不能只显示 loading。本文讨论前端如何基于后端状态枚举展示进度、失败原因、取消、重试、人工处理和刷新恢复。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "前端状态管理",
      "AI 长任务",
      "交互反馈"
    ]
  },
  {
    "slug": "ai-error-code-system",
    "title": "AI 应用错误码体系：用户提示、诊断信息与重试语义",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 应用错误要同时服务用户、前端和开发诊断。本文讨论 code、message、retryable、stage、traceId 和 nextAction 的设计。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "错误码体系",
      "用户提示",
      "诊断信息"
    ]
  },
  {
    "slug": "rag-incremental-indexing",
    "title": "RAG 增量索引：文档更新、删除与重新 Embedding",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "企业知识库会持续更新。本文讨论 documentVersion、contentHash、软删除、索引切换和缓存失效如何支撑增量索引。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "增量索引",
      "文档版本",
      "缓存失效"
    ]
  },
  {
    "slug": "ai-evaluation-dashboard",
    "title": "AI 评测看板：召回、引用、延迟、成本与反馈",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "AI 质量需要被持续观察。本文讨论如何把离线 Golden Set、线上 trace、质量、成本、错误和人工反馈放进统一看板。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "评测看板",
      "质量指标",
      "反馈闭环"
    ]
  },
  {
    "slug": "enterprise-audit-reporting",
    "title": "企业审计报表：文档访问、报告导出与工具调用追踪",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "企业 AI 需要回答谁在何时访问了哪些资料、导出了哪些报告、触发了哪些工具。本文讨论审计记录和报表筛选设计。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "审计报表",
      "访问追踪",
      "合规记录"
    ]
  },
  {
    "slug": "knowledge-base-import-template",
    "title": "知识库导入模板：目录、标签、Owner 与权限字段",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 入库前的 metadata 会决定后续检索、权限和运营质量。本文讨论导入模板如何标准化目录、标签、owner、权限和生命周期。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "知识库导入",
      "元数据标准",
      "内容治理"
    ]
  },
  {
    "slug": "rag-data-quality-scoring",
    "title": "RAG 数据质量评分：解析、Chunk、Metadata 与 Citation",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 质量上限来自数据。本文讨论如何把解析质量、chunk 完整度、metadata 覆盖率和 citation 命中转成可治理指标。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "数据质量",
      "RAG 评估",
      "质量评分"
    ]
  },
  {
    "slug": "prompt-security-test-set",
    "title": "Prompt 安全测试集：越权、注入、泄露与工具滥用",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "安全不能只靠一句系统提示。本文讨论如何用固定样例测试 prompt injection、越权请求、敏感信息泄露、危险输出和工具滥用。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "Prompt 安全",
      "安全测试集",
      "护栏评测"
    ]
  },
  {
    "slug": "model-evaluation-benchmark",
    "title": "模型评测基准：同一业务场景下的质量、成本与安全对比",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "通用排行榜不能直接决定业务选型。本文讨论如何用业务样例同时比较不同模型的质量、结构化输出、延迟、成本和安全表现。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "模型评测",
      "基准测试",
      "模型选型"
    ]
  },
  {
    "slug": "ai-delivery-documentation",
    "title": "AI 应用交付文档：README、架构图、接口说明与 Runbook",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 项目要能被理解、启动、验证、部署和排障。本文讨论 README、架构图、数据模型、API 契约、评测报告和 Runbook 的组织方式。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "交付文档",
      "运维手册",
      "项目说明"
    ]
  },
  {
    "slug": "contract-risk-taxonomy",
    "title": "合同审查风险分类：付款、违约、期限、保密与管辖如何建模",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "合同审查不能只输出泛泛风险提示。本文讨论如何把付款、违约、期限、保密、知识产权和争议解决等风险建成可检索、可评估、可复核的分类体系。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "Legal RAG",
    "knowledgePoints": [
      "合同风险分类",
      "结构化审查",
      "人工复核"
    ]
  },
  {
    "slug": "rag-query-log-analysis",
    "title": "RAG 查询日志分析：用户问题、无答案与内容缺口",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 上线后，用户问题本身就是知识库运营信号。本文讨论如何分析查询日志、无答案问题、低置信度回答和 citation 反馈来改进知识库。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "查询日志",
      "无答案分析",
      "知识库运营"
    ]
  },
  {
    "slug": "ai-product-metrics",
    "title": "AI 应用产品指标：采纳率、人工节省与质量反馈",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "AI 应用不能只看调用次数和回答数量。本文讨论如何用采纳率、人工节省时间、复核通过率、失败率和成本指标衡量真实价值。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "产品指标",
      "采纳率",
      "AI 价值评估"
    ]
  },
  {
    "slug": "legal-rag-disclaimer-human-review",
    "title": "法律 RAG 责任边界：AI 辅助、人工复核与免责声明",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "法律场景需要清晰说明 AI 输出的辅助定位。本文讨论免责声明、人工复核、低置信度提示、引用依据和报告边界如何共同降低误用风险。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "Legal RAG",
    "knowledgePoints": [
      "责任边界",
      "人工复核",
      "法律科技产品"
    ]
  },
  {
    "slug": "knowledge-base-governance-workflow",
    "title": "知识库治理流程：新增、复核、下线、归档与责任人机制",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "企业知识库不是一次性导入文档。本文讨论如何设计 owner、reviewCycle、过期复核、下线归档和治理任务，让 RAG 知识长期保持可信。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "知识库治理",
      "内容 Owner",
      "文档生命周期"
    ]
  },
  {
    "slug": "contract-review-report-schema",
    "title": "合同审查报告结构：Summary、RiskItems、Citations 与 Recommendations",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "合同审查报告不能只是一段总结。本文讨论如何把摘要、风险项、引用依据、修改建议、人工复核和导出信息组织成稳定 schema。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "Legal RAG",
    "knowledgePoints": [
      "审查报告",
      "结构化输出",
      "合同风险项"
    ]
  },
  {
    "slug": "ai-permission-testing-strategy",
    "title": "AI 应用权限测试：跨租户、过期链接、导出与工具调用",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 应用权限测试不能只验证登录。本文讨论如何覆盖 RAG 检索、citation、报告导出、缓存、工具调用和多租户隔离中的越权风险。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "权限测试",
      "多租户隔离",
      "越权防护"
    ]
  },
  {
    "slug": "rag-search-page-integration",
    "title": "RAG 与传统搜索融合：什么时候用搜索页，什么时候用问答页",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 不应该替代所有搜索体验。本文讨论搜索页、问答页、筛选器、引用卡片和无答案处理如何协同，让用户在查资料和要结论之间自然切换。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "搜索体验",
      "RAG 产品设计",
      "检索交互"
    ]
  },
  {
    "slug": "contract-review-batch-processing",
    "title": "合同审查批量处理：多份合同、批量风险项与报告合并",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "合同审查进入团队使用后，问题会从单份合同扩展到批量任务。本文讨论 batch、job、riskItems、部分失败和报告合并如何设计。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "Legal RAG",
    "knowledgePoints": [
      "批量任务",
      "合同审查",
      "报告合并"
    ]
  },
  {
    "slug": "rag-operations-console",
    "title": "RAG 运营后台：文档质量、查询质量、反馈与 Owner 任务",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 上线后需要持续运营。本文讨论如何把文档质量、查询失败、用户反馈、引用问题和 owner 任务组织成可执行后台。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "RAG 运营",
      "质量看板",
      "Owner 任务"
    ]
  },
  {
    "slug": "ai-gradual-release-strategy",
    "title": "AI 应用灰度发布：模型、Prompt 与检索参数如何逐步放量",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 应用发布不能只切一次开关。本文讨论如何对模型、prompt、检索参数、工具调用和用户范围做灰度发布与回滚。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用工程化",
    "knowledgePoints": [
      "灰度发布",
      "运行时配置",
      "回滚策略"
    ]
  },
  {
    "slug": "private-deployment-boundary",
    "title": "私有化部署边界：模型、存储、日志脱敏与企业网络限制",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "企业 AI 应用常会遇到私有化或专有环境部署。本文讨论模型接入、文件存储、日志脱敏、网络限制和运维边界如何提前设计。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用工程化",
    "knowledgePoints": [
      "私有化部署",
      "数据安全",
      "运维边界"
    ]
  },
  {
    "slug": "contract-review-collaborative-review",
    "title": "合同审查协同复核：法务、业务与管理员如何分工",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "合同审查系统进入真实流程后，风险项需要多人协同处理。本文讨论法务、业务、管理员和系统任务如何围绕风险项分工。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "Legal RAG",
    "knowledgePoints": [
      "协同复核",
      "风险项流转",
      "角色权限"
    ]
  },
  {
    "slug": "rag-evidence-chain-validation",
    "title": "RAG 证据链校验：Citation、Quote、ChunkId 与版本一致性",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "RAG 的可信度不只取决于有没有引用，还取决于引用是否能回到正确版本的原文。本文讨论证据链一致性如何校验。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用知识库",
    "knowledgePoints": [
      "证据链",
      "Citation 校验",
      "版本一致性"
    ]
  },
  {
    "slug": "ai-cost-governance-strategy",
    "title": "AI 应用成本治理：预算、限流、缓存、降级与高成本审批",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "AI 应用的成本来自模型、token、OCR、向量库、队列和人工复核。本文讨论如何把成本治理设计进产品和工程流程。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "AI 应用工程化",
    "knowledgePoints": [
      "成本治理",
      "限流降级",
      "预算控制"
    ]
  },
  {
    "slug": "ai-model-routing-strategy",
    "title": "多模型路由策略：快模型、强模型与本地模型如何分工",
    "tag": "AI 应用",
    "column": "knowledge",
    "detail": "不同 AI 任务对质量、延迟、成本和合规要求不同。本文讨论如何设计多模型路由，让快模型、强模型和本地模型各司其职。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "AI 应用工程化",
    "knowledgePoints": [
      "模型路由",
      "任务分级",
      "模型抽象"
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
    "detail": "公开站点既要展示能力，也要控制信息边界。本文讨论技术案例如何区分公开内容、私有复盘、运行证据和敏感配置。",
    "date": "2026-06-20",
    "readTime": "10 min",
    "series": "公开站点与内容系统",
    "knowledgePoints": [
      "内容治理",
      "脱敏策略",
      "公开信息边界"
    ]
  },
  {
    "slug": "static-site-release-verification",
    "title": "静态站发布验证：构建、缓存、资源指纹与线上检查",
    "tag": "全栈开发",
    "column": "knowledge",
    "detail": "静态站上线不只是 push 代码。本文讨论如何用构建产物、资源指纹、缓存刷新、内容扫描和线上 bundle 抽查确认发布真的生效。",
    "date": "2026-06-20",
    "readTime": "9 min",
    "series": "公开站点与内容系统",
    "knowledgePoints": [
      "静态站部署",
      "构建验证",
      "线上检查"
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
  }
]
