---
slug: "agentic-rag-frontier-2026"
title: "2026 年的 RAG 不再只是检索：从 Agentic RAG 到泊岸助手的架构选择"
column: "knowledge"
series: "AI 应用知识库"
tag: "AI 应用"
status: "draft-baseline"
generatedBy: "codex-smart-search-research-baseline"
modelStrategy: "Codex-only scaffold/review; model channel: none"
---

# 2026 年的 RAG 不再只是检索：从 Agentic RAG 到泊岸助手的架构选择

## Evidence Pack

- Writing mode: Codex-only scaffold/review.
- Blog model channel: none. 本轮没有调用 `blog:draft -- --generate`、`--polish-from` 或任何博客模型润色。
- Web research route: `smart-search` CLI. Evidence files were saved to a local smart-search evidence directory for this drafting pass; only source URLs and sanitized file names are recorded here.
- `smart-search fetch "https://arxiv.org/html/2501.09136v4"` -> Agentic RAG survey, used for agentic patterns, routing, planning, tool use, reflection, multi-agent and open challenges.
- `smart-search fetch "https://arxiv.org/html/2604.09666v1"` -> 2026 RAGSearch / GraphRAG vs agentic search benchmark, used for GraphRAG and agentic search relationship.
- `smart-search fetch "https://www.anthropic.com/engineering/contextual-retrieval"` -> Contextual Retrieval, used for contextual embedding, contextual BM25 and reranking evidence.
- `smart-search fetch "https://qdrant.tech/documentation/search/hybrid-queries/"` -> Qdrant hybrid and multi-stage queries, used for dense/sparse fusion and multi-stage retrieval capability.
- `smart-search fetch "https://docs.langchain.com/oss/python/langgraph/agentic-rag"` -> LangGraph Agentic RAG tutorial, used for retrieve-or-respond, grade documents, rewrite question and generate answer loop.
- `smart-search fetch "https://microsoft.github.io/graphrag/"` -> Microsoft GraphRAG docs, used for knowledge graph extraction, community hierarchy and query modes.
- `smart-search fetch "https://arxiv.org/html/2310.11511"` -> Self-RAG, used for on-demand retrieval and reflection/self-check framing.
- `smart-search fetch "https://aclanthology.org/2024.naacl-long.389.pdf"` -> Adaptive-RAG, used for question-complexity routing between no retrieval, single-step retrieval and multi-step retrieval.
- `smart-search fetch "https://arxiv.org/html/2401.15884"` -> CRAG, used for retrieval evaluator, Correct/Incorrect/Ambiguous actions, web-search correction and document refinement.
- Project evidence read: `server/src/app.ts`, `server/src/model.ts`, `server/src/ragClient.ts`, `server/src/ragOrchestrator.ts`, `server/src/ragQdrantStore.ts`, `server/src/knowledge.ts`, `src/data/blogShared.ts`.
- Search/process notes: OpenReview CRAG page was blocked by browser verification, so it was not used as evidence. One broad `smart-search search` for CRAG returned an empty main-search result, so the draft relies on the arXiv HTML fetch instead.

## Safe Public Facts

- As of this July 2026 research pass, frontier RAG is better understood as a layered architecture than a single tool choice.
- Agentic RAG adds a control layer around retrieval: decide whether to retrieve, reformulate queries, grade retrieved evidence, iterate when evidence is weak, and generate only when enough context exists.
- Adaptive-RAG argues that queries have different complexity levels; simple requests may not need retrieval, normal factual requests may need one retrieval step, and complex multi-hop questions may justify multi-step retrieval.
- Self-RAG argues against indiscriminately retrieving fixed passages; it retrieves on demand and uses self-reflection signals to judge relevance, support and usefulness.
- CRAG studies what happens when retrieval goes wrong; it uses a retrieval evaluator and corrective actions before generation.
- Anthropic reports that contextual embeddings plus contextual BM25 reduced top-20 retrieval failures in their tests, and reranking further improved the result.
- Qdrant documents hybrid and multi-stage queries, including dense/sparse combinations, prefetch, RRF and DBSF-style fusion.
- Microsoft GraphRAG extracts a knowledge graph, builds communities and summaries, and supports global/local/DRIFT/basic query modes for different question shapes.
- A 2026 RAGSearch paper frames dense RAG and GraphRAG as interchangeable retrieval backends under agentic search, and reports that agentic search narrows the gap while GraphRAG remains useful for complex multi-hop reasoning when offline graph cost is justified.
- BIAU Port currently has an assistant service split that can run public assistant, internal assistant and RAG orchestrator roles separately.
- Current BIAU Port assistant code has public strict grounding, internal `strict/background/none` grounding, Qdrant-backed retrieval when configured, local fallback, credential-request refusal, provider diagnostics and deterministic self-checks.
- Current implementation is a production-oriented first slice, not the full final frontier architecture.

## Uncertain Or Stale Facts

- RAG architectures, model tooling and vector database features move quickly; this draft is based on sources fetched during the July 4, 2026 research pass.
- The public site corpus is still relatively small; GraphRAG or Neo4j should not be described as necessary until relation-heavy questions prove the need.
- No live production quality metric, user feedback dataset, latency SLO or answer win-rate was verified in this drafting pass.
- The actual production model quality depends on private provider configuration and should not be inferred from architecture alone.
- The article does not claim legal, medical, financial, compliance or other high-stakes correctness.

## Forbidden / Private Details

- Do not include API keys, token values, database URLs, private relay URLs, private dashboards, account names, admin secrets, local secret file paths, cloud console screenshots or sensitive metrics.
- Do not expose exact Qdrant endpoint, collection keys, service-role keys, Render/Supabase private configuration, invite codes or internal credentials.
- Do not claim the assistant has reached full Agentic RAG, full GraphRAG, formal eval coverage or production SLA unless those are separately verified.

## Draft Brief

- Column: 知识积累 / Knowledge Notes
- Target reader: 关注 AI 助手、知识库问答、RAG 工程化和项目架构选择的技术访客。
- Reader value: 看懂“前沿 RAG”不是简单堆 GraphRAG/Neo4j，而是一套从路由、混合检索、证据评估、迭代检索到可观测性的系统设计。
- Public angle: 解释 BIAU Port 为什么先选择 Agentic Hybrid RAG + scoped RAG Orchestrator + Qdrant，而不是一开始就引入重图数据库。
- Project-page overlap boundary: 项目页讲助手和站点能力；本文讲架构判断、证据来源、技术取舍和下一阶段路线。

## Article Outline

- 结论 / Thesis
- 问题边界 / Problem Boundary
- 前沿 RAG 的六层结构 / Six Layers
- 技术取舍 / Engineering Tradeoffs
- 泊岸助手当前状态 / Current State
- 后续路线 / Roadmap
- 脱敏例子 / Sanitized Example
- 失败模式 / Failure Modes
- 实践清单 / Practical Checklist

## Model Strategy

- Baseline version: Codex-only scaffold/review.
- Selected model channel: none.
- Recommendation: 先把这版作为事实基线放入站内，后续如要对比润色效果，可以用 `review` profile 做 `--polish-from`，只允许改写 `## Draft Body` 的表达，不允许新增未证实能力、指标或平台细节。
- Reason: 本文是证据密集的架构判断，第一版更需要可追溯性；模型润色适合做语气、结构密度和可读性优化，不适合替代事实判断。

## Review Gates

- [x] Every external technical claim is backed by fetched smart-search evidence.
- [x] Every project claim is backed by repository code evidence.
- [x] No private endpoint, key, account, database URL, cloud secret or admin credential is included.
- [x] The article fits Knowledge Notes rather than Project Notes.
- [x] It does not duplicate project detail pages; it focuses on architecture judgment.
- [x] It clearly separates implemented state from roadmap.
- [x] No live blog model generation or polish happened.
- [ ] Human review should compare this baseline against a future model-polished version before final editorial lock.

## Promotion Checklist

- [x] Convert a reviewed baseline into `src/data/blog-posts/agentic-rag-frontier-2026.ts`.
- [x] Add summary metadata to `src/data/blog.ts`.
- [x] Register loader in `src/data/blogContent.ts`.
- [x] Add curation entry in `src/data/blogCuration.ts`.
- [ ] Run `npm.cmd run blog:audit`.
- [ ] Run `npm.cmd run blog:check`.
- [ ] Run `npm.cmd run assistant:index`.
- [ ] Run `npm.cmd run sitemap:generate`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.

## Draft Body

### 先给结论：前沿 RAG 是一套控制系统

如果把 RAG 理解成“用户问一句，系统拿向量库 top-k 片段塞给模型”，这个理解已经太窄了。到 2026 年，更值得采用的架构不是某一个炫目的标签，而是一套围绕检索质量和回答可信度建立的控制系统：先判断问题是否需要检索，再决定用什么检索策略，检索后评估证据是否足够，必要时重写问题或继续检索，最后用引用、自检和监控约束输出。

所以我更愿意把泊岸助手的路线称为 Agentic Hybrid RAG：Agentic 指它不把检索当成固定步骤，而是有路由、判断和纠错；Hybrid 指它不只依赖向量相似度，而要逐步组合关键词、稀疏检索、向量检索、rerank、实体关系和状态数据。

### 为什么 naive RAG 不够

naive RAG 的问题不在于它没用，而在于它把太多事情假设成固定的。固定 top-k 可能会把无关片段带进上下文；只用 embedding 可能错过错误码、项目名、服务名这类精确字符串；只做一次检索很难回答多跳问题；无论什么问题都检索，又会让创作、闲聊、规划类请求被站内资料拖偏。

Self-RAG 和 Adaptive-RAG 的共同提醒是：不是所有请求都应该走同一条检索链路。简单任务可能不需要检索，普通事实问题适合一次高质量检索，复杂问题才值得进行多步检索、问题改写或证据评估。CRAG 进一步补上另一个现实问题：如果检索本身错了，模型生成再流畅也只是把错误包装得更像答案。

### 前沿 RAG 的六层结构

第一层是任务路由。系统要先判断用户是在问站点事实、请求创作、做方案规划，还是索要敏感信息。泊岸助手现在已经有 `strict/background/none` 这样的 grounding 路由：公开助手默认严格基于公开资料，内部助手在创作类请求中可以不检索，在项目事实问题中回到站内证据。

第二层是上下文构建。Anthropic 的 Contextual Retrieval 说明了一个很朴素但重要的点：chunk 不能脱离文档背景。给 chunk 补充文档级上下文，再同时用于 embedding 和 BM25，可以显著减少他们测试中的召回失败。对泊岸这种项目展示站来说，chunk 里应该带上项目、页面、栏目、状态和适用范围，而不是只保存孤立段落。

第三层是混合检索。Qdrant 官方文档已经把 hybrid 和 multi-stage query 放到核心能力里：可以用 prefetch 做多路候选，用 dense vector 处理语义相似，用 sparse/BM25 风格信号处理精确匹配，再用 RRF 或 DBSF 之类的融合方法合并结果。泊岸先选择 Qdrant，是因为它能承载这条路线，而且比一开始上重型图数据库更轻。

第四层是证据评估与 rerank。检索出来的候选不应直接塞给模型。LangGraph 的 Agentic RAG 教程把流程拆成 retrieve-or-respond、grade documents、rewrite question、generate answer；CRAG 则把检索结果分成 Correct、Incorrect、Ambiguous，并根据结果触发细化、丢弃或补充搜索。工程上，这对应 reranker、证据足够性判断和低置信拒答。

第五层是 agentic loop。真正“进阶”的地方不是让模型多说几句推理，而是让检索成为推理过程中的可控动作：问题不清楚就改写，证据不够就二次检索，引用冲突就降级或拒答，用户不需要站内事实时就不要强行检索。这个循环可以先用规则和小模型评估实现，之后再引入更复杂的 agent graph。

第六层是可观测性和评估。RAG 质量不能只靠主观感觉。至少要记录一次回答的检索模式、候选数量、引用数量、证据是否足够、是否 fallback、是否触发敏感信息拦截。后续还需要小型 eval 集、人工标注、答案对比和状态页可观测性，才能判断“回答变好”到底来自检索、rerank、模型，还是提示词。

### 为什么不是一开始就上 Neo4j 或完整 GraphRAG

GraphRAG 很强，但它不是所有 RAG 的第一步。Microsoft GraphRAG 的路线是从原始文本抽取知识图谱，建立 community hierarchy，再用 Global、Local、DRIFT、Basic 等查询模式回答不同问题。这非常适合需要“connect the dots”的私有数据集，也适合跨文档、多实体、全局总结问题。

但 GraphRAG 的代价也很明确：实体抽取、关系构建、社区摘要、索引维护和更新策略都不是免费的。2026 年 RAGSearch 的结论也更接近互补关系：agentic search 可以让 dense RAG 在多轮检索中补足一部分结构能力，GraphRAG 仍然在复杂多跳问题上有优势，尤其当离线图构建成本能被长期复用时。

泊岸当前的公开语料主要是项目页、状态页、博客和展示资料。这个规模下，先把上下文 chunk、混合检索、rerank、自检和 eval 做扎实，比立刻引入 Neo4j 更能提升回答效果。图能力可以先以轻量实体和关系扩展存在，等真实问题证明需要深图遍历，再上完整 GraphRAG 或图数据库。

### 泊岸助手现在到了哪一步

当前实现已经不是简单的浏览器本地搜索。后端可以按服务边界拆成公开助手、内部助手和 RAG Orchestrator；RAG Orchestrator 可以在配置 Qdrant 时走外部向量检索，也保留本地只读 fallback；公开助手强制使用公开资料，内部助手会根据意图选择 strict、background 或 none grounding；模型输出后还有确定性自检，避免泄露密钥、连接串、私有路径和不该在公开助手里出现的来源格式。

但这仍然只是第一条生产切片。它已经把“架构方向”落到了可运行系统里，却还没有完成完整的 frontier RAG：上下文 chunk 还可以更细，稀疏检索和 dense/sparse fusion 还可以深化，rerank 和 evidence judge 还需要更正式，eval 与状态观测还需要形成闭环，GraphRAG-lite 也还只是后续候选。

### 后续最值得补的不是大词，而是质量闭环

下一阶段应优先做五件事。第一，把公开知识库切分成带上下文的 chunk，让每个片段知道自己属于哪个项目、栏目、状态和版本。第二，在 Qdrant 上补齐 dense + sparse 或关键词信号的混合检索，并把融合策略记录进 retrieval meta。第三，引入 rerank 或轻量 evidence judge，判断证据是否能回答问题。第四，为公开助手建立小型评测集，覆盖项目入口、状态、技术栈、博客知识和敏感信息拒答。第五，把每次回答的 retrieval meta 接入状态页或内部诊断页，让“为什么答得好/不好”可以追踪。

等这些完成后，再考虑 GraphRAG-lite：先从项目、博客、状态、技术栈、服务入口之间的实体关系开始，而不是直接迁移到重图数据库。真正需要 Neo4j 或完整 GraphRAG 的信号，应该是大量问题都在问跨项目依赖、版本演进、状态因果、合同条款关系或多跳证据链。

### 一个脱敏例子

假设用户问：“Legal RAG 的合同审查现在能不能演示？”公开助手应该先进入 strict grounding，只查公开项目页和状态页；如果资料显示入口受登录门禁影响，就说明演示边界和下一步查看位置，不应该编造后台密码。内部助手如果被问“帮我写一段 Legal RAG 项目复盘文案”，可以进入 background grounding，把项目资料当背景，而不是把 citation 路径塞进正文。

再假设用户问“写一首诗”，内部助手就不应该为了使用 RAG 而检索站点资料。这个例子看起来很小，却正是前沿 RAG 的核心：检索不是越多越好，而是要在正确的时刻、用正确的证据、服务正确的任务。

### 常见失败模式

第一个失败模式是过度 RAG：任何请求都检索，导致创作和规划类任务被站内资料污染。第二个是单路召回：只用向量相似度，遇到精确项目名、错误码、状态标签时漏召回。第三个是无评估生成：候选片段不够也强行回答。第四个是图数据库崇拜：还没有证明关系推理需求，就先引入高维护成本组件。第五个是没有 eval：上线后只能凭感觉判断模型“好像变聪明了”。

### 实践检查清单

做一个真正可用的 RAG 助手，可以按这个顺序检查：问题是否需要检索；检索是否同时覆盖语义和精确匹配；chunk 是否保留文档背景；候选是否经过 rerank 或证据评估；证据不足时是否拒答或改写问题；输出是否带引用或可追溯来源；敏感信息是否被拦截；每次回答是否能留下 retrieval meta；是否有离线 eval 和线上观测。

这也是泊岸助手的技术路线：先把 Agentic Hybrid RAG 的控制面做出来，再逐步补强检索质量、评估闭环和关系扩展。前沿不是把所有新名词一次性装进系统，而是让每一层都能解释自己为什么存在、解决了什么问题、什么时候应该被绕开。
