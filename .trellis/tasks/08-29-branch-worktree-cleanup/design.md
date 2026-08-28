# Technical Design

## Decision Order

1. 读取 public-route 未提交 diff，并与该分支基线、当前 `main` 和相关检查进行对比。
2. 若改动仍有独立价值，先在原 worktree 中验证并提交，再将提交安全集成到 `main`；若已被 `main` 等价覆盖，只能在用户批准放弃后回收。
3. 在提交/集成完成前，不删除原 worktree 或其分支。
4. 只在精确删除清单获批后执行 `git worktree remove`、本地分支删除和远端分支删除。

## Protection Contract

- 主目录现有用户 JSON 不进入任何 staged 集合。
- 使用显式文件路径暂存，不使用宽泛 `git add .`。
- 不用 `git reset --hard`、`git clean` 或直接删除登记中的 worktree 目录。
- 删除前后均运行 `D:\workspace4Cursor\.workspace-management\audit-worktrees.ps1`。

## Rollback

提交后的代码可通过 commit 恢复；已删除分支仍可从已记录的 tip SHA 或 `main` 历史恢复。未提交代码一旦放弃不可从 Git 保证恢复，因此必须先获得包含精确 diff 结论的用户授权。
