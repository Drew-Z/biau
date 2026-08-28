# Implementation Plan

1. 记录所有分支 tip、合并关系、upstream 和 worktree 状态。
2. 审计 `server/scripts/public-assistant-agent-check.ts` 与 `server/src/publicAssistantAgent.ts` 的未提交 diff，并和 `main` 对比。
3. 运行最小相关检查，决定“保留并提交”或“已覆盖、待批准放弃”。
4. 向用户提供精确的删除/回收清单和恢复 SHA，取得确认。
5. 执行获批的提交、集成、推送、worktree remove、branch delete 和 prune。
6. 验证远端、本地分支、worktree、Trellis task 和用户 JSON 状态。

验证命令包括 `git diff --check`、相关 assistant 检查、`git branch --merged`、`git worktree list --porcelain` 和工作区审计。
