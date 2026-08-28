# Technical Design

## Boundaries

本任务只调整项目协作契约，并创建一个隔离的 Claude Code worktree。规范主目录仍由 `main` 承载；用户现有未提交内容和其它活动 worktree 不作为输入。

## Source Of Truth

- 仓库级规则：`D:\workspace4Cursor\AGENTS.md`
- 项目级规则：`AGENTS.md`
- Claude Code 入口：`CLAUDE.md`
- Trellis 生命周期：`.trellis/workflow.md`、`.trellis/config.yaml`
- Git 隔离事实：`git worktree list --porcelain`

发生冲突时，安全边界更严格的仓库规则优先；Claude Code 与 Codex 都必须遵守同一份项目级契约。

## Collaboration Model

采用“独立 worktree + 独立分支 + commit 交接”的串行模型：

1. 规范主目录只用于基线检查、集成和最终验证。
2. Claude Code 在 `D:\Agent\codex\worktrees\<name>` 中开发 `claude/<scope>` 分支。
3. Claude 完成后提交并提供交接记录；Codex 从该 commit 做审查或继续集成。
4. 同一文件集合在同一时刻只能由一个代理负责。
5. 合并、推送和冲突解决由一个明确的集成人负责。

## Worktree Contract

- 新 worktree 必须通过 `git worktree add` 创建并在 `git worktree list --porcelain` 中可见。
- 目录放在 `D:\Agent\codex\worktrees`，不放在 `D:\workspace4Cursor` 根目录。
- 分支名使用 `claude/<task-scope>`，不得复用已被其它 worktree 检出的分支。
- 创建基线前先确认主目录脏文件；创建时不得携带未知工作区改动。
- 回收前必须确认干净、已合并/推送且无任务依赖；只使用 `git worktree remove` 和 `git worktree prune`。

## Compatibility / Rollback

本任务不改变运行时代码。若文档整理不符合预期，可通过反向提交恢复文档；不能用破坏性 checkout/reset 覆盖用户文件。新 worktree 若未使用，可在确认干净且无任务依赖后按仓库规则回收。
