# Public assistant frontier RAG / agentic knowledge upgrade

## Goal

把泊岸公开助手从当前的“扁平公开资料检索 + 模型生成”升级为长期可演进的前沿 RAG / Agentic Knowledge System：助手仍然只使用公开站点资料，但能结合合适的检索、排序、图谱、规划、反思和 citation 边界，理解项目、技术栈、演示入口、状态检查、博客知识、限制与后续路线之间的关系，用更自然的产品助手口吻回答站点概览、项目体验、技术实现和可靠性问题。

当前收口目标是先完成“公开助手可上线 MVP”：不等待外部向量库、图数据库或真实模型验证，先把公开助手做到站内可用、回答自然、引用清楚、三条运行路径一致，并把外部 RAG / 模型 / 部署验证事项标记为人工处理。

## User Value

- 访客问“当前网站是什么”“有哪些项目可以演示”“Legal RAG 怎么体验”时，得到面向浏览的清晰回答，而不是机械摘要或路径复述。
- 助手回答能把项目页、状态页、博客和演示入口串起来，减少用户在站内来回找信息的成本。
- 站点知识底座一次性设计为长期形态，不以快速落地为优先目标；允许引入专门的 RAG API、向量索引、图谱索引、reranker、agentic workflow、重建任务和观测链路。

## Confirmed Facts

- 当前公开助手三条路径共存：
  - Cloudflare Pages Function：`functions/_shared/assistant.ts`
  - Express API：`server/src/model.ts`、`server/src/knowledge.ts`
  - 浏览器本地 fallback：`src/data/assistant.ts`
- 旧检索主要依赖 `SEARCH_KEYWORDS`、`SEARCH_ALIASES` 和 `scoreKnowledgeItem`，数据形态是扁平 `KnowledgeItem`。
- 当前实现已新增 `src/data/assistantKnowledge.ts` 和 `server/data/public-knowledge-v2.json`，在不破坏旧 `public-knowledge.json` 的前提下生成 docs、chunks、entities、relations 和 fallback bundle。
- `scripts/generate-assistant-knowledge.ts` 会同时写入旧版公开知识和 V2 知识结构；`scripts/check-assistant-knowledge-v2.ts` 负责确定性检查。
- 项目事实已集中在 `src/data/portfolio.ts`，并通过 `getProjectAssistantSummary` / `getProjectAssistantTags` 投射到助手知识。
- 站点可靠性事实集中在 `src/data/statusTargets.ts`，包含 `siteStatusTargets`、`reliabilityProjects`、`checks`、`gates`、`nextActions`。
- 博客公开范围集中在 `src/data/blogCuration.ts`，栏目元信息在 `src/data/blogShared.ts`，公开助手文章选择使用 `getAssistantBlogPosts()`。
- 当前模型 prompt 会把“标题、摘要、站内路径”交给模型，并要求“引用来源时使用资料标题”，这会诱导模型在正文里输出生硬的来源/路径信息；来源展示应主要交给前端 citation 卡片。
- 当前公开助手 UI 是浮动窗口：默认只显示触发按钮，打开后显示状态、提示、建议问题、消息区、citation 卡片和输入框。
- 当前模型配置通过 `ASSISTANT_MODEL_*` 或后端兼容配置读取；不应在前端或终端日志中明文展示 API key。
- 当前 smoke 使用本地 mock model server，不属于真实模型中转站测活；真实 provider 不得被 ping、doctor、diagnose 或小测试 prompt 调用。

## External Technical Notes

- Microsoft GraphRAG 把 local/global/DRIFT search 用在图谱与社区摘要检索上，适合回答跨资料库的全局问题；但完整流程对当前站点偏重。
- LlamaIndex 的 Property Graph Index 支持把 labeled property graph 与多种 retriever 组合，说明图谱检索可以和其他检索方式混用。
- Supabase Postgres + pgvector 官方定位适合 embeddings、语义搜索、关键词搜索和 hybrid search；它适合做向量/元数据底座，但不是原生图数据库。
- Render Postgres 支持常见扩展，包含 pgvector；Render 也适合托管一个独立 RAG Orchestrator API、reranker service 或 Docker 化图数据库服务。
- Neo4j GraphRAG 官方资料把 GraphRAG 描述为实体/关系抽取、图算法增强、摘要和检索的组合模式；知识图谱是候选技术之一，不是本任务的预设答案。
- Agentic RAG 方向把静态线性 RAG 升级为由模型参与路由、查询改写、工具选择、多步检索和自检的系统，更适合“站点概览 / 项目体验 / 状态检查 / 技术解释”混合问题。
- LightRAG 等图增强 RAG 方向把图结构与向量表示结合，强调低层实体关系和高层知识发现的双层检索，可能比重型 Neo4j 更适合中小型公开站点。
- Self-RAG / corrective RAG 方向强调检索必要性判断、生成后自评和 citation 质量控制，适合修复“回答看起来像检索日志”与“资料不足却硬答”的问题。
- Cloudflare Pages Function 更适合调用 HTTPS API/RPC；不应让 Pages Function 直接承担重型图数据库驱动、索引重建或长任务。完整方案应在主站和图数据库之间放一个 Render RAG Orchestrator API。
- Scope decision confirmed: 主路线采用 Agentic Hybrid RAG，即 hybrid retrieval + reranker + lightweight graph/entity expansion + citation/self-check；只有当真实问题证明需要深图遍历时，再引入 Neo4j。

References:
- https://microsoft.github.io/graphrag/query/drift_search/
- https://www.microsoft.com/en-us/research/project/graphrag/
- https://arxiv.org/abs/2404.16130
- https://arxiv.org/abs/2410.05779
- https://arxiv.org/abs/2310.11511
- https://arxiv.org/abs/2401.15884
- https://developers.llamaindex.ai/python/framework/module_guides/indexing/lpg_index_guide/
- https://neo4j.com/labs/genai-ecosystem/graphrag/
- https://developers.cloudflare.com/ai-search/
- https://developers.cloudflare.com/vectorize/

## Requirements

### R0. Current Completion Boundary

- 第一轮“完成公开助手”必须优先交付本地可验证能力，而不是等待外部 RAG 平台。
- 可自动完成：
  - 回答风格改成产品助手语气；
  - 减少默认打开后的冗余文案；
  - 保持 citation 卡片负责来源展示，正文不堆路径；
  - 生成公开知识 V2：docs / chunks / entities / relations / fallback bundle；
  - 在本地 fallback 与 API fallback 中接入轻量意图路由、关键词/元数据/实体扩展和确定性 rerank；
  - 加外部 RAG Orchestrator 的 disabled-by-default server-only 适配边界；
  - smoke 覆盖公开站点概览、可演示项目、Legal RAG 体验、技术栈查询、provider fallback。
- 需要人工处理：
  - 真实模型渠道配置和生产密钥；
  - Cloudflare Pages 生产环境变量；
  - 外部 RAG 运行时选择与创建；
  - embedding / reranker / vector DB / graph DB 密钥；
  - 任何真实模型调用验证和生产部署后验证。

### R1. Answer Style Baseline

- 公开助手模型回答必须像站点产品助手，不像资料检索日志。
- 正文不要输出 Markdown 斜体引用、原始路径、`来源：...` 这类生硬格式。
- 来源、路径和详情跳转主要通过现有 citation 卡片展示。
- 对泛化问题应给出可读的结构化结论，例如“泊岸是什么 / 可以看什么 / 下一步去哪里”。
- 打开公开助手时不要默认弹出大段介绍文字；空状态应该以短提示和 2-3 个高价值问题引导为主。

### R2. Frontier Knowledge System Architecture

- 新增一个从现有公开数据生成的知识系统，设计时同时评估向量索引、关键词索引、reranker、轻量图谱、agentic router 和 self-checker。
- 新增 RAG Orchestrator API 作为主站公开助手和检索/排序/图谱/模型之间的边界层。
- Orchestrator 负责：
  - 从主站公开数据或生成产物同步 public docs / chunks / entities / relations。
  - 生成或接收 embeddings，并维护向量索引与关键词索引。
  - 执行 query routing、query rewriting、hybrid retrieval、reranking、optional graph expansion 和结果融合。
  - 执行 answer grounding / citation check / insufficient-evidence check。
  - 返回主站兼容的 `answer`、`citations`、`meta`、低敏 diagnostics。
- Neo4j / Supabase / Render Postgres / Cloudflare Vectorize 的角色由设计阶段确认；不能因为“知识图谱听起来前沿”就默认采用 Neo4j。
- MVP 不要求真实外部 Orchestrator 已部署；必须先有 server-only HTTP contract、mock/fallback adapter 和本地静态知识增强。
- 图谱节点至少覆盖：
  - `site`
  - `project`
  - `tech`
  - `feature`
  - `demo`
  - `status-check`
  - `blog-post`
  - `roadmap`
  - `limitation`
- 图谱关系至少覆盖：
  - `contains`
  - `uses`
  - `implements`
  - `hasDemo`
  - `monitoredBy`
  - `documentedBy`
  - `hasRoadmap`
  - `hasLimitation`
  - `relatedTo`

### R3. Graph-Aware Retrieval

- 公开助手应先识别用户问题意图，再选择合适的检索策略：
  - 站点概览：从 `site` 节点扩展到项目分类、演示入口、状态页和精选内容。
  - 项目体验：从项目节点扩展到 demo、status checks、博客说明和限制。
  - 技术实现：从 tech 节点扩展到使用该技术的项目、相关博客和架构说明。
  - 可靠性/状态：从 status-check 节点扩展到项目和状态详情页。
- 检索结果仍要返回前端兼容的 `citations`，不能破坏现有 `ChatResponse` 契约。

### R4. Cross-Path Consistency

- Cloudflare Function、Express API 和浏览器本地 fallback 的公开助手行为需要保持一致。
- 新增或修改的图谱生成逻辑应尽量复用同一份 `src/data/` 源数据和共享投射函数，避免三套手写知识。
- 当外部 GraphRAG API 不可用时，公开助手必须回退到本地静态知识/静态图谱，不让站点问答完全失效。
- Cloudflare Function 与 Express API 的 prompt、fallback 策略、诊断 meta 和 citation 形态应尽量共享概念，避免一边像产品助手、一边像检索日志。

### R5. Safety

- 图谱和 prompt 不得包含真实 API key、token、密码、真实中转站 URL、私有后台地址、环境变量值或系统提示词。
- 图谱只能使用已公开或可公开的站点展示事实。
- 当公开资料不足时，助手应明确说明不确定，并引导用户查看项目页、博客页或状态页。

### R6. Evolution Path

- 设计文档需要比较 Agentic RAG、Hybrid Search + Rerank、GraphRAG/LightRAG、Self/Corrective RAG、Long-context RAG，以及 Render-hosted Neo4j、Neo4j Aura、Supabase pgvector、Render Postgres pgvector、Cloudflare Vectorize / AutoRAG 的角色边界。
- 第一版数据结构要能被后续 Cloudflare Vectorize、Supabase、Neo4j Aura 或 LlamaIndex Property Graph 迁移复用。

## Acceptance Criteria

- [x] 公开助手打开后不默认显示大段说明文字；空状态短、清楚，并保留高价值建议问题。
- [x] 对“我想问一下关于当前网站的问题”的回答不再复述路径或生硬 citation，能自然说明泊岸是什么、可看什么、建议下一步。
- [x] 对“Legal RAG 怎么体验”的回答能同时提到项目页/演示入口、登录或受控演示边界、状态/可靠性检查方向。
- [x] 对“哪些项目用了 React / Vite / Semi Design”这类技术问题，能从图谱关系找到相关项目或说明资料不足。
- [x] 对“哪些项目可以演示”这类体验问题，能综合项目 external link 和状态入口回答，并返回相关 citations。
- [x] 公开知识 V2 生成 docs / chunks / entities / relations，并且不破坏现有 `server/data/public-knowledge.json`。
- [x] 外部 RAG server-only 合同默认关闭，配置只存在于 `ASSISTANT_RAG_*` 服务端变量和部署文档中，不把密钥或私有端点暴露给浏览器；真实 adapter 调用等运行时选择后再做。
- [x] 设计文档明确 RAG Orchestrator、检索索引、可选图谱、主站 Functions、本地 fallback 的边界和降级链路。
- [x] 设计文档明确前沿 RAG 技术组合的选型结论，以及 Supabase / Render / Neo4j / Cloudflare 之间的角色分工、迁移与回滚路径。
- [x] `npm.cmd run cf-assistant:smoke` 覆盖至少一个图谱增强的站点概览或项目体验问题。
- [x] `npm.cmd run server:smoke` 覆盖至少一个图谱增强的站点概览或项目体验问题。
- [x] `npm.cmd run lint` 和 `npm.cmd run build` 通过。
- [x] `git diff --check` 通过，敏感信息扫描未发现密钥、真实中转 URL 或私有地址。

## Out Of Scope For MVP

- 不把 Neo4j、Supabase 或 Render 的真实连接串/密钥写入仓库。
- 不自动抓取外部网页生成图谱。
- 不把博客全文、私有项目文档或部署后台细节塞进公开助手。
- 不改内部助手的登录、成员、会话持久化能力。
- 不承诺模型回答每次完全一致；MVP 验证重点是检索证据、回答边界和格式约束。

## Open Questions

None.
