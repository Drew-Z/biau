# Stage 1 交付步骤

- [x] 读取父任务和 UI-012 交付记录，核对 7 文件完整 diff。
- [x] 保存 `delivery-baseline.json`，核对已有日志、脚本语法、diff 和文件边界。
- [x] 按 PRD 收敛检查规划资料，用 `task.py start` 激活。
- [x] 精确暂存 7 文件与本任务资料，比较索引 blob 与工作区内容，本地提交 `cb327d8c`。
- [x] 比较交付后 SHA-256，保存验收结果，使用 `archive --no-commit` 归档子任务。
- [x] 实际执行 `task.py start 09-06-website-completion-roadmap`，当前来源为本会话，进入第二轮博客状态评估。

当前检查：`node --check scripts/check-ui.mjs`、`git diff --check`、JSON 解析、暂存路径与 blob 等值核验。完整运行记录复用 `09-04-continuous-ui-quality-loop/round-11-status-detail-actions.md` 所列日志，不把它误报为本子任务新跑的检查。
