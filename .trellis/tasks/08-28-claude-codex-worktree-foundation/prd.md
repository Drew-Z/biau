# 整理 Claude Code 与 Codex 协作并初始化 worktree

## Goal

把 `blog-semi` 整理成可由 Claude Code 与 Codex 稳定交接的单仓库工作流，并在不覆盖现有用户改动或活动 worktree 的前提下，为后续 Claude Code 任务准备独立的托管 worktree。

## Background / Confirmed Facts

- 规范主目录是 `D:\workspace4Cursor\blog-semi`，默认分支为 `main`，远端为 `origin`。
- 主目录当前只有一份已知用户未提交改动：`public/status/blog-semi-synthetic.json`；本任务不得覆盖、暂存或提交它。
- 已存在的 `D:\workspace4Cursor\blog-semi-public-route` 是活动 worktree，包含未提交的 assistant 路由改动；本任务不得修改、清理或回收它。
- `.trellis/config.yaml` 已启用 `session_auto_commit: true`。该设置只覆盖 Trellis 会话记录和任务归档，不等于产品代码自动提交或自动推送。
- 当前项目的 `CLAUDE.md` 保留旧 WSL 路径和旧的 push 规则，需要与当前 Windows 规范及根目录 `AGENTS.md` 对齐。
- 参考项目 `D:\workspace4Cursor\learn\anchor` 采用 Claude 独立分支/worktree、Codex 规范 checkout 串行接手的方式；该模式是本任务的协作参考。

## Requirements

### R1. 协作规则对齐

更新 `CLAUDE.md`，明确当前 Windows 规范目录、PowerShell 优先、Trellis task 入口、用户未提交文件保护、Claude/Codex 通过提交交接，以及不得共享未提交工作区。

### R2. 交接边界可执行

文档必须定义每次交接至少包含 task、branch/worktree、commit、变更文件、验证结果、已知风险和被排除的未提交文件；明确同一时间只有一个代理负责同一文件集合。

### R3. 主目录保持可回退

整理提交只能包含本任务明确编辑的协作文档和 Trellis 任务文档，不得包含 `public/status/blog-semi-synthetic.json` 或 `blog-semi-public-route` worktree 的内容。

### R4. 初始化隔离 worktree

在整理提交验证通过后，使用 `D:\Agent\codex\worktrees` 下的托管路径创建新的 Claude Code 分支/worktree；不得在 `D:\workspace4Cursor` 根目录创建新的兄弟目录。

### R5. 记录后续使用方式

为 Claude Code 提供可直接执行的起始检查、任务开发、提交和交接步骤；说明 Codex 后续只在明确的集成/审查边界内接手。

## Acceptance Criteria

- [ ] `CLAUDE.md` 不再引用不存在的 `/home/zhang/workspace/blog-semi` 项目路径。
- [ ] `CLAUDE.md` 与根目录 `AGENTS.md` 的 Windows、Trellis、用户改动保护和 push 责任边界一致。
- [ ] 任务文档明确主目录脏文件和现有 `blog-semi-public-route` worktree 均不纳入本任务。
- [ ] 整理阶段的 `git diff --check`、文档结构检查和相关 Trellis 校验通过。
- [ ] 新 worktree 位于 `D:\Agent\codex\worktrees`，使用独立 `claude/<scope>` 分支，且不是 `main` 或现有分支的第二个 checkout。
- [ ] 创建后 `git worktree list --porcelain`、分支状态和远端基线均可追溯；新 worktree 从整理后的提交创建。
- [ ] 最终报告列出未触碰的用户改动、未触碰的活动 worktree 和后续 Claude/Codex 交接命令。

## Out Of Scope

- 不修改产品代码、三主题实现或 `public/status/blog-semi-synthetic.json`。
- 不修改或回收 `D:\workspace4Cursor\blog-semi-public-route`。
- 不归档或改变其它活动 Trellis task。
- 不安装 Claude 插件、MCP、Git hook 或全局配置。
- 不自动推送；除非后续用户明确要求，推送由用户或明确指定的集成人执行。
