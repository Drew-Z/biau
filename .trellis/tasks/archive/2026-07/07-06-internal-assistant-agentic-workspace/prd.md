# Internal Assistant Agentic Workspace Final Architecture

## Goal

把内部助手从“聊天接口 + 可选 RAG 检索”的工作流，升级为 **Agentic Workspace** 产品形态：由成员专属模型渠道驱动的内部 Agent 负责判断、计划、调用工具、校验证据、记录轨迹并生成回答。RAG 不再是主流程，而是 Agent 可选择调用的工具之一。

第二轮调研后，技术架构命名修正为 **Agentic Workflow Runtime for the Internal Workspace**。也就是：Workspace 是用户看到的工作台体验，Runtime 是代码里可验证的状态化 Agent 工作流、typed tools、权限策略、memory、trace、guardrails 和 citation/self-check。

本任务不接受“先做一个临时 RAG 中间态”的目标。第一版落地就必须按最终架构边界实现：Agent run loop / stateful workflow、工具注册表、权限策略、工具调用轨迹、RAG/status/project/studio/memory 等工具合同、citation/self-check/guardrail、前端工具轨迹展示和无 live model 的 mock 验证。

## User Value

- 内部成员可以把助手当成工作台，而不是问答框：它能根据问题自动选择查知识库、查项目状态、查项目资料、生成草稿、整理计划或直接写作。
- 管理员能看到每次回答用了哪个成员模型渠道、调用了哪些工具、是否经过 RAG、证据是否足够、有没有降级。
- 系统可以继续使用 Qdrant / RAG Orchestrator / internal knowledge / Studio / status reports 等现有底座，但由 Agent 统一编排，而不是让 UI 或 route 硬编码大量 intent 分支。

## Confirmed Product Decisions

- Internal Agent write boundary: first implementation allows `draft-write` only.
- `draft-write` means the Agent may create Studio drafts, sync plans, session preference notes, AI Daily drafts, project-detail drafts or status-copy drafts that require human review.
- Normal chat must not directly publish public content, deploy changes, mutate member/channel/admin settings, change invites, run production checks, or call live external providers for diagnostics.
- Broader write permissions are future work and require separate review after trace, eval and guardrail behavior are reliable.

## Confirmed Facts

- `server/src/app.ts:340` 当前内部聊天入口是 `POST /chat/internal`；它先用 `planAssistantAnswer()` 做代码侧意图判断，再决定是否调用 `retrieveAssistantContext()`，然后调用 `generateAnswer()`。
- `server/src/model.ts:226` 的 `planAssistantAnswer()` 是硬编码关键词/意图分支；这正是本任务要替换为 Agent 工具选择的核心位置。
- `server/src/model.ts:398` 的 `generateAnswer()` 已经支持成员级 `modelChannelId`，可作为 Agent 的模型执行底座。
- `server/src/ragClient.ts:28` 已经有 scoped RAG retrieve adapter，并能在 Orchestrator 不可用时回退本地 retrieval。
- `server/src/app.ts:640` 到 `server/src/app.ts:754` 已有内部知识文档与 sync route，可作为 `knowledge.*` / `rag.sync` 工具边界。
- `server/src/app.ts:38` 和 `server/src/app.ts:46` 已挂载 Studio API；Studio 草稿/AI Daily/项目详情计划可以成为 draft-only 写工具。
- `server/src/app.ts:970` 的 usage serializer 已能返回当次低敏模型渠道信息；Agent trace 应扩展这个诊断面。
- `src/pages/AssistantPage.tsx` 已有内部助手工作台、会话历史、成员模型渠道和回答诊断区域；需要扩展为工具轨迹与 Agent 状态，而不是另建孤立页面。
- `package.json` 已有无 live model 验证命令：`server:smoke`、`assistant:service-modes-smoke`、`assistant:rag-smoke`、`assistant:eval`、`studio:smoke`、`lint`、`build`、`check:ui`。
- Smart-search evidence saved under `C:\tmp\smart-search-evidence\20260706-agentic-rag-frontier` supports the target direction:
  - Agentic RAG survey: Agentic RAG is the evolution from static RAG toward planning, tool use, reflection, memory and multi-agent/control structures.
  - Anthropic effective agents: use simple composable patterns; distinguish predictable workflows from agents where the model dynamically directs tools/processes; agentic systems trade latency/cost for flexibility.
  - OpenAI Agents SDK docs: agents plan, call tools, collaborate across specialists and keep state; application should own orchestration, tool execution, approvals and state when needed.
  - LangGraph self-reflective RAG: fixed retrieve-then-generate is insufficient; state-machine style loops support query rewrite, document grading, regeneration and self-correction.
  - Microsoft GraphRAG / LazyGraphRAG: graph retrieval is valuable for relational/global questions, but cost and update behavior matter; graph should be a tool/layer, not automatically the whole system.
- Second smart-search review saved under `C:\tmp\smart-search-evidence\20260706-internal-agent-architecture-review` refines the naming:
  - "Agentic Workspace" is a valid product/experience target, but not precise enough as an implementation architecture.
  - LangGraph and Google Cloud guidance support a state graph / workflow runtime mental model with persistence, memory, HITL, custom logic and bounded loops.
  - OpenAI Agents SDK TypeScript supports the same primitive set: agents, tools, handoffs, guardrails, sessions, HITL and tracing.
  - Microsoft GraphRAG remains a retrieval option for relational/global questions, not a required first dependency.
  - Anthropic and Google both caution against unnecessary autonomous complexity; single-supervisor Agent plus typed tools is the recommended first production shape, with future handoff/subagent slots.

## Requirements

- R1. Internal chat must route through an Agentic Workflow Runtime instead of direct `planAssistantAnswer()` branching.
- R2. The Agent must own a typed tool registry. Minimum tools:
  - `rag.retrieve`: scoped public/internal retrieval through existing RAG Orchestrator adapter.
  - `status.query`: read public status / synthetic / manual-gate summaries.
  - `project.lookup`: read sanitized project facts, tech stack, links and detail content.
  - `knowledge.search`: search internal knowledge documents and public knowledge summaries.
  - `studio.draft`: create or plan Studio drafts only; no direct public publish.
  - `memory.search` / `memory.write`: use member/session history summaries without leaking cross-member content.
  - `answer.direct`: direct model response when no tool is needed.
- R3. Tool selection should be model-driven when a configured member model channel supports it, with a deterministic mock planner used for smoke tests and no-live validation.
- R4. The implementation must not depend on one proprietary framework as the only runtime path. It may borrow concepts from Agents SDK / LangGraph / Google agent patterns, but the repo should own the contracts: tool schemas, run loop/state graph, trace events, guardrails, persistence and tests.
- R5. Every Agent answer must return low-sensitive meta containing model channel, selected tools, tool call statuses, retrieval/citation summary, guardrail result and fallback reason when applicable.
- R6. Tools must have explicit permission classes:
  - `read`: safe read-only project/status/RAG/memory search.
  - `draft-write`: can create internal drafts or sync plans, but cannot publish.
  - `admin-write`: member/channel/invite/knowledge status changes; requires admin token and explicit UI action, not normal chat.
  - `external-live`: live model/provider/production checks; forbidden unless the user approves a real task.
- R7. The Agent must preserve current safety boundaries: no API keys, model base URLs, RAG URLs, database URLs, sync tokens, admin tokens, invite codes, raw prompts or provider responses in browser payloads, usage logs or traces.
- R8. The frontend `/assistant` page must show the Agentic Workspace state: tools used, whether RAG was called, evidence sufficiency, model channel, citations and any guardrail/fallback, without large debug dumps.
- R9. The public assistant may remain more conservative. This task targets the internal assistant final architecture first, while keeping public/internal/rag/studio service-mode isolation intact.
- R10. Existing RAG Orchestrator, Qdrant path, internal knowledge sync, member model channels and Studio APIs are retained as Agent tools/boundaries. The task should not discard these foundations.
- R11. The first production shape should be a single-supervisor Agent with typed tools and bounded loops. Handoffs/subagents, MCP/A2A tool servers and GraphRAG/Neo4j adapters are extension points, not first-implementation gates.
- R12. The confirmed write boundary is `draft-write` only. `admin-write`, publish/deploy mutation and `external-live` actions are blocked from normal chat.

## Acceptance Criteria

- [ ] `POST /chat/internal` uses an Agentic Workflow Runtime contract rather than directly calling hard-coded intent routing for the main path.
- [ ] Agent run metadata includes safe `agent`, `tools`, `guardrails`, `modelChannel`, `retrieval`, `citationCount`, `fallbackReason` and trace/status fields that the frontend normalizes from `unknown`.
- [ ] At least `rag.retrieve`, `status.query`, `project.lookup`, `knowledge.search`, `studio.draft`, and `answer.direct` exist as typed tools with safe input/output schemas and permission classes.
- [ ] The mock/no-live path proves that the Agent can choose different tools for project/status/RAG/draft/direct-writing tasks without calling a real provider.
- [ ] The runtime exposes stateful workflow steps such as plan, validate, execute tools, critique/sufficiency, compose, sanitize trace and persist.
- [ ] Internal answers still persist by member/session and do not leak cross-member history.
- [ ] Frontend `/assistant` renders a product-like tool trace/answer inspector and keeps model-channel diagnostics.
- [ ] Service-mode smoke proves public/internal/rag/studio route isolation still holds.
- [ ] Validation passes without real model/provider checks: `prisma:validate`, `server:build`, `server:smoke`, `assistant:service-modes-smoke`, `assistant:rag-smoke`, `assistant:eval`, `studio:smoke`, `lint`, `build`, `check:ui`, and `git diff --check` or a documented subset if no schema changes occur.
- [ ] Sensitive scan finds no real keys, endpoints, database URLs, tokens, private prompts or raw provider payloads.

## Out Of Scope

- Publishing public blog/project/status content directly from chat.
- Running live model, embedding, reranker, RAG, production health or provider validation without user-approved real tasks.
- Replacing Qdrant, Render service boundaries, Prisma persistence or existing Studio APIs solely for novelty.
- Introducing Neo4j/Graph-native storage unless a concrete Agent tool requires deep graph traversal beyond current entity/relation and Qdrant capabilities.
- Giving the public assistant internal-scope tools.
