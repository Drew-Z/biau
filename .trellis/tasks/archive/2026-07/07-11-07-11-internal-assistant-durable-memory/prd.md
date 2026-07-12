# Internal Assistant Durable Memory And Consent Controls

## Goal

把内部助手现有的会话级 `memory.search` 占位能力升级为可正式使用的成员长期记忆：成员明确要求记住偏好、项目约束或工作习惯后，Agent 可以在 `draft-write` 权限边界内保存低敏摘要，并在后续相关任务中检索；成员能够在 `/assistant` 查看、归档和恢复自己的记忆。

## Background

当前 Agent 已使用 LangGraph、typed tools、成员 token、会话持久化和低敏 trace，但长期记忆尚未落地：

- `server/src/agentTools.ts` 的 `memory.search` 只读取当前会话最近 8 条消息。
- `memory.write` 只返回“待审核计划”，不会持久化数据。
- `server/src/agentPlanner.ts` 的确定性规划器不会选择 `memory.write`。
- `prisma/schema.prisma` 没有成员长期记忆模型。
- `/assistant` 没有长期记忆查看、归档或恢复入口。

因此，当前能力仍是会话上下文，不是成员级 durable memory。

## Requirements

### R1. Member-scoped durable memory

- 新增长期记忆实体，至少记录：成员、可选会话、可选来源消息、类型、标题、内容、状态、内容哈希、归档时间和审计时间。
- 记忆类型固定为 `preference`、`project`、`workflow`、`context`。
- 状态固定为 `ACTIVE`、`ARCHIVED`；不提供公开删除或跨成员读取路径。
- 成员删除时记忆级联删除；会话或来源消息删除时只解除关联，不误删成员记忆。
- 相同成员的相同低敏内容应通过内容哈希避免重复写入。

### R2. Explicit consent before write

- 只有用户明确表达“请记住”“保存这个偏好”“以后按这个规则”等保存意图时，确定性规划器才可选择 `memory.write`。
- “你还记得吗”“回顾之前内容”“根据历史回答”等查询表达只能选择 `memory.search`，不能写入。
- 普通问答、项目检索、状态查询、RAG 检索和 Studio 草稿请求不得静默写入长期记忆。
- 记忆写入继续属于 `draft-write`；不新增 `admin-write` 或 `external-live` 权限。

### R3. Sensitive-content guard

- 写入前必须经过确定性敏感形态检查，拦截密钥、bearer token、密码、数据库连接串、私有地址、证书/私钥和类似凭据内容。
- 空内容、过长内容、只有保存命令而没有实际记忆内容时不写入。
- 工具 trace 只记录类型、状态、数量和低敏摘要，不记录记忆正文、原始消息、哈希、成员 token 或数据库信息。
- 被拦截的写入返回 `status: blocked`、`errorClass: policy_blocked` 和可理解的安全提示。

### R4. Retrieval behavior

- `memory.search` 同时检索当前成员的 `ACTIVE` 长期记忆与当前会话最近消息摘要。
- 长期记忆必须按 `memberId` 隔离，并优先返回与问题相关的记忆；成员偏好和工作流规则可以作为稳定补充。
- 返回给答案生成器的正文必须有长度和条数上限；trace 只暴露命中数量，不暴露全文。
- 无数据库数据、无命中或旧会话没有记忆时安全降级到当前会话摘要。

### R5. Member API

- `GET /chat/internal/memories` 返回当前成员自己的记忆，默认只返回 `ACTIVE`，可显式包含 `ARCHIVED`。
- `PATCH /chat/internal/memories/:id` 仅支持当前成员归档或恢复自己的记忆。
- 未认证、禁用成员、数据库未配置、未知记忆和跨成员记忆分别返回现有风格的低敏错误。
- API 响应不返回内容哈希、来源消息正文或任何凭据型元数据。

### R6. Product UI

- `/assistant` 增加紧凑的“长期记忆”区域，展示类型、低敏正文、状态和更新时间。
- 成员可以刷新、查看归档项、归档和恢复；不提供绕过 Agent 同意检查的直接创建表单。
- `memory.write` 成功后自动刷新记忆列表，并给出清晰状态提示。
- 未兑换成员、API 不可用、数据库未配置和空列表都有明确但简短的状态。
- 桌面与手机端都不得出现横向溢出，长内容必须换行或截断。

### R7. Production boundary

- 仓库提供 Prisma migration 和本地确定性验证。
- 生产数据库执行 migration、真实成员记忆写入和跨重启验证记录到 `docs/manual-gates.md`，不得在本地自动连接生产数据库。
- 不做模型 ping、doctor、测活 prompt 或真实模型渠道验证。

## Acceptance Criteria

- [x] Prisma schema 与 migration 提供成员隔离、会话/来源可选关联、类型、状态、哈希去重和归档字段。
- [x] 明确保存意图会选择并执行 `memory.write`；普通问答和记忆查询不会写入。
- [x] 敏感、空白或无实际内容的保存请求不会产生数据库记录。
- [x] `memory.search` 能组合当前成员的 ACTIVE 长期记忆与当前会话摘要，且不会读取其他成员数据。
- [x] 成员 API 支持列出、归档和恢复自己的记忆，并拒绝未认证、禁用或跨成员请求。
- [x] `/assistant` 提供可理解的记忆管理 UI，写入成功后自动刷新，手机端无横向溢出。
- [x] Agent trace、持久化消息 meta 和 API 响应不包含记忆哈希、原始 token、数据库信息或敏感正文。
- [x] 相关 Agent contract/eval、server smoke、Prisma、lint、build 与 UI 检查通过。
- [x] 生产 migration 与真实成员跨重启验收已记录为人工 gate，不阻塞本地完成。

## Out Of Scope

- 不做跨成员共享记忆、组织级记忆或管理员读取成员记忆。
- 不做向量化记忆、外部向量库、GraphRAG 或 Neo4j 记忆图谱。
- 不做模型自动总结后静默写入，也不从全部历史聊天批量抽取记忆。
- 不提供硬删除、自动过期、记忆导入导出或公开 API。
- 不在本任务中更换模型渠道、调用真实模型或执行生产数据库迁移。
