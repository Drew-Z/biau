# Internal Assistant LangGraph Agent Workspace

## Goal

把当前内部助手从自研 Agentic Workflow Runtime 升级为正式开源项目形态的 Agent 框架实现：以 LangGraph.js 作为主 orchestration 层，保留现有工具、权限、安全边界和 Studio draft-write 能力，但允许破坏性替换旧 `runInternalAgent()` 内部实现，不以兼容未投入使用的旧 runtime 为优先目标。

## User Value

- 项目架构可以清楚展示“标准 Agent 框架 + 状态图 + typed tools + RAG + human-in-the-loop draft gate + trace/guardrails”的完整工程方案。
- 内部助手不再像普通聊天/RAG，而是能展示多步骤计划、工具调用、可观测执行轨迹、权限约束和安全自检。
- 后续可以更自然地接入更强模型、LangSmith/LLM tracing、MCP、GraphRAG 或更复杂的人工审核流程。

## Confirmed Facts

- 当前项目是 React/Vite/Semi + Express/Prisma 的 TypeScript 单仓库，`package.json` 还没有 LangGraph/LangChain 相关依赖。
- 当前内部助手入口是 `POST /chat/internal`，由 `server/src/app.ts` 鉴权、解析 session/member，然后调用 `runInternalAgent()`。
- 现有自研 Agent runtime 位于：
  - `server/src/agentOrchestrator.ts`
  - `server/src/agentTypes.ts`
  - `server/src/agentTools.ts`
  - `server/src/agentGuardrails.ts`
- 现有 typed tools 已覆盖核心开源助手能力：
  - `rag.retrieve`
  - `status.query`
  - `project.lookup`
  - `knowledge.search`
  - `studio.draft`
  - `memory.search`
  - `answer.direct`
- 现有权限边界要求普通聊天只允许 `read` 和 `draft-write`；`studio.draft` 只能创建或计划 `hidden / review-needed` 草稿，不允许发布、部署、改 admin/member/channel/invite 或做真实外部诊断。
- 现有 spec 已记录 `Agentic Workspace` 目标，但实现仍是自研流程，不是 LangGraph / OpenAI Agents SDK / Mastra 等正式框架。
- 最新全量 `npm.cmd run verify` 已通过；当前 `main` 工作树干净。

## Framework Decision

Recommended default: **LangGraph.js**.

- LangGraph 官方定位是用于构建 long-running、stateful agents 的 orchestration framework，适合状态图、可恢复流程、human-in-the-loop 和复杂工具调用。
- OpenAI Agents SDK 适合 OpenAI 生态、handoffs、tracing 和 sessions，但当前项目使用 OpenAI-compatible 多模型/中转渠道，主框架不宜先绑定单一供应商。
- Mastra 是 TS-native Agent framework，也值得后续对比；但 LangGraph 的 graph/state/edge 概念更适合表达可维护的 Agent workflow。

## Requirements

### R1. Replace The Agent Orchestrator With LangGraph

- 引入 LangGraph.js 作为内部助手主 orchestration 框架。
- 新建或重写 `server/src/agentGraph.ts` / `agentOrchestrator.ts`，让 `runInternalAgent()` 调用 LangGraph compiled graph。
- 旧自研 `WORKFLOW_STEPS` 常量可以删除或改为由 graph node trace 派生。
- 不需要保持旧 planner 内部实现兼容，但 API 响应 shape 必须继续满足前端 `ChatResponse.meta` 安全投影。

### R2. Keep Existing Tool And Safety Semantics

- 复用或改造 `agentTools.ts` 中的 typed tools，不重写业务能力。
- LangGraph node 必须通过 tool registry 执行工具，而不是在 graph node 里硬编码项目/status/RAG 查询。
- 保留 `read` / `draft-write` / `admin-write` / `external-live` 权限分级。
- 普通内部聊天仍只允许 `read` 和 `draft-write`。

### R3. Define Explicit Agent State

Agent state 至少包含：

- `question`
- `member`
- `sessionId`
- `plannerMode`
- `studioDraftMode`
- `plan`
- `selectedToolIds`
- `toolResults`
- `citations`
- `chunks`
- `contextBlocks`
- `generated`
- `guardrails`
- `answer`
- `meta`

State 中不得保存 API key、base URL、数据库 URL、bearer token、invite code、raw prompt、raw provider response、raw private document body 或 stack trace。

### R4. Model Planner With Deterministic Fallback

- 有模型渠道时允许模型 planner 选择工具和 intent/grounding。
- 模型 planner 不可用、未配置或返回非法结构时，必须退回 deterministic planner。
- 测试、smoke 和 eval 默认使用 mock/deterministic path，不做真实模型测活。

### R5. Graph Nodes

目标图节点：

- `input_guard`
- `plan`
- `validate_plan`
- `execute_tools`
- `compose_answer`
- `self_check`
- `persist_trace`

可选后续节点：

- `human_review_gate`
- `memory_write`
- `handoff`

### R6. Open-Source Trace UI

- `/assistant` 诊断面板应展示 Agent 框架运行结果，而不是只显示“模型/本地 fallback”。
- 需要展示低敏信息：
  - graph mode / planner
  - selected tools
  - node/step status
  - tool count / citation count
  - retrieval summary
  - guardrail result
  - draft artifact link when created
- UI 不能展示 provider endpoint、API key、RAG key、sync token、数据库 URL、raw tool payload、raw chunks、raw prompts 或后台地址。

### R7. Open-Source Architecture Documentation

- 添加一份开源架构文档，说明：
  - 为什么从 naive RAG / 自研 runtime 升级到 LangGraph Agent
  - Agent graph 架构图
  - typed tools 与权限边界
  - RAG / Studio / 状态页 / 内部知识如何被 Agent 调用
  - 人工审核和安全 guardrails
  - 验证命令与低敏证据

## Out Of Scope

- 不接真实生产模型测活。
- 不把 `admin-write` 或 `external-live` 暴露给普通聊天。
- 不自动发布 Studio 草稿、博客文章或 AI 日报。
- 不引入跨项目真实生产凭据。
- 不要求兼容旧自研 orchestration 的内部实现细节。
- 不在第一版接 LangSmith、MCP、GraphRAG 或多 Agent handoff；这些作为后续增强。

## Acceptance Criteria

- [ ] 项目引入正式 Agent 框架依赖，并能在 TypeScript/Express 后端编译通过。
- [ ] `POST /chat/internal` 的主回答路径通过 LangGraph graph 执行，而不是旧自研顺序流程。
- [ ] 现有工具能力仍可通过 graph 调用：RAG、状态、项目、知识、Studio draft、memory/direct answer。
- [ ] `studio.draft` 仍只能产出 `hidden / review-needed` 草稿或 plan-only 结果，不会发布公开内容。
- [ ] 前端 `/assistant` 能显示低敏 Agent graph/tool/guardrail trace。
- [ ] 新增或更新 smoke/eval，覆盖 deterministic planner、工具执行、policy block、draft-write gate 和 metadata sanitization。
- [ ] `npm.cmd run server:build`、`npm.cmd run server:smoke`、`npm.cmd run assistant:service-modes-smoke`、`npm.cmd run assistant:meta-check`、`npm.cmd run lint`、`npm.cmd run build` 通过。
- [ ] 若改动 RAG 或 public/internal retrieval，补跑 `npm.cmd run assistant:rag-smoke` 和 `npm.cmd run assistant:eval`。
- [ ] 开源架构文档存在，且不包含真实 token、API key、数据库 URL、模型中转地址或私有后台地址。

## Open Question

- Resolved: use LangGraph.js as the primary orchestration framework.
  - Reason: it best fits graph/state/tool/guardrail explanation while staying model-provider neutral.
