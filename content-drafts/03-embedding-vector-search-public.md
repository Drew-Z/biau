---
slug: "embedding-vector-search-public"
title: "Embedding 与向量检索：业务文本如何进入语义搜索"
column: "knowledge"
series: "AI 应用知识库"
tag: "AI 应用"
sourceCurrentSlug: "embedding-vector-search"
status: "draft"
generatedBy: "codex-only-scaffold"
generatedAt: "2026-07-02T00:00:00.000Z"
modelStrategy: "Codex-only scaffold/review; model channel: none"
---

# Embedding 与向量检索：业务文本如何进入语义搜索

## Evidence Pack
- `scripts/blog-rewrite-plan.json` 中的 `embedding-vector-search-public` 选题。
- `src/data/blogShared.ts` 的 `knowledge` 栏目定义。
- `content-drafts/01-rag-overview-public.md` 和 `content-drafts/02-chunk-strategy-public.md`，用于检查主题边界和重复风险。
- `legal-rag/docs/architecture.md`：RAG pipeline、运行时边界、memory/pgvector 存储模式、质量报告和拒答策略。
- `legal-rag/apps/api/src/documents/ingestion-service.ts`：导入链路清洗文本、项目内去重、切分、批量 embedding、写入 vector store。
- `legal-rag/apps/api/src/chunks/splitter.ts`：按段落和条款边界切 chunk，并保留 section、page、chunkIndex、tokenEstimate、projectId 等 metadata。
- `legal-rag/apps/api/src/vector-store/types.ts`：`VectorStore` 接口包含 `upsertChunks`、`similaritySearch`、`keywordSearch`，并支持 `projectId` filter。
- `legal-rag/apps/api/src/vector-store/memory.ts`：内存实现使用 cosine similarity 做向量相似度，并用标题、章节、正文做关键词评分。
- `legal-rag/apps/api/src/vector-store/pgvector.ts`：pgvector 实现使用 PostgreSQL vector 距离排序，关键词侧使用 text search 与 `ILIKE` 兜底。
- `legal-rag/apps/api/src/rag/rag-service.ts`：查询链路会 rewrite question、生成 query embedding、召回 vector/keyword candidates、合并过滤、rerank，再返回 answer、citations 和 diagnostics。
- `legal-rag/apps/api/src/config/env.ts` 和 `legal-rag/apps/api/src/model-providers/openai-compatible.ts`：本地 mock 与 OpenAI-compatible provider 的配置边界，以及 embedding 维度校验。
- `legal-rag/apps/api/src/validate.ts`：本地验证会检查向量候选、重排候选、引用、拒答和项目隔离等行为。
- `legal-rag/apps/web/src/components/QaView.vue` 与 `legal-rag/apps/web/src/components/QualityView.vue`：前端会展示 answer source、向量/关键词/过滤/重排 diagnostics，以及 runtime vector store / embedding model 摘要。

## Safe Public Facts
- Embedding 在这类系统里承担的是把文本和问题转成可比较的数值向量，后续检索再根据相似度排序候选片段。
- Legal RAG 的入库链路会清洗文本、按项目范围做内容 hash 去重、切分 chunk、批量生成 embedding，并将 chunk 与 embedding 写入 `VectorStore`。
- `VectorStore` 把相似度检索和关键词检索放在同一个接口边界内，查询时可以用 `projectId` 做项目隔离。
- 内存向量库实现使用 cosine similarity，适合本地演示和无外部依赖验证。
- pgvector 实现把 embedding 存入 PostgreSQL vector 列，向量召回使用 vector 距离排序，并保留关键词检索作为精确命中补充。
- RAG 查询链路不是只跑向量搜索：它会合并向量候选和关键词候选，过滤弱相关结果，再进行轻量 rerank。
- 返回结果包含 citations 和 diagnostics，前端可展示向量候选数、关键词候选数、过滤数、重排数和 answer source。
- 项目支持 mock/memory 与 OpenAI-compatible/pgvector 两类运行模式，但公开草稿不应写入真实模型渠道、数据库连接或部署私有信息。
- 这篇文章属于“知识积累 / Knowledge Notes”，重点解释工程机制，不重复项目详情页的完整功能清单。

## Uncertain Or Stale Facts
- 线上服务当前使用的真实模型、真实向量维度、数据库状态、数据规模和访问量需要发布前重新核验。
- pgvector 的具体索引类型、参数和生产调优策略没有在本轮证据里完整展开，不能写成已经完成的优化。
- 公开发布前应再次检查 Legal RAG 最新代码，确认 diagnostics 字段、阈值和前端展示没有变更。
- 是否需要配图或截图，应在发布任务里基于真实 UI 截图或自制流程图重新决定。

## Forbidden / Private Details
- Do not include real IPs, accounts, keys, database URLs, private dashboards, local secret paths, customer names, or sensitive metrics.
- Do not include private model relay URLs, production database strings, auth users, cookies, session secrets, deployment console screenshots, or local absolute secret paths.
- 不公开真实部署后台、真实文档语料、客户合同、访问数据、评测私有样本或未脱敏日志。
- 不把 Legal RAG 包装成正式法律意见服务；所有高风险法律判断都应保留人工复核边界。

## Draft Brief
- Column: 知识积累 / Knowledge Notes
- Column note: 适合长期有效的技术总结、架构理解、工程治理、AI 应用方法。
- Target reader: 想把业务文档接入 AI 问答系统的全栈开发者
- Summary: 用通俗语言解释 embedding、向量相似度、TopK、阈值和 metadata filter。
- Public angle: 让读者理解向量检索不是魔法，而是把文本转成可比较的语义坐标。
- Knowledge points: Embedding、向量检索、TopK、metadata filter
- Project examples: Legal RAG 向量召回、PostgreSQL/pgvector 生产化方向

## Article Outline
- 问题边界 / Problem Boundary
- 核心机制 / Core Mechanism
- 检索链路 / Retrieval Flow
- 工程取舍 / Tradeoffs
- 脱敏项目例子 / Sanitized Project Example
- 常见失效模式 / Failure Modes
- 实用检查清单 / Practical Checklist

## Model Strategy
- Writing mode: Codex-only scaffold/review.
- Model channel: none.
- 本轮没有调用 `strong`、`review` 或 `fast` profile，也没有运行 live doctor、`--generate` 或 `--polish-from`。
- 如果未来要模型辅助长文改写，应先运行私有模型配置向导和离线 masked status/doctor，再串行使用 `strong` 起草、Codex 比对融合、`review` 润色，最后由 Codex 做事实和安全复核。

## Draft Body

### 问题边界：向量检索解决的是什么

在 RAG 或企业知识库里，Embedding 与向量检索经常被讲得像一层魔法：把文档“向量化”，再问问题，系统就能找到答案。真正落到业务文本时，它解决的事情更具体：把用户问题和文档片段放到同一个可比较空间里，让系统先找出语义上接近的候选证据。

这件事并不等于“模型理解了全部业务”。Embedding 只是把文本压缩成数值表示；向量检索只是按相似度排序；最后能不能回答得可靠，还取决于 chunk 切分、metadata、关键词补充、过滤阈值、rerank、引用展示和拒答策略。

因此，向量检索适合回答“哪几段资料可能相关”，不适合单独承担“结论一定正确”。在合同审查、制度问答和技术文档检索里，工程目标不只是召回语义相似片段，还要让用户能看见证据、点击引用、判断上下文是否足够。

### 核心机制：把文本变成可比较的语义坐标

Embedding 模型接收一段文本，输出一个固定长度的数字数组。数组本身对人不可读，但可以用距离或夹角来比较两段文本的接近程度。Legal RAG 的本地 mock 模式可以生成确定性的本地向量，OpenAI-compatible 模式则可以接入真实 embedding provider；代码还会检查返回向量维度是否符合配置，避免把不匹配的向量写入检索链路。

查询时同样要把问题转成 embedding。系统拿 query embedding 去向量库里找 TopK 片段：在内存实现里，这一步使用 cosine similarity；在 pgvector 实现里，则把 embedding 存到 PostgreSQL vector 列，通过 vector 距离排序返回候选。

TopK 不是答案数量，而是候选池大小。候选池越小，响应更轻，但容易漏掉相关证据；候选池越大，覆盖更好，但后续过滤和重排压力也更高。Legal RAG 的 RAG service 会先召回一批候选，再经过合并、阈值过滤和 rerank，最后只把更少的证据交给回答阶段。

### 检索链路：向量召回不应独自工作

业务文本有一个常见特点：语义相关和精确命中经常不是同一件事。用户问“违约金比例是否过高”，向量检索可能找到“违约责任”相关条款；但金额、日期、条款号、合同编号、错误码这类信息，更依赖关键词或结构化 metadata。

Legal RAG 把 `similaritySearch` 和 `keywordSearch` 放在同一个 `VectorStore` 接口里。查询时先改写问题，再分别取向量候选和关键词候选，之后按 chunk id 合并。合并后的候选既保留 `vectorScore`，也保留 `keywordScore`，这样后续逻辑可以同时看到语义信号和精确命中信号。

这也是为什么向量检索常常要和 metadata filter 一起使用。项目内的 `projectId` filter 可以让检索只发生在当前项目空间，避免把其他工作区的文档混进结果。对公开知识库、企业租户、合同项目来说，这种边界比单纯提高相似度更基础。

### 工程取舍：memory 与 pgvector 各自适合什么阶段

内存向量库适合早期闭环。它启动快，不依赖数据库和真实模型，适合验证 chunk、citation、拒答和前端展示是否通顺。Legal RAG 的验证脚本就在 mock/memory 模式下跑本地服务，并检查导入、去重、项目隔离、RAG query、引用和 diagnostics。

pgvector 更适合需要持久化和部署的阶段。它把文档、chunk metadata 和 embedding 存在 PostgreSQL 里，服务重启后数据不会丢，后续也更容易接质量报告、审计记录和长期评测趋势。但这不意味着“换成 pgvector 就生产化完成”。索引、维度、召回阈值、查询性能、迁移策略和备份恢复仍然需要单独验证。

更稳的做法，是让两种实现共享接口。上层 RAG service 不直接关心候选来自内存还是 pgvector；它只拿到 scored chunks，并继续执行合并、过滤、rerank、引用和拒答。这样早期演示和后续持久化可以共用一套业务链路。

### 脱敏项目例子：从导入文档到可引用回答

以一个合同问答工作台为例，文档导入时先清洗文本，再按项目范围计算 hash，避免同一项目里重复入库。随后 splitter 按段落、条款边界和长度限制切出 chunk，并保留标题、章节、页码估算、chunkIndex、tokenEstimate 和 projectId 等 metadata。

每个 chunk 的正文会进入 embedding batch，向量结果和 chunk 一起写入 vector store。用户提问后，系统先把问题改写成更适合检索的形式，再生成 query embedding，并召回向量候选与关键词候选。弱相关候选会被过滤，剩余结果进入轻量 rerank，最终回答阶段只基于通过门槛的证据生成内容。

这个例子里，前端不是只展示一段答案。它还展示 citations、命中片段数量、向量候选数、关键词候选数、过滤数、重排数和回答来源。对用户来说，这些 diagnostics 是理解系统“为什么这么答”的入口；对开发者来说，它们是定位问题的仪表盘。

### 常见失效模式

第一类问题是把相似度当成正确性。两个片段语义相近，不代表它们能支撑同一个结论。尤其是合同和制度文本，例外条件、适用范围和否定表达很容易被相似度掩盖。

第二类问题是忽视精确词。金额、日期、条款号、专有名词和错误码可能在向量空间里不显眼，却是用户问题的关键。只靠向量召回，容易得到“主题相关但事实不准”的候选。

第三类问题是 metadata 丢失。没有项目、章节、页码或 chunkIndex，引用就很难被用户复核；没有 project filter，不同项目的资料还可能混在一起。

第四类问题是阈值和拒答缺位。召回不到足够证据时，系统应该承认当前资料无法确认，而不是让模型硬编一个顺滑答案。Legal RAG 的回答链路保留了资料不足时的 refusal 分支，这一点比追求每问必答更重要。

### 实用检查清单

- [ ] 抽样检查 chunk：每个 chunk 是否能作为相对完整的证据单元。
- [ ] 检查 embedding 维度：真实 provider 返回的向量长度是否与配置一致。
- [ ] 同时看向量和关键词候选：不要只观察最终答案。
- [ ] 验证 metadata filter：跨项目、跨租户或跨数据集时不能互相污染。
- [ ] 记录 diagnostics：至少能看到候选数、过滤数、重排数和回答来源。
- [ ] 设计拒答路径：证据不足时返回“无法确认”，并避免给出伪引用。
- [ ] 发布前复核公开边界：不写真实密钥、私有模型渠道、数据库连接、客户资料或敏感指标。

## Review Gates
- [x] Every project claim is backed by the evidence pack.
- [x] No private or sensitive information is included.
- [x] The draft does not duplicate stable project-detail-page facts.
- [x] The selected column matches the actual purpose of the article.
- [x] Hidden drafts remain hidden until explicitly curated.
- [x] No live model request happened in this run.
- [ ] 发布前重新核验 Legal RAG 最新代码、公开截图和线上状态。


## Promotion Checklist
- [ ] Convert reviewed content into `src/data/blog-posts/<slug>.ts` only after review.
- [ ] Add summary metadata to `src/data/blog.ts`.
- [ ] Register a loader in `src/data/blogContent.ts` only if the post should be public/loadable.
- [ ] Add `blogCuration` only when ready for public visibility.
- [ ] Run `npm.cmd run blog:audit`, `assistant:index`, `sitemap:generate`, `lint`, and `build` after public promotion.
