# Design: Internal Assistant Durable Memory

## Architecture

长期记忆继续属于现有 `biau-internal-assistant-api`、LangGraph Agent 和成员数据库边界，不新增第四个服务，也不把记忆写入 RAG Orchestrator。

```text
member message
  -> POST /chat/internal
  -> LangGraph plan
  -> memory.write (explicit consent only)
  -> AgentMemory table
  -> sanitized tool trace

later question
  -> memory.search
  -> ACTIVE AgentMemory rows for member
  + current-session message summary
  -> bounded contextBlocks
  -> answer composer
```

`/assistant` 通过成员 API 管理同一批记忆：

```text
GET /chat/internal/memories
PATCH /chat/internal/memories/:id
```

## Data Model

新增 Prisma enums：

```text
AgentMemoryKind: PREFERENCE | PROJECT | WORKFLOW | CONTEXT
AgentMemoryStatus: ACTIVE | ARCHIVED
```

新增 `AgentMemory`：

```text
id                String
memberId          String
sessionId         String?
sourceMessageId   String?
kind              AgentMemoryKind
title             String
content           String
contentHash       String
status            AgentMemoryStatus
archivedAt        DateTime?
createdAt         DateTime
updatedAt         DateTime
```

关系和索引：

- `Member.memories`，`onDelete: Cascade`。
- `ChatSession.memories`，`onDelete: SetNull`。
- `ChatMessage.sourceMemories`，`onDelete: SetNull`。
- `@@unique([memberId, contentHash])` 防止同一成员重复保存相同内容。
- `@@index([memberId, status, updatedAt])` 支持成员列表和检索。
- `@@index([sessionId])` 支持会话关联。

## Consent And Candidate Extraction

新建独立的纯函数模块，例如 `server/src/agentMemory.ts`，避免把保存判断散落到 planner、tool 和 route：

```typescript
buildAgentMemoryCandidate(question):
  | { allowed: true; kind; title; content; contentHash }
  | { allowed: false; reason }
```

处理顺序：

1. 识别明确保存动词和面向未来的偏好表达。
2. 排除查询式表达，例如“你记得吗”。
3. 去除保存命令前缀，提取实际内容。
4. 限制标题、内容长度并推断 kind。
5. 复用或封装现有敏感形态规则，检测到敏感内容立即阻止。
6. 对标准化后的内容计算哈希。

确定性 planner 与 `memory.write` 必须调用同一候选函数：planner 决定是否选择工具，tool 再做最终校验，防止模型 planner 或未来调用路径绕过同意检查。

## Tool Behavior

### `memory.write`

- 权限保持 `draft-write`。
- 候选不合法时不写库，返回 `blocked` 或安全的 completed/no-op 状态。
- 合法时使用 `{ memberId, contentHash }` 去重；已存在 ARCHIVED 记录时恢复为 ACTIVE，已存在 ACTIVE 时返回“已存在”。
- 新记录关联当前 session；如果能安全取得当前用户消息 id，则记录 `sourceMessageId`，否则保持为空。
- `contextBlocks` 仅包含确认信息和低敏标题，不把正文复制到 trace。
- trace 摘要只表达 `已保存 1 条 preference 记忆`、`已存在`、`已拦截` 等低敏结果。

### `memory.search`

- 查询 `{ memberId, status: ACTIVE }`，不接受外部 member id。
- 先保留少量 `PREFERENCE` / `WORKFLOW` 稳定规则，再按标题和内容的轻量词项匹配补充项目/上下文记忆。
- 最多返回 6 条长期记忆和当前会话最近 6 条消息摘要。
- 给 composer 的每条内容有字符上限；trace 仅记录长期记忆数和会话摘要数。
- 数据库查询失败由现有 tool wrapper 转为低敏 `tool_error`，Agent 可继续降级回答。

## API Contract

### List

```http
GET /chat/internal/memories?includeArchived=true
Authorization: Bearer <member token>
```

响应：

```json
{
  "memories": [
    {
      "id": "...",
      "kind": "PREFERENCE",
      "title": "输出语言偏好",
      "content": "默认使用简体中文回答。",
      "status": "ACTIVE",
      "sessionId": "...",
      "archivedAt": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

不返回 `memberId`、`sourceMessageId`、`contentHash`。

### Archive / Restore

```http
PATCH /chat/internal/memories/:id
Content-Type: application/json

{ "archived": true }
```

Route 必须先用 `{ id, memberId: member.id }` 查询，再更新状态和 `archivedAt`。跨成员 id 与不存在 id 都返回 `404 memory-not-found`，避免泄露记录是否存在。

## Frontend

在 `AssistantPage` 左侧会话区域下方增加紧凑记忆面板：

- 标题、ACTIVE/ARCHIVED 数量、刷新按钮、显示归档项开关。
- 每条记忆显示 kind 标签、title、content、更新时间和归档/恢复图标按钮。
- 没有 token 时显示“兑换邀请码后管理成员记忆”。
- 加载或 API 失败时保留聊天功能，显示低敏状态，不清空已有列表。
- `sendMessage()` 收到成功的 `memory.write` trace 后调用刷新函数。

状态与 API normalization 可留在当前页面，若类型/函数继续增多则抽到 `src/utils/assistantMemory.ts`；不引入新状态库。

## Safety And Privacy

- 保存需要明确同意，读取只发生在当前成员 Agent 运行或当前成员管理 UI。
- API 与 UI 可以向当前成员展示自己的低敏记忆正文，但 trace、UsageLog、ChatMessage.meta 不保存正文副本。
- 不把成员记忆同步到 public/internal RAG collection，不生成 citation，不进入公开知识索引。
- 管理员页面不增加成员记忆浏览入口。

## Migration And Rollback

- 本地新增一条 Prisma migration，只创建 enum、table、foreign keys、unique 和 indexes。
- 代码在空表下正常运行，不需要历史数据回填。
- 回滚代码时保留数据库表不会影响旧版本；生产删除表不是本任务的自动操作。
- Render/Aiven 生产 migration 与跨重启验收由人工执行并记录。
