# Internal Assistant Productized Agent Workspace

## Goal

把 BIAU Port 内部助手从“可用的 LangGraph Agent MVP”推进到正式产品化工作台：成员能在 `/assistant` 中清楚看到 Agent 如何规划、调用工具、引用证据、创建 Studio 草稿和触发安全边界；管理员能在 `/assistant/admin` 中管理成员、模型渠道、内部知识、RAG 同步和用量；系统具备本地可验证的契约、UI 检查和低敏诊断，不依赖真实模型测活、云平台操作或生产 token 才能继续推进。

这个任务服务于长期目标：完成 Agent 产品化，并持续改善 `blog-semi` 主站及关联项目主体。当前优先处理能本地验证、能改善公开展示/内部助手/AI Daily/项目详情/可靠性观察的改进；涉及云平台、密钥、生产账号、模型真实调用、APK 发布批准的事项只记录为人工待办，不阻塞本地实现。

## Confirmed Facts

- 当前项目已有正式 Agent 框架基础：
  - `@langchain/langgraph` 依赖已接入；
  - `server/src/agentGraph.ts` 是 LangGraph compiled graph；
  - `server/src/agentOrchestrator.ts` 仍保持 `runInternalAgent()` 入口；
  - `server/src/agentTools.ts` 有 typed tool registry；
  - `server/src/agentPlanner.ts` 有模型规划与 deterministic fallback；
  - `server/src/agentGuardrails.ts` 有 permission 和 trace sanitizer；
  - `server/scripts/agent-framework-contract.ts` 已验证图节点、权限、Studio artifact 和敏感形态。
- 当前 `/assistant` 已具备：
  - 邀请码兑换、成员 token、本地回退；
  - 历史会话、新建/归档；
  - Agent inspector：planner、steps、tools、guardrails、retrieval、citations；
  - `studio.draft` artifact 跳转到 `/studio?draft=<id>`。
- 当前 `/assistant/admin` 已具备：
  - admin token、刷新全部状态；
  - 邀请码、成员、成员模型渠道；
  - 内部知识文档；
  - RAG 状态、公开/内部知识同步；
  - 基础用量和安全边界说明。
- 现有规范已要求：
  - `/chat/internal` 必须走 `runInternalAgent()`；
  - 正常成员聊天只允许 `read` 和 `draft-write`；
  - `admin-write` / `external-live` 不从普通聊天开放；
  - trace/meta 不能泄露 API key、base URL、数据库 URL、bearer token、raw prompt、raw chunks、provider response 或 stack trace。

## Product Direction

最终形态不再是“聊天框 + 检索”，而是 **Agentic Workspace**：

- 对成员：一个能完成内部问答、项目/状态/知识检索、交付规划、Studio 草稿生成的工作台。
- 对管理员：一个能管理成员、模型渠道、知识源、RAG 同步、用量和运行健康的控制台。
- 对开源展示：一个能证明正式 Agent 工程能力的项目样板，有清晰架构、契约检查、低敏 trace、UI 过程可视化和本地验证。

## Requirements

### R1. Agent Runtime Product Contract

- 保持 LangGraph 作为内部助手主 orchestration runtime。
- 保持 `POST /chat/internal` 只通过 `runInternalAgent()` 进入 Agent runtime。
- 扩展时优先增强 typed tools、metadata projection、guardrails 和 UI 消费，不把 route 重新做成关键词分支。
- 支持模型 planner，但本地测试和验收不得做真实模型测活。

### R2. Workspace UX

- `/assistant` 必须像正式工作台，而不是普通聊天页：
  - 简洁开场，不默认铺满大段说明；
  - 明确显示当前模式：API 持久化 / 本地回退 / 成员渠道；
  - Agent 过程可读：plan、tools、citations、guardrails、retrieval；
  - 工具 artifact 可操作，尤其是 Studio draft deep link；
  - fallback/degraded 状态要告诉用户下一步该做什么。
- 页面必须在桌面和移动宽度下无文字溢出、无控制区挤压、无横向滚动。

### R3. Admin Operations UX

- `/assistant/admin` 必须能支撑日常运营：
  - “刷新全部状态”保持可见、可理解、可重复；
  - 成员模型渠道只显示低敏摘要；
  - RAG 状态和同步失败原因以低敏诊断呈现；
  - 内部知识的 draft/reviewed/active/archived 状态和同步准备度清楚；
  - 用量只显示低敏计数，不展示消息正文或 raw prompt。

### R4. Agent Capabilities

- 继续保留并产品化以下能力：
  - `rag.retrieve`
  - `status.query`
  - `project.lookup`
  - `knowledge.search`
  - `studio.draft`
  - `memory.search`
  - `memory.write` 的受限计划模式
  - `answer.direct`
- 第一批实现优先增强已有工具的可用性与可解释性，而不是新增高风险外部工具。
- 后续如果引入 MCP、GraphRAG、深图数据库、OpenTelemetry/LangSmith 等，应作为可选 adapter，并且不能破坏当前本地确定性验证。

### R5. Evaluation And Quality Gates

- Agent 产品化必须有本地可运行的质量门：
  - runtime contract；
  - service-mode isolation；
  - metadata sanitizer；
  - admin knowledge/RAG ops；
  - UI route and overflow checks；
  - no-sensitive-shape scans where applicable。
- 不把“模型回答质量”当成默认 CI 条件；真实模型质量评估需要用户批准的真实任务。

### R6. Cross-Project Improvement Loop

- 内部助手的知识、项目事实、状态观察和 Studio 草稿能力要反哺：
  - 主站项目详情；
  - AI Daily / Studio-first 内容流程；
  - 可靠性观察页；
  - 公开展示和 README 文档。
- 本任务可以继续发现关联项目问题，但代码实现优先落在 `blog-semi` 内部助手产品化主线。关联项目需要云、密钥、生产账号、APK 或真实模型调用时，只记录人工待办。

## First Implementation Slice

推荐第一轮切片：**Agent Workspace Product Surface Hardening**。

目标：

- 收紧 `/assistant` 的产品化体验：
  - 更短、更明确的开场；
  - 当前运行状态和下一步动作更清楚；
  - Agent steps/tools/guardrails 更像工作台 inspector；
  - Studio draft artifact 和降级提示更可操作。
- 增加或强化本地 UI/contract 检查，覆盖：
  - `/assistant` 默认状态不再显示大段说明；
  - Agent inspector 关键区域存在；
  - Studio artifact / guardrail / tool trace 正常被前端 normalizer 接收；
  - UI 无明显 overflow。
- 更新 docs/spec，只记录本轮新增的产品化契约。

## Acceptance Criteria

- [ ] `prd.md`、`design.md`、`implement.md` 完整描述产品化路线和第一轮切片。
- [ ] 任务启动后，第一轮切片有可验证代码或文档改动，不停留在抽象规划。
- [ ] `/assistant` 产品化体验至少改善一个真实痛点，并有本地 UI 或契约检查守护。
- [ ] Agent trace、RAG diagnostic、model channel、Studio artifact 和 guardrail 继续保持低敏。
- [ ] 运行并通过与改动相关的检查，至少包括：
  - `npm.cmd run assistant:agent-contract`
  - `npm.cmd run assistant:meta-check`
  - `npm.cmd run assistant:admin-check`
  - `npm.cmd run check:ui`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- [ ] 若改动影响服务边界，追加 `npm.cmd run assistant:service-modes-smoke`。
- [ ] 若改动影响 RAG 或知识同步，追加 `npm.cmd run assistant:rag-smoke`、`npm.cmd run assistant:rag-sync-local` 或相关 admin check。
- [ ] 需要用户手动处理的事项记录到 `docs/manual-gates.md` 或任务 notes，不阻塞本地切片。

## Out Of Scope

- 不在普通成员聊天中开放 `admin-write`、发布、部署、外部 live diagnostic 或生产配置修改。
- 不读取、打印、提交 `.env`、token、真实数据库 URL、模型 relay URL、API key、签名文件路径或私有后台地址。
- 不执行模型 ping、provider doctor、空 prompt 测活；真实模型验证只能基于用户批准的真实任务。
- 不把未签名/未批准 APK 公开成正式下载。
- 不以“临时可用”为目标重写最终产品方向；需要中间迁移时也必须服务于最终 Agentic Workspace 形态。
