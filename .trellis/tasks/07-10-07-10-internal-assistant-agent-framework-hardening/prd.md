# Internal Assistant Agent Framework Hardening

## Goal

把内部助手从“已经接入 LangGraph 的可用实现”继续推进成更像正式开源项目的 Agent 开发框架样板：运行时边界清楚、节点/工具/权限/trace 可验证、失败可降级、前端能看懂 agent 过程，并且不依赖真实模型测活、云平台或生产 token。

## Context

当前仓库已经具备：

- `@langchain/langgraph` 依赖；
- `server/src/agentGraph.ts` 中的 LangGraph state graph；
- `server/src/agentTools.ts` 中的 typed tool registry；
- `docs/internal-assistant-agent-workspace.md` 和 `.trellis/spec/backend/agentic-workspace.md` 中的架构/契约；
- `server:smoke`、`assistant:meta-check`、`assistant:service-modes-smoke` 等本地检查。

本任务不再讨论“是否使用正式框架”，默认结论是：当前内部助手最终形态以 **LangGraph Agentic Workspace** 为主线，后续只围绕工程完整性、可运营性和可验证性继续增强。

## Requirements

- R1. 保持 `POST /chat/internal` 通过 `runInternalAgent()` 进入 LangGraph runtime，不能退回 route-level keyword planner 或 naive RAG。
- R2. 增强本地可验证的 Agent framework contract，优先覆盖 graph 节点顺序、工具权限、trace 安全、Studio draft gate、service-mode 隔离和 UI metadata normalization。
- R3. 新增或强化的检查必须使用 mock/deterministic/local fixtures，不对任何真实模型渠道、向量库、云平台或生产 API 做测活。
- R4. Agent trace 只能暴露低敏元数据：节点、工具 id、权限、状态、耗时、计数、摘要和同站 artifact link；不能暴露 token、base URL、数据库 URL、raw prompt、raw chunks、provider response 或 stack trace。
- R5. 如果发现需要云平台、真实 token、模型真实调用、生产账号、Qdrant/Supabase/Render 配置或 APK 发布批准，只记录到人工待办，不阻塞本地切片。
- R6. 每轮切片必须产出至少一种可检查进展：代码、测试、文档、状态数据或人工待办更新。

## First Slice

默认执行第一个可落地切片：**Agent framework contract check**。

目标：

- 增加一个本地脚本，直接验证 LangGraph runtime 的核心不变量：
  - `AGENT_GRAPH_STEPS` 顺序与 spec 一致；
  - `runInternalAgent()` 在 mock planner 下会产生 `agentic-workspace` metadata；
  - status/project/draft 类问题会选择预期工具；
  - 敏感输入会被 guardrail 阻断；
  - Studio draft artifact 只允许同站 `/studio?draft=<id>`；
  - metadata 不包含常见敏感形态。
- 把该脚本接入现有 npm scripts，供后续 `verify` 或人工命令调用。
- 更新文档/任务记录，说明这是本地 contract，不是模型质量测活。

## Acceptance Criteria

- [x] 新增的 Agent framework contract check 可在无生产数据库、无真实模型 key、无 RAG Orchestrator 的本地环境运行。
- [x] 相关脚本命令写入 `package.json`，命名清楚，和现有 `assistant:*` 检查保持一致。
- [x] 检查失败时给出可定位的错误信息，不输出密钥或私有连接。
- [x] 运行并通过最小验证：新脚本、`npm.cmd run server:build`、`npm.cmd run assistant:meta-check` 或等价相关检查。
- [x] 若修改了前端 metadata normalizer 或 UI，追加 `npm.cmd run lint`、`npm.cmd run build` 和必要 UI 检查。

## Out Of Scope

- 不引入真实模型测活。
- 不接入新的云服务。
- 不公开或读取 `.env`、token、数据库连接串或模型渠道配置。
- 不改变生产 Render/Supabase/Qdrant 配置。
- 不把 `admin-write`、发布动作或外部 live diagnostic 开给普通成员聊天。
