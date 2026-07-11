# Implement: Internal Assistant Durable Memory

## Execution Order

1. **Persistence contract**
   - 更新 `prisma/schema.prisma`，新增 enums、`AgentMemory` 和关系。
   - 新增 migration。
   - 运行 `prisma:validate`、`prisma:generate`。

2. **Consent and memory domain helper**
   - 新增 `server/src/agentMemory.ts`。
   - 实现明确同意识别、查询表达排除、内容提取、kind 推断、长度限制、敏感拦截和哈希。
   - 增加无模型、无网络的确定性检查。

3. **Planner and typed tools**
   - 更新 deterministic planner，让明确保存意图选择 `memory.write`，记忆查询/历史规划选择 `memory.search`。
   - 把 `memory.write` 从计划占位改为真实成员级持久化。
   - 扩展 `memory.search`，组合 ACTIVE 长期记忆和当前会话摘要。
   - 保持 `draft-write`、低敏 trace 和现有 LangGraph 步骤不变。

4. **Member API**
   - 在 internal assistant service 增加 list/archive/restore routes。
   - 增加 serializer 和 payload validation。
   - 使用 `{ id, memberId }` 所有权检查。

5. **Assistant product UI**
   - 增加记忆类型、normalizer、请求函数和页面状态。
   - 加入长期记忆面板、归档/恢复、刷新和空/错误状态。
   - `memory.write` 成功后自动刷新。
   - 补充 `flow-pages.css` 的桌面/移动布局，避免长文本溢出。

6. **Contracts and docs**
   - 扩展 `assistant:agent-contract`、`assistant:agent-eval`、`server:smoke` 和 `check:ui`。
   - 更新 backend/frontend Trellis specs。
   - 在 `docs/manual-gates.md` 增加生产 migration 与跨重启验收步骤。

## Validation

按顺序运行：

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run server:build
npm.cmd run assistant:agent-contract
npm.cmd run assistant:agent-eval
npm.cmd run server:smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run assistant:meta-check
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
git diff --check
```

再对改动文件执行敏感形态扫描，确认没有真实 token、连接串、模型地址、私有 IP 或生产账号。

## Required Cases

- “请记住以后默认使用简体中文回答” -> `memory.write`，创建 `PREFERENCE`。
- 相同成员重复保存相同内容 -> 不重复创建。
- 已归档相同内容再次明确保存 -> 恢复为 ACTIVE。
- “你还记得我的输出偏好吗” -> `memory.search`，不写入。
- 普通项目问答 -> 不执行 `memory.write`。
- 保存包含凭据形态的内容 -> blocked，无数据库写入。
- 成员 A 无法通过 API 或 tool 读取成员 B 的记忆。
- UI 可以归档、显示归档项并恢复，刷新后状态保持。
- 无 token / 无数据库 / 空表 -> 聊天仍可使用既有回退路径。

## Risk And Rollback Points

- Planner 误判会造成未授权写入：planner 和 tool 必须双重调用同一 consent helper。
- Prisma mock 会因新增 delegate 失败：所有 Agent contract/eval mock 必须显式覆盖 `agentMemory`。
- 前端初始并行加载增加请求：记忆失败不能让成员资料或会话加载失败。
- 生产 migration 不在本地自动执行；代码完成后只记录用户需要手动部署的服务和验证步骤。
