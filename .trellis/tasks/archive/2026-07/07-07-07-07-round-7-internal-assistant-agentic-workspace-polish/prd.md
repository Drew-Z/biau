# Round 7 internal assistant Agentic Workspace polish

## Goal

Audit and improve the internal assistant Agentic Workspace knowledge/admin/member-channel operations with local validation and public-safe diagnostics.

## Requirements

- R1. 审计当前内部助手相关实现：前端内部助手/管理页面、server API、Prisma 数据模型、成员级模型渠道、知识文档、同步状态、诊断信息和 smoke/contract 脚本。
- R2. 选择一个能提升“最终形态 Agentic Workspace”运营可用性的最小切片，而不是做阶段性占位。
- R3. 优先改进本地可验证能力，例如管理页信息架构、成员/模型渠道诊断、知识同步状态、API contract、mock smoke、错误可解释性或低敏日志。
- R4. 不做模型/provider 测活；如需真实模型验证，必须是用户批准的业务任务，本任务默认只做本地/模拟/契约验证。
- R5. 不提交真实 member token、invite、API key、provider base URL、数据库 URL、模型渠道、生产账号或内部知识敏感原文。
- R6. 如果发现生产平台或凭据依赖，记录到 Round 7 parent `manual-gates.md`，继续推进其他可本地验证事项。

## Acceptance Criteria

- [x] 已审计内部助手实现、相关脚本和数据模型。
- [x] 找到并记录一个真实的运营/管理/诊断/知识同步缺口。
- [x] 完成一个小步、可回退、可本地验证的改进。
- [x] 相关验证通过。
- [x] 没有泄露或提交任何凭据、模型渠道或敏感知识内容。
- [ ] 提交并推送 `blog-semi`。

## Notes

- 本任务优先提升内部助手最终形态的“可运营性”和“可诊断性”，不是重新选择 RAG/Agent 架构。

## Audit Finding

- 后端已有内部知识文档、同步 run 和低敏 diagnostic，但管理页只展示最近同步的状态、文档数和 chunk 数。
- 运营者无法直接看到可同步文档数、待首次同步文档、内容变更后未重同步文档、跳过/失败原因、accepted 标记或 issue 计数。
- 前端 sync diagnostic normalizer 原先保留所有简单字段；如果未来后端误返回 `baseUrl` / `apiKey` 这类字符串，页面层会接收它们。
