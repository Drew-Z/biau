---
slug: "agentic-rag-frontier-2026"
title: "2026 年的 RAG 不再只是检索：从 Agentic RAG 到泊岸助手的架构选择"
column: "knowledge"
series: "AI 应用知识库"
tag: "AI 应用"
status: "draft-full-flow"
generatedBy: "model-assisted-polish:review:fallback-1:wei:deepseek-ai/deepseek-v4-pro"
generatedAt: "2026-07-04T15:46:41.443Z"
modelStrategy: "Model-assisted polish via review/fallback-1 (wei / deepseek-ai/deepseek-v4-pro); source evidence remains Codex-reviewed; Codex final fact/safety review completed for draft staging."
---

# 2026 年的 RAG 不再只是检索：从 Agentic RAG 到泊岸助手的架构选择

## Evidence Pack

- Writing mode: Model-assisted draft/rewrite (review polish pass).
- Model setup: masked `blog:model status --all` and offline `blog:model doctor --all` passed; doctor reported no model request was sent.
- Strong draft channel: `strong/fallback-1 (wei / z-ai/glm-5.2)` succeeded after the `strong` primary channel failed. The strong draft was used only as structure and wording material.
- External sources:
  - Anthropic Contextual Retrieval: https://www.anthropic.com/engineering/contextual-retrieval
  - Qdrant Hybrid Queries: https://qdrant.tech/documentation/search/hybrid-queries/
  - LangGraph Agentic RAG tutorial: https://docs.langchain.com/oss/python/langgraph/agentic-rag
  - Microsoft GraphRAG docs: https://microsoft.github.io/graphrag/
  - Self-RAG: https://arxiv.org/html/2310.11511
  - CRAG: https://arxiv.org/html/2401.15884
  - Adaptive-RAG: https://aclanthology.org/2024.naacl-long.389.pdf
  - Agentic RAG survey: https://arxiv.org/html/2501.09136v4
  - RAGSearch / GraphRAG vs dense RAG under agentic search: https://arxiv.org/html/2604.09666v1
- Project evidence read:
  - `server/src/app.ts`
  - `server/src/model.ts`
  - `server/src/ragClient.ts`
  - `server/src/ragOrchestrator.ts`
  - `server/src/ragQdrantStore.ts`
  - `server/src/ragAdapters.ts`
  - `server/src/knowledge.ts`
  - `src/data/blogShared.ts`
  - `src/data/blog-posts/agentic-rag-frontier-2026.ts`
- Source route note: smart-search Exa is not configured in this environment, so this full-flow pass used public web/official sources for source verification. Previous baseline notes that mention smart-search should be treated as historical drafting notes, not as evidence newly fetched in this pass.

## Safe Public Facts

- As of July 4, 2026, it is more accurate to explain frontier RAG as a layered control system than as one fixed vector top-k call.
- Self-RAG supports the idea of retrieval on demand and self-reflection over relevance/support/usefulness rather than indiscriminate fixed-passage retrieval.
- Adaptive-RAG supports query-complexity routing across no retrieval, single-step retrieval and multi-step retrieval.
- CRAG supports adding a retrieval evaluator/corrective action when retrieved documents are weak or misleading.
- Anthropic's Contextual Retrieval combines contextualized chunks, contextual BM25 and reranking, and reports lower top-20 retrieval failure rates in their experiments.
- Qdrant's official hybrid query docs support dense/sparse prefetch, RRF and DBSF-style fusion as a possible implementation route.
- LangGraph's Agentic RAG tutorial shows a graph with retrieve-or-respond, document grading, question rewriting and answer generation.
- Microsoft GraphRAG builds graph structures and community summaries, then uses query modes such as Global, Local, DRIFT and Basic search.
- RAGSearch frames dense RAG and GraphRAG as retrieval backends under agentic search; it reports dense RAG remains practical for general QA while graph structure is still useful for complex multi-hop reasoning when offline cost can be amortized.
- BIAU Port currently has public/internal assistant service boundaries, a RAG orchestrator mode, Qdrant and Postgres store adapters, local read-only fallback, public strict grounding, internal strict/background/none grounding, private credential refusal, provider diagnostics and deterministic output self-checks.
- Current BIAU Port code does not yet prove full Qdrant dense+sparse hybrid query, Qdrant-side RRF/DBSF, formal model reranker, formal evidence judge, complete GraphRAG or production SLA. These must be described as roadmap or next iteration work.

## Uncertain Or Stale Facts

- No live production answer-quality metric, latency SLO, win-rate, user feedback dataset or formal eval result was verified in this pass.
- The public corpus is still evolving; GraphRAG/Neo4j necessity depends on future relation-heavy questions and corpus size.
- Model answer quality depends on private provider configuration and should not be inferred from architecture alone.
- Sources and tooling in this field change quickly; this post should be treated as a July 4, 2026 architecture snapshot.

## Forbidden / Private Details

- Do not include API keys, token values, database URLs, private relay URLs, private dashboards, private account names, admin secrets, invite codes, local secret file paths, cloud console screenshots or sensitive metrics.
- Do not expose exact Qdrant endpoints, collection names/keys, Render/Supabase service-role configuration, model relay addresses or internal credentials.
- Do not describe planned work as already implemented.

## Codex Compare / Fuse Notes

- Kept from the strong draft: the six-layer control-system framing, failure-mode list, and practical checklist.
- Rewritten from the strong draft: claims that `server/src/ragQdrantStore.ts` already encapsulates Qdrant Hybrid Queries, Dense + Sparse retrieval, RRF fusion, Rerank and Evidence Judge.
- Corrected implementation statement: current Qdrant adapter stores embedded chunks and queries vector search endpoints; local retrieval combines keyword/metadata/entity signals with a deterministic local vector rerank. Qdrant official hybrid queries are a recommended next iteration, not a proven current behavior.
- Corrected ownership statement: `ragClient.ts` handles RAG endpoint retrieval/fallback; `model.ts` handles assistant model calls and self-checks; `knowledge.ts` handles local classification, entity expansion and fallback retrieval.
- Column fit: this remains `knowledge`, not a project-detail duplicate. The post explains architecture judgment and reusable RAG design decisions.

## Draft Brief

- Column: 知识积累 / Knowledge Notes
- Target reader: 关注 AI 助手、知识库问答、RAG 工程化和项目架构选择的技术访客。
- Reader value: 看懂“前沿 RAG”不是简单堆 GraphRAG/Neo4j，而是一套从路由、混合检索、证据评估、迭代检索到可观测性的系统设计。
- Public angle: 解释 BIAU Port 为什么先推进 Agentic Hybrid RAG + scoped RAG Orchestrator + Qdrant 方向，而不是一开始就引入重图数据库。
- Project-page overlap boundary: 项目页讲稳定能力和演示入口；本文讲架构判断、技术取舍、失败模式和后续路线。
- Review/polish stage used the `review` profile `fallback-1` channel (wei / deepseek-ai/deepseek-v4-pro).
- Codex final fact/safety review completed for this staged draft; repeat before promotion if the body is edited again.

## Article Outline

- 结论：前沿 RAG 是一套控制系统
- 为什么 naive RAG 不够
- 六层结构：任务路由、上下文构建、混合检索、融合排序、证据评估、eval/观测
- 为什么不一开始引入完整 GraphRAG 或 Neo4j
- 泊岸助手当前实现边界
- 下一阶段质量闭环路线
- 脱敏例子、失败模式与实践清单

## Review Gates

- [x] Writing mode and model strategy recorded.
- [x] Strong generated text compared against repository evidence.
- [x] Unsupported implementation claims rewritten or downgraded to roadmap.
- [x] No private endpoint, key, account, database URL, cloud secret or admin credential included.
- [x] Column fit checked as Knowledge Notes.
- [x] Review profile polish completed through section-level calls.
- [x] Codex final fact/safety review completed for draft staging.

## Promotion Checklist

- [ ] Compare this full-flow draft with the current runtime article before promotion.
- [ ] Convert the final reviewed version into `src/data/blog-posts/agentic-rag-frontier-2026.ts` only after author/Codex review.
- [ ] Keep implementation claims aligned with `server/src/ragQdrantStore.ts`, `server/src/ragOrchestrator.ts`, `server/src/knowledge.ts`, and `server/src/model.ts`.
- [ ] Run `npm.cmd run blog:audit`, `npm.cmd run blog:check`, `npm.cmd run assistant:index`, `npm.cmd run sitemap:generate`, `npm.cmd run assistant:kg-check`, `npm.cmd run lint`, and `npm.cmd run build` after public promotion.

## Draft Body

### 先给结论：前沿 RAG 是一套控制系统

如果还把 RAG 理解为“用户提问 → 向量库取 top-k 片段 → 塞给模型”，这个认知到 2026 年已经明显不够用了。更值得采用的架构不是某个单点组件，而是一套围绕检索质量和回答可信度构建的控制系统：先判断问题是否需要检索，再决定检索策略，检索后评估证据是否充分，必要时重写问题或继续检索，最后通过引用、自检和观测来约束输出。

因此，我更愿意把泊岸助手的路线称为 Agentic Hybrid RAG。“Agentic”意味着不把检索当作固定步骤，而是引入路由、判断、纠错和边界控制；“Hybrid”意味着不只依赖向量相似度，而是逐步组合关键词、稀疏信号、向量检索、rerank、实体关系与状态数据。

这篇文章并不是要宣布“泊岸已经完成了最终形态的 RAG”。更准确的表述是：当前系统已经落下一版面向生产的第一切片，下一阶段要做的，是把检索质量、证据评估、可观测性和关系扩展补成闭环。

### 为什么 naive RAG 不够

Naive RAG 的问题不在于它没用，而在于它把太多事情假设成固定的。固定 top-k 可能把无关片段带进上下文；只用 embedding 容易错过错误码、项目名、服务名、模型 ID 这类精确字符串；只做一次检索很难回答多跳问题；无论什么问题都检索，又会让创作、闲聊和规划类请求被站内资料拖偏。

Self-RAG 的提醒是，不该无条件检索固定数量的 passage：系统应该先判断是否需要检索，再对检索内容和生成内容做自我评估。Adaptive-RAG 的提醒是，问题复杂度不同，检索策略也应该不同——简单问题可能不需要检索，普通事实问题适合一次高质量检索，复杂多跳问题才值得多步检索或问题改写。CRAG 则补上另一个现实问题：如果检索本身错了，模型生成再流畅也只是把错误包装得更像答案。

这些方向合起来，指向同一个工程结论：RAG 的核心不再是“召回更多”，而是“在正确时机拿到足够证据，并在证据不足时停下来”。

### 六层结构：从路由到观测

**第一层是任务路由。** 系统需要先判断用户意图：是在询问站点事实、请求创作、做方案规划，还是在索要敏感信息。公开助手默认应执行 strict grounding，只基于公开资料作答；内部助手则可根据任务类型进入 strict、background 或 none grounding。创作类请求不一定需要检索，而敏感凭据请求不应检索后再回答，应当直接拒绝。

**第二层是上下文构建。** Anthropic 的 Contextual Retrieval 揭示了一个朴素但关键的点：chunk 不能脱离文档背景。为 chunk 补充文档级上下文后再用于 embedding 和 BM25，能有效减少“片段本身正确，但脱离上下文后检索不到或被误用”的问题。对泊岸这类项目展示站而言，chunk 中应携带项目、页面、栏目、状态、版本和适用范围等信息，而不是只保存孤立段落。

**第三层是混合检索。** 向量检索擅长捕捉语义相似性，关键词或稀疏检索则擅长精确命中。Qdrant 官方文档已给出 dense/sparse prefetch、RRF 和 DBSF 等 hybrid query 路线。对泊岸来说，这些是下一阶段值得重点落地的能力：项目名、错误码、路由名、状态标签和模型 ID 不能只依赖 embedding；语义改写和同义问题也不能只靠关键词匹配。

**第四层是融合排序与 rerank。** 多路召回后的结果不能简单拼接。RRF 更适合各路召回分数不可比的场景，DBSF 则尝试对各路分数分布做归一化后再融合。融合之后，还可以用 reranker 对 top-N 候选进行精排。这一步的目标不是让架构显得高级，而是让进入模型上下文的证据更少、更准、更可解释。

**第五层是证据评估与 agentic loop。** LangGraph 的 Agentic RAG 示例将流程拆解为是否检索、检索、文档相关性打分、问题改写和生成回答。CRAG 同样强调在检索结果弱或错误时触发纠正动作。工程上，这对应一个受控循环：证据不足就改写或二次检索，命中敏感边界就拒答，仍然不足就承认不知道，而不是继续强行生成。

**第六层是 eval 与可观测性。** RAG 质量不能只靠主观感觉。至少需要记录每次回答的检索模式、候选数量、引用数量、证据是否充足、是否触发 fallback、是否触发敏感信息拦截。后续还需要构建小型 eval 集、引入人工标注、进行答案对比，并建立状态页可观测性，才能判断“回答变好”究竟来自检索、rerank、模型，还是提示词的改进。

### 为什么不是一开始就上 Neo4j 或完整 GraphRAG

GraphRAG 很强，但它不是所有 RAG 的第一步。Microsoft GraphRAG 的路线是从原始文本抽取知识图谱，建立社区层级摘要，再用 Global、Local、DRIFT、Basic 等查询模式回答不同问题。它适合跨文档、多实体、全局总结和关系推理，尤其适合“connect the dots”类型的数据集。

但 GraphRAG 的代价也很明确：实体抽取、关系构建、社区摘要、索引维护和更新策略都不是免费的。2026 年 RAGSearch 的一个有用结论是，agentic search 可以让 dense RAG 通过多轮检索和推理引入隐式结构，从而缩小和 GraphRAG 的差距；但在复杂多跳推理里，显式图结构仍然更稳定，前提是离线构建成本能被长期复用。

这正好解释了泊岸的取舍。当前公开语料主要是项目页、状态页、博客、展示资料和少量演示说明。在这个规模下，先把上下文 chunk、混合检索、证据评估、自检和 eval 做扎实，比立刻引入 Neo4j 更能提升回答效果。图能力可以先以轻量实体和关系扩展的形式存在，等真实问题证明需要深图遍历，再上完整 GraphRAG 或图数据库。

### 泊岸助手当前到了哪一步

当前实现已经不是简单的浏览器本地搜索。后端按服务边界区分公开助手、内部助手和 RAG Orchestrator 三种入口：RAG Orchestrator 在选择 Qdrant 时走外部向量检索，同时保留 Postgres 或本地只读 fallback；公开助手强制使用公开资料，内部助手则根据意图选择 strict、background 或 none grounding；模型输出后还有确定性自检，防止泄露密钥、连接串、私有路径，以及不该在公开助手中出现的来源格式。

更细一层看，`server/src/app.ts` 定义公开助手、内部助手和 RAG 模式的服务入口；`server/src/ragClient.ts` 负责调用 RAG endpoint，并在不可用时回退到本地知识；`server/src/ragOrchestrator.ts` 在 Qdrant、Postgres 和本地模式之间编排；`server/src/knowledge.ts` 承担本地意图分类、关键词/元数据/实体扩展和 sufficiency 判断；`server/src/model.ts` 负责模型调用、public/internal system prompt、敏感输出自检和 provider 诊断。

需要特别说明的是：当前 Qdrant adapter 已经能够同步公开知识 chunk、写入 payload、查询 Qdrant 向量搜索并返回 retrieval meta，但代码证据还不能证明它已使用 Qdrant 官方的 dense+sparse hybrid query、Qdrant-side RRF/DBSF、正式 reranker 或模型 evidence judge。当前本地路径更接近“关键词/元数据/实体信号 + deterministic local vector rerank”的第一版 hybrid 形态。下一阶段要做的，正是把这些能力从路线图推进到可验证实现。

### 后续最值得补的是质量闭环

下一阶段可以围绕五件事推进。

第一，把公开知识库切分成更稳定的 contextual chunks。每个 chunk 除了保存正文，还要携带项目、页面、栏目、状态、版本、可见性、来源类型和适用范围等元信息，避免召回结果变成一堆脱离上下文的短句。

第二，在 Qdrant 上补齐真正的 dense + sparse 或关键词信号融合。可以优先走 Qdrant 官方 hybrid query 的 RRF 路线，因为它对不同召回列表的分数尺度更宽容；等 eval 证明需要更细的分数融合时，再考虑 DBSF 或 formula query。

第三，引入 rerank 或轻量 evidence judge。低成本版本可以先用确定性规则：引用数不足、候选分数过低、来源都集中在同一文档、命中私有凭据意图，一律降级为 weak 或 none。后续再引入专门 reranker 或模型 judge 做更细的判断。

第四，为公开助手建立一个小型 RAG Eval Set，覆盖项目入口、状态页、技术栈、博客知识、敏感拒答、无资料拒答和创作类不检索等场景。每次调整 retrieval、prompt 或模型配置后，都能看出是改善还是退化。

第五，把 retrieval meta 接入状态页或内部诊断页，只展示安全摘要，例如 retrievalMode、store、candidateCount、citationCount、sufficiency、fallbackReason、expandedEntityCount、modelCalls 和 provider diagnostic。这样，“为什么答得好或不好”就不再靠猜。

### 一个脱敏例子

假设用户问：“Legal RAG 的合同审查现在能不能演示？”公开助手应当先进入 strict grounding，只检索公开项目页和状态页；如果资料显示入口受登录门禁影响，就如实说明演示边界和下一步查看位置，而不是编造后台密码。内部助手若被问到“帮我写一段 Legal RAG 项目复盘文案”，则可以切换到 background grounding，把项目资料当作背景素材来组织内容，而不是把 citation 路径硬塞进正文。

再假设用户问“写一首诗”。内部助手就不该为了用 RAG 而去检索站点资料。这个例子看起来很小，却恰好点出了前沿 RAG 的核心判断：检索不是越多越好，而是在正确的时刻、用正确的证据、服务正确的任务。

### 常见失败模式

第一种是过度 RAG：无论什么请求都走检索，导致创作、规划类任务被站内资料污染。第二种是单路召回：只依赖向量相似度，遇到精确的项目名、错误码或状态标签时容易漏掉关键片段。第三种是 chunk 失忆：切分后丢失文档背景，片段本身看似相关，实际语境已经错位。第四种是无评估生成：候选片段质量不足时仍然强行回答，缺少对证据充分性的判断。第五种是图数据库崇拜：在还没有证明关系推理需求之前，就引入高维护成本的组件。第六种是没有 eval：上线后只能凭感觉判断模型“好像变聪明了”，缺乏可复现的质量信号。

### 实践检查清单

做一个真正可用的 RAG 助手，可以按这个顺序检查：问题是否需要检索；检索是否同时覆盖语义和精确匹配；chunk 是否保留文档背景；候选是否经过 rerank 或证据评估；证据不足时是否拒答或改写问题；输出是否带引用或可追溯来源；敏感信息是否被拦截；每次回答是否能留下 retrieval meta；是否有离线 eval 和线上观测。

泊岸助手的技术路线也应该遵循这个顺序：先把 Agentic Hybrid RAG 的控制面做稳，再逐步补强检索质量、评估闭环和关系扩展。前沿不是把所有新名词一次性装进系统，而是让每一层都能解释自己为什么存在、解决了什么失败模式、什么时候应该被绕开。
