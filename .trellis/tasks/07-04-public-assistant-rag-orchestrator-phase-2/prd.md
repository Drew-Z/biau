# Public Assistant RAG Orchestrator Phase 2

## Goal

把公开助手从已经完成的“本地 Agentic Hybrid RAG 基线”推进到真正能提升回答效果的二期系统：新增一个可独立演进的 RAG Orchestrator，接入外部向量检索、可插拔 reranker、citation/self-check、质量评测集和低敏观测，让 Mimo 等生成模型在更好的证据上下文里回答，而不是只依赖当前站点内置的静态检索结果。

这不是重新做一个通用聊天机器人。公开助手仍只能回答 BIAU Port 公开资料范围内的问题，重点提升站点概览、项目体验、技术实现、演示入口、状态可靠性和博客知识类问题的回答质量。

## User Value

- 访客问“这个网站能看什么”“哪个项目可以演示”“Legal RAG 怎么体验”“哪些项目用了 React/Vite/Semi”时，回答更像一个懂项目关系的产品助手，而不是简单命中几条资料。
- 模型回答前能拿到更高质量的上下文：语义召回、关键词召回、实体关系扩展、重排和证据足够性判断。
- 公开助手可以持续接入更多博客、项目、状态和发布信息，但不会因为资料增多而检索噪声变大。
- 回答质量可以被评测：同一批问题能比较召回、citation、拒答和最终回答质量的变化。
- 未来可以接 Supabase pgvector、Render Postgres pgvector、Cloudflare Vectorize 或 Neo4j，而主站前端不需要重写。

## Confirmed Facts

- 一期任务 `07-04-public-assistant-kg-lite` 已完成，本地 MVP 已有：
  - `server/data/public-knowledge.json`
  - `server/data/public-knowledge-v2.json`
  - docs / chunks / entities / relations / fallback bundle
  - intent routing、关键词扩展、轻量实体关系扩展、确定性 rerank
  - Cloudflare Pages Function、Express API、浏览器 fallback 的公开助手路径
  - `npm.cmd run assistant:kg-check`
- 生产公开助手模型配置已可用，`/api/health` 显示：
  - `mode=model`
  - `modelConfigured=true`
  - `model=mimo-v2.5-pro`
  - `provider=mimo-compatible`
- 现有 RAG 外部合同只是预留配置：
  - `ASSISTANT_RAG_API_BASE_URL`
  - `ASSISTANT_RAG_API_KEY`
  - `ASSISTANT_RAG_TIMEOUT_MS`
- 当前还没有真实外部 RAG Orchestrator、向量库、embedding 同步、模型级 reranker、self-check 工作流或回答质量评测集。
- 用户明确禁止对任何模型或中转站做测活、doctor、diagnose、ping 或小测试 prompt。真实模型验证必须使用用户批准的真实任务问题。

## Requirements

### R1. Architecture Boundary

- 新增 RAG Orchestrator 作为公开助手和检索/重排/自检/可选存储之间的边界层。
- 主站前端只继续调用现有公开助手接口，不直接连接向量库、图数据库、embedding provider、reranker provider 或模型中转站。
- Cloudflare Pages Function 和 Express API 只能通过服务端环境变量调用 Orchestrator。
- Orchestrator 不可用时必须回退到现有本地 Agentic Hybrid RAG，不让公开助手完全失效。

### R2. Retrieval Quality

- Orchestrator 必须支持混合检索：
  - 语义向量召回；
  - 关键词/BM25 或等价 exact-match 召回；
  - 元数据过滤；
  - 项目、技术、demo、状态、博客等实体关系扩展。
- 检索必须返回可映射回当前 citation 卡片的数据，不允许返回无法公开解释的上下文。
- 检索结果必须有明确排序依据和低敏 diagnostics，例如 retrieval mode、candidate count、citation count、fallback reason。

### R3. Rerank And Self-Check

- Reranker 必须可插拔：
  - 首版可用 deterministic/mock reranker；
  - 后续可接模型级 reranker 或第三方 rerank API；
  - reranker 失败时回退到确定性评分。
- Self-check 至少覆盖：
  - 证据数量是否足够；
  - citation 是否支持回答要点；
  - 公开资料不足时是否拒绝补造；
  - 回答正文是否避免路径堆叠、来源日志、provider 细节和内部部署细节。

### R4. Data Sync

- Orchestrator 的首批知识来源必须来自当前仓库生成的公开知识 V2，而不是抓取私有文件或后台数据。
- 同步流程必须可重复、可验证、可回滚。
- 同步产物不得包含真实密钥、私有端点、数据库 URL、后台密码、模型 relay URL、系统提示词或未公开业务数据。

### R5. Evaluation Harness

- 必须建立公开助手质量评测集，用固定问题覆盖：
  - 站点概览；
  - 可演示项目；
  - Legal RAG 演示入口和登录门禁；
  - ERP 注册/登录状态；
  - Pet 展示和 APK gate；
  - 技术栈反查；
  - 可靠性/状态页；
  - 博客/知识积累；
  - 资料不足时的拒答。
- 评测必须输出低敏指标，例如 citation 命中、是否拒答、是否引用目标项目、是否泄露敏感信息、是否包含生硬路径。
- 评测默认使用本地/mock 模型和确定性 adapter，不调用真实模型通道。

### R6. Infrastructure Recommendation

- 推荐二期第一落点：Render 或当前 Node 服务承载 Orchestrator API，Supabase Postgres + pgvector 作为优先外部检索存储。
- Render Postgres + pgvector 可作为更集中部署的备选。
- Cloudflare Vectorize / AI Search 可作为 Cloudflare 原生路线备选。
- Neo4j/Aura 暂不作为第一落点，只有当真实问题证明需要深图遍历、Cypher、图算法或图原生解释时再引入。

### R7. Safety And Manual Gates

- 不提交真实 API key、token、密码、数据库 URL、私有 endpoint、模型 relay URL 或签名路径。
- 不做模型测活；如果需要线上效果验证，必须使用用户批准的真实问题。
- 创建 Supabase/Render/Cloudflare/Neo4j 等云资源、配置密钥、付费服务选择、生产部署验证都记录为人工 gate，不阻塞本地 Orchestrator scaffold、mock adapter 和评测集。

## Acceptance Criteria

- [ ] 新任务明确说明一期已完成的是本地 Agentic Hybrid RAG MVP，二期目标是外部 Orchestrator + 检索质量系统。
- [ ] `design.md` 定义 RAG Orchestrator 架构、HTTP contract、数据流、retrieval/rerank/self-check、回退路径和存储选型。
- [ ] `implement.md` 给出从本地 mock 到外部向量库的可执行阶段，不要求一次性创建云资源。
- [ ] 新增或规划的生产配置不得把密钥、私有 URL 或模型 relay 细节暴露到 `VITE_*` 或前端 bundle。
- [ ] 评测集成为二期第一实现切片之一，且默认不调用真实模型。
- [ ] Orchestrator 接入必须保持现有公开助手 response shape：`answer`、`citations`、`meta`。
- [ ] Orchestrator 不可用时公开助手仍回退到现有本地公开知识。
- [ ] 手动事项记录到长期主任务或本任务的 manual queue。
- [ ] `git diff --check` 通过。

## Out Of Scope

- 不把公开助手扩展成内部助手或通用聊天。
- 不直接把 Neo4j 作为第一阶段必选项。
- 不抓取私有文档、后台数据或用户聊天记录进公开知识库。
- 不在本任务里提交真实 Supabase/Render/Cloudflare/Neo4j 凭据。
- 不做任何模型或中转站测活。

## Open Questions

None. 默认推荐路线是：先实现本地/mock Orchestrator contract 与评测集，再接 Supabase pgvector 或 Render Postgres pgvector；Neo4j 后置。
