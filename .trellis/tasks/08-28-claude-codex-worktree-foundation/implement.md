# Implementation Plan

## Checklist

1. 更新 `CLAUDE.md`，删除失效 WSL 路径，补充当前 Windows/Trellis/交接契约。
2. 检查 diff，确认 `public/status/blog-semi-synthetic.json` 不在整理提交中。
3. 运行文档与 Git 验证：`git diff --check`、`git status --short --branch`、`git worktree list --porcelain`。
4. 提交仅包含协作文档和当前任务文档；不 amend，不提交用户文件。
5. 从整理后的 `main` 提交创建 `D:\Agent\codex\worktrees\blog-semi-claude-<scope>` 和 `claude/<scope>` 分支。
6. 在新 worktree 中验证分支、基线、Claude 规则文件和干净状态。
7. 回到规范主目录复核现有用户改动与 `blog-semi-public-route` 活动 worktree 仍未被触碰。

## Validation Commands

```powershell
git diff --check
git status --short --branch
git worktree list --porcelain
git show --stat --oneline HEAD
git -C D:\Agent\codex\worktrees\<new-worktree> status --short --branch
git -C D:\Agent\codex\worktrees\<new-worktree> rev-parse --show-toplevel
```

本任务不需要运行 `npm.cmd run lint` 或 `npm.cmd run build`，因为不修改产品代码；若整理意外触及代码，则必须追加项目默认验证。

## Risk / Rollback Points

- 风险：提交时误纳入 `public/status/blog-semi-synthetic.json`。处理：提交前按文件路径显式 `git add`，并检查 staged diff。
- 风险：误触碰现有 `blog-semi-public-route`。处理：所有命令限定在规范主目录或新托管 worktree，创建前后复核其状态。
- 风险：新分支名称已被占用。处理：先查 `git branch -a` 和 `git worktree list`，使用未占用的 `claude/<scope>` 名称。
