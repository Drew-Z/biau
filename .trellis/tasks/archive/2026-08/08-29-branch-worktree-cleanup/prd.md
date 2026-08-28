# 收尾项目分支与 worktree

## Goal

在不丢失任何用户工作或活动任务内容的前提下，审计并收尾 `blog-semi` 的旧分支、活动 worktree 和远端分支，使 `main`、Claude 开发 worktree 与远端状态清晰可追溯。

## Requirements

- 保护 `public/status/blog-semi-synthetic.json` 的既有用户改动；除非用户另行指定，不提交、不丢弃。
- 逐行审计 `D:\workspace4Cursor\blog-semi-public-route` 中两个未提交文件，确认其是否已被 `main` 等价实现、仍有独立价值或存在冲突风险。
- 在任何删除前列出精确的 worktree、本地分支和远端分支目标，以及可恢复边界，并取得用户明确批准。
- 只回收工作树干净、提交已进入远端默认分支、且没有进行中任务依赖的 worktree。
- 分支删除只针对已确认完全合并且不再承担交接职责的分支；保留 `main` 和 `claude/blog-semi-claude-dev`。
- 推送只包含已经提交的工作流整理和本任务明确批准的提交；不安装自动 push hook。
- 用户已批准放弃 superseded public-route 未提交草稿、回收精确 worktree、删除列出的已合并分支并推送 `main`。
- `public/status/blog-semi-synthetic.json` 是生成的监控快照，不含敏感信息；当前脏版本记录 2026-08-11 的环境相关离线结果，不应直接提交。是否还原基线仍需用户确认。

## Acceptance Criteria

- [x] `blog-semi-public-route` 的两份未提交改动有证据支持的归宿决定。
- [x] 未经批准不执行 worktree、分支或远端分支删除。
- [x] 获批删除后，`git worktree list --porcelain` 只保留规范主目录和仍需保留的活动 worktree。
- [x] 旧本地/远端分支均按已合并和依赖状态处理，`git branch --no-merged main` 为空。
- [x] `main` 的预期提交进入 `origin/main`，且用户 JSON 仍保持原有未提交状态。
- [x] 最终运行工作区审计并报告所有保留项与未处理风险。

## Open Question

- 是否将 `public/status/blog-semi-synthetic.json` 还原到已提交基线，并把 Node `fetch` 访问自定义域名时的 `ECONNRESET` 作为独立监控兼容性任务处理。推荐：还原基线，避免把旧且环境相关的离线结果提交为当前生产事实。

## Out Of Scope

- 不修改产品行为来“顺便解决”清理过程中发现的功能需求。
- 不删除 `public/status/blog-semi-synthetic.json` 或其它归属不明文件。
- 不回收新的 Claude 开发 worktree，除非后续确认它不再承担交接用途。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
