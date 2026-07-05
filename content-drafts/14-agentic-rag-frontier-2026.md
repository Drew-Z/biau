---
slug: "agentic-rag-frontier-2026"
title: "2026 年的 RAG 不再只是检索：从 Agentic RAG 到泊岸助手的架构选择"
column: "knowledge"
series: "AI 应用知识库"
tag: "AI 应用"
status: "draft"
generatedBy: "model-assisted-draft:strong:fallback-1:wei:z-ai/glm-5.2"
generatedAt: "2026-07-04T14:41:56.351Z"
modelStrategy: "本 topic 的 baseline 已由 Codex 基于 smart-search 和代码证据完成；review profile 只能润色 Draft Body 表达，不得新增证据包之外的能力、指标或私有部署细节；Codex 最后做事实、安全和偏差复核。"
---

# 2026 年的 RAG 不再只是检索：从 Agentic RAG 到泊岸助手的架构选择

## Evidence Pack
- https://arxiv.org/html/2501.09136v4
- https://arxiv.org/html/2604.09666v1
- https://www.anthropic.com/engineering/contextual-retrieval
- https://qdrant.tech/documentation/search/hybrid-queries/
- https://docs.langchain.com/oss/python/langgraph/agentic-rag
- https://microsoft.github.io/graphrag/
- https://arxiv.org/html/2310.11511
- https://aclanthology.org/2024.naacl-long.389.pdf
- https://arxiv.org/html/2401.15884
- server/src/app.ts
- server/src/model.ts
- server/src/ragClient.ts
- server/src/ragOrchestrator.ts
- server/src/ragQdrantStore.ts
- server/src/knowledge.ts

## Safe Public Facts
- 截至本轮 2026-07-04 smart-search 调研，前沿 RAG 更像多层控制系统，不是单次 top-k 检索。
- Agentic RAG、Adaptive-RAG、Self-RAG、CRAG、Contextual Retrieval、Qdrant hybrid queries 和 GraphRAG 都支持本文的分层判断。
- 当前泊岸助手代码已经包含公开/内部助手服务边界、RAG Orchestrator、Qdrant adapter、本地 fallback、grounding 路由、敏感信息拒答和确定性自检。
- 当前实现应描述为第一条生产切片，不应描述为完整最终形态。

## Uncertain Or Stale Facts
- 没有在本轮验证线上回答质量指标、用户反馈、延迟 SLO 或生产 eval 结果。
- GraphRAG/Neo4j 是否必要取决于未来真实多跳关系问题和语料规模。
- 模型回答质量仍依赖私有 provider 配置，不能从文章架构直接推导。

## Forbidden / Private Details
- 不要写入 API key、token、数据库连接串、模型中转站真实地址、Qdrant endpoint、Render/Supabase 私有配置或 admin/invite 凭据。
- 不要把当前实现包装成已经完成完整 Agentic RAG、完整 GraphRAG 或正式 SLA。
- 不要编造指标、访问量、生产日志或线上质量结论。

## Draft Brief
- Column: 知识积累 / Knowledge Notes
- Column note: 适合长期有效的技术总结、架构理解、工程治理、AI 应用方法。
- Target reader: 关注 AI 助手、知识库问答、RAG 工程化和项目架构选择的技术访客
- Summary: 基于 smart-search 调研整理 2026 年前沿 RAG 架构：任务路由、上下文 chunk、混合召回、融合排序、证据评估、agentic loop、GraphRAG 边界、eval 和可观测性如何组合成泊岸助手路线。
- Public angle: 解释为什么泊岸助手先选择 Agentic Hybrid RAG + scoped RAG Orchestrator + Qdrant，而不是一开始就引入重图数据库。
- Knowledge points: Naive RAG、Agentic RAG、Adaptive-RAG、Self-RAG、CRAG、Contextual Retrieval、Hybrid Retrieval、Dense/Sparse Fusion、RRF/DBSF、Rerank、Evidence Judge、GraphRAG、Qdrant、Scoped RAG Orchestrator、Grounding Routing、Retrieval Meta、Refusal Policy、RAG Eval Set
- Project examples: BIAU Port 公开助手、内部助手、RAG Orchestrator

## Article Outline
- Problem boundary
- Core mechanism
- Engineering tradeoffs
- Example from this site or a sanitized project
- Common failure modes
- Practical checklist

## Model Strategy
- 本 topic 的 baseline 已由 Codex 基于 smart-search 和代码证据完成；review profile 只能润色 Draft Body 表达，不得新增证据包之外的能力、指标或私有部署细节；Codex 最后做事实、安全和偏差复核。
- Default important-post flow: Codex evidence/scaffold, strong profile draft, review profile polish, then Codex final fact/safety review.
- Single-profile generation is allowed for small or low-risk drafts when the evidence pack is complete.

## Review Gates
- [ ] Every project claim is backed by the evidence pack.
- [ ] No private or sensitive information is included.
- [ ] The draft does not duplicate stable project-detail-page facts.
- [ ] The selected column matches the actual purpose of the article.
- [ ] Hidden drafts remain hidden until explicitly curated.


## Promotion Checklist
- [ ] Convert reviewed content into `src/data/blog-posts/<slug>.ts` only after review.
- [ ] Add summary metadata to `src/data/blog.ts`.
- [ ] Register a loader in `src/data/blogContent.ts` only if the post should be public/loadable.
- [ ] Add `blogCuration` only when ready for public visibility.
- [ ] Run `npm.cmd run blog:audit`, `assistant:index`, `sitemap:generate`, `lint`, and `build` after public promotion.

## Draft Body

> 知识积累 / Knowledge Notes · AI 应用知识库

基于 smart-search 调研整理 2026 年前沿 RAG 架构：任务路由、上下文 chunk、混合召回、融合排序、证据评估、agentic loop、GraphRAG 边界、eval 和可观测性如何组合成泊岸助手路线。

## 1. Problem boundary

截至本轮 2026-07-04 的 smart-search 调研，前沿 RAG 已经不再是单次 top-k 检索加拼装提示词的线性流程，而更像一个多层控制系统。如果仍然把 RAG 当作“向量库 + LLM”的一次性调用，会很快在真实业务中遇到几个边界问题：

- 用户提问是闲聊、事实查询、多跳推理还是敏感操作？单次检索无法区分，导致要么过度检索，要么该拒答时强行拼凑答案。
- chunk 切分后丢失上下文，召回的片段在脱离文档结构后语义漂移，模型只能基于残缺信息生成。
- Dense 向量召回在专有名词、缩写、强关键词场景下失效，而 Sparse 检索又无法处理同义与语义泛化。
- 检索结果里混入低相关、过时或越权片段，模型没有自我评估机制，直接把噪声写进回答。
- 图谱检索（GraphRAG）被当作银弹引入，但真实语料规模和多跳关系问题是否足够支撑其运维成本，往往缺乏评估。

本文要回答的工程问题是：BIAU Port 的公开助手与内部助手在当前阶段，应该如何在这些边界中做出架构选择，既贴合 2026 年前沿趋势，又不超出当前生产切片的承受力。

## 2. Core mechanism

前沿 RAG 架构之所以演化为多层控制系统，是因为多个机制被组合在一起，各自负责不同层级的不确定性。

**任务路由与自适应检索**
Adaptive-RAG 提出的思路是先判断查询复杂度，再决定走单次检索、多跳检索还是直接生成。Agentic RAG 进一步把检索、评估、重试封装成 agent 节点循环。这意味着 RAG 的入口不再无条件触发向量搜索，而是先做一次 grounding routing：判断该问题是否需要检索、需要哪种检索、是否在允许回答范围内。

**Contextual Retrieval**
Anthropic 提出的 Contextual Retrieval 针对的是 chunk 上下文丢失问题。在切分后、向量化前，为每个 chunk 生成一段简短的上下文摘要并拼回 chunk，让召回阶段就能携带文档级别的语义锚点，而不是让模型在生成阶段去猜片段属于哪一部分。

**Hybrid Retrieval 与融合排序**
Qdrant 的 hybrid queries 支持 Dense 与 Sparse 向量在同一查询中并行召回。Dense 负责语义近似，Sparse 负责关键词命中，两者结果通过 RRF（Reciprocal Rank Fusion）或 DBSF（Distribution-Based Score Fusion）融合。融合之后再接 Rerank 模型，对 top-N 做交叉编码精排，把最相关的片段推到最前。

**证据评估与自纠正**
Self-RAG 和 CRAG 引入了对检索证据的质量判断。Self-RAG 让模型对每段检索片段标注是否相关、是否需要补充检索；CRAG 在检索结果质量低时触发知识库修正或回退到更广的搜索。这类机制构成了 agentic loop 里的“判断 + 重试”环节，避免模型无条件信任第一次检索结果。

**GraphRAG 的适用边界**
GraphRAG 通过实体抽取与社区层级摘要，在多跳关系推理上表现突出。但它对语料结构化程度、实体抽取质量、图数据库运维成本都有较高要求。在真实多跳关系问题占比不高、语料规模未达到图结构收益拐点之前，引入完整图数据库往往是过度工程。

**Eval 与可观测性**
RAG Eval Set 和 Retrieval Meta 是让上述机制可审计的基础。没有固定的评测集和检索元数据记录，就无法判断路由是否正确、召回是否命中、融合排序是否有效、拒答策略是否合理。可观测性不是附加项，而是 RAG 作为控制系统的前提。

## 3. Engineering tradeoffs

把上述机制组合成泊岸助手的路线时，核心权衡在于“控制复杂度”与“系统可维护性”之间的平衡。

第一层权衡：Agentic RAG 还是 Naive RAG。
Naive RAG 实现简单，但在查询类型分化后会出现大量无效检索和错误回答。Agentic RAG 引入路由、评估和重试，代价是延迟增加、调用链变长、调试成本上升。泊岸助手选择 Agentic Hybrid RAG，原因是公开助手面对的问题分布不可控，必须有路由和评估层来过滤无效查询和低质量检索。

第二层权衡：是否引入 GraphRAG。
GraphRAG 在多跳关系推理上确实强，但当前 BIAU Port 语料以文档问答和流程指引为主，真实多跳关系问题占比有限。引入 Neo4j 或完整图数据库意味着额外的实体抽取 pipeline、图索引维护和查询优化成本。泊岸助手选择先不引入重图数据库，而是用 Qdrant 的 hybrid queries 覆盖语义 + 关键词召回，保留未来在语料规模和问题类型发生变化时引入 GraphRAG 的空间。

第三层权衡：融合排序策略选择。
RRF 实现简单，不依赖分数绝对值，适合 Dense 和 Sparse 分数尺度不一致的场景。DBSF 在分数分布可控时更精细，但对分数归一化敏感。泊岸助手在当前切片优先采用 RRF，原因是实现成本低、对多 provider 分数差异容忍度高。

第四层权衡：拒答策略。
没有拒答策略的 RAG 会在敏感信息和知识边界外强行编造。泊岸助手在 grounding routing 层加入 refusal policy，对超出知识范围、触及敏感信息或检索证据不足的查询直接拒答或回退到本地 fallback，而不是让模型自由生成。

## 4. Example from this site or a sanitized project

泊岸助手当前实现以 BIAU Port 公开助手和内部助手为服务边界，核心代码集中在 `server/src/` 下。

- `server/src/app.ts` 定义公开助手与内部助手的服务入口与路由边界。
- `server/src/ragOrchestrator.ts` 实现 scoped RAG Orchestrator，负责查询路由、检索编排和结果评估。
- `server/src/ragQdrantStore.ts` 是 Qdrant adapter，封装 hybrid queries 的 Dense + Sparse 召回。
- `server/src/ragClient.ts` 处理模型调用与本地 fallback 逻辑。
- `server/src/model.ts` 和 `server/src/knowledge.ts` 分别管理模型配置与知识源元数据。

当前架构选择是 Agentic Hybrid RAG + scoped RAG Orchestrator + Qdrant，而非一开始就引入重图数据库。具体路径是：查询进入 orchestrator 后先经过 grounding routing 判断是否需要检索、是否在允许范围内；需要检索的查询走 Qdrant hybrid queries 做 Dense + Sparse 并行召回，结果用 RRF 融合后送入 Rerank；精排后的片段经过 evidence judge 评估相关性，不足则触发重试或回退；最终生成阶段携带 retrieval meta 记录检索路径、命中片段和路由决策，供后续 eval 和可观测性分析使用。

需要强调的是，当前实现是第一条生产切片，不应被描述为完整最终形态。本文的架构描述不能直接推导出线上回答质量，模型回答质量仍依赖私有 provider 配置。GraphRAG / Neo4j 是否必要，取决于未来真实多跳关系问题的占比和语料规模变化。

> 提醒：以上代码引用仅基于本轮调研可见的文件路径与结构描述。正式发布前请回到 `server/src/` 下各文件、对应测试、部署脚本和 Trellis 任务核验当前实现是否与本文描述一致，尤其关注 grounding routing、refusal policy 和 fallback 逻辑是否已经落地。

## 5. Common failure modes

在 2026 年的 RAG 实践中，以下失败模式反复出现：

- **路由缺失导致全量检索**：没有 grounding routing，所有查询都走向量检索，闲聊和敏感问题也被送进知识库，既浪费资源又增加泄漏风险。
- **chunk 上下文丢失**：切分时未做 contextual 处理，召回片段在脱离文档结构后语义偏移，模型基于残缺信息生成。
- **单路召回盲区**：只依赖 Dense 向量，遇到专有名词和强关键词时召回率骤降；只依赖 Sparse，遇到同义改写和语义泛化时失效。
- **融合排序未做归一化**：Dense 和 Sparse 分数尺度不一致直接加权，导致某一路结果被系统性压制。
- **无条件信任检索结果**：没有 evidence judge 或 CRAG 机制，低相关片段被直接拼入提示词，模型把噪声当作事实生成。
- **GraphRAG 过早引入**：语料规模和多跳问题占比不足，图数据库运维成本远高于收益，实体抽取质量不稳定还引入新噪声。
- **缺乏 eval set 导致无法迭代**：没有固定评测集和 retrieval meta，无法判断某次改动是改善还是回退，整个系统处于盲调状态。
- **拒答策略缺失**：知识边界外的问题被强行回答，敏感信息没有显式拦截，模型在无证据时编造内容。

## 6. Practical checklist

如果要在当前阶段落地一套接近 2026 年前沿水平的 RAG 架构，以下清单可以作为起步框架：

1. **先建 grounding routing**：在检索前判断查询类型、是否需要检索、是否在允许回答范围内，对敏感和越权查询走 refusal policy。
2. **chunk 阶段引入 contextual 处理**：在向量化前为每个 chunk 生成上下文摘要，保留文档级语义锚点。
3. **启用 hybrid retrieval**：Dense + Sparse 并行召回，用 Qdrant hybrid queries 或等价方案，覆盖语义和关键词两类命中。
4. **融合排序先选 RRF**：实现简单、对分数尺度差异容忍度高，后续再根据 eval 结果决定是否切换到 DBSF。
5. **接 Rerank 精排**：对融合后的 top-N 做交叉编码精排，把最相关片段推到生成上下文的最前。
6. **加 evidence judge**：对检索片段做相关性评估，不足时触发重试或回退，避免无条件信任第一次结果。
7. **保留 retrieval meta**：记录路由决策、召回片段、融合分数、重试次数，作为 eval 和可观测性的基础。
8. **建 RAG Eval Set**：固定查询集和期望证据，每次改动后跑回归，判断路由、召回、排序、拒答是否退化。
9. **GraphRAG 推迟引入**：确认真实多跳关系问题占比和语料规模达到拐点后，再评估是否引入图数据库，当前用 hybrid retrieval 覆盖。
10. **明确当前切片边界**：把当前实现定义为第一条生产切片，不要包装成完整 Agentic RAG 或正式 SLA，留出迭代空间。

---

**证据来源**

- Agentic RAG with LangGraph: https://docs.langchain.com/oss/python/langgraph/agentic-rag
- Adaptive-RAG: https://arxiv.org/html/2501.09136v4
- Self-RAG: https://arxiv.org/html/2310.11511
- CRAG: https://arxiv.org/html/2401.15884
- Contextual Retrieval — Anthropic: https://www.anthropic.com/engineering/contextual-retrieval
- Qdrant Hybrid Queries: https://qdrant.tech/documentation/search/hybrid-queries/
- GraphRAG — Microsoft: https://microsoft.github.io/graphrag/
- RRF / Fusion 相关: https://aclanthology.org/2024.naacl-long.389.pdf
- 前沿 RAG 综述: https://arxiv.org/html/2604.09666v1
- 项目代码: `server/src/app.ts`, `server/src/model.ts`, `server/src/ragClient.ts`, `server/src/ragOrchestrator.ts`, `server/src/ragQdrantStore.ts`, `server/src/knowledge.ts`
