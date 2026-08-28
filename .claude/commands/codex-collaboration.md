# Codex Collaboration Mode

启用本次 Codex 主协调、Claude Code 后台执行模式。不要立即修改文件，先输出协作契约和状态检查结果。

## 1. 建立 leaf 契约

根据用户请求和当前 Trellis task，整理并明确：

- `objective`：一个可独立完成的目标；
- `outcome`：可观察的完成结果；
- `constraints`：兼容性、产品和技术边界；
- `owned_files`：Claude 允许修改的文件或目录；
- `forbidden_files`：禁止修改的文件、生成物、密钥和发布材料；
- `acceptance`：目标测试、lint、build 和 `git diff --check` 命令；
- `worktree`、`branch` 和 `base_sha`。

如果请求跨越多个 leaf，先拆分并只选择当前一个；不要让 Codex 和 Claude 同时修改同一批文件。

## 2. 启动约定

将契约交给 Codex，由 Codex 在独立 worktree 中调用：

```powershell
& 'D:\Agent\codex\skills\codex-claude-collaboration\scripts\claude-bg-run.ps1' `
  -ProjectRoot 'D:\workspace4Cursor\blog-semi' `
  -Worktree '<managed-worktree>' `
  -Prompt '<leaf prompt with ownership and acceptance>' `
  -OwnedFile '<owned path or glob>' `
  -ForbiddenFile '<forbidden path or glob>'
```

启动后保存返回的 `taskId`，用 `claude-bg-status.ps1` 观察。后台运行期间不要把主工作区交给 Claude 修改。

## 3. 卡住和交接

- 十分钟任务本身正常；只有 agent 状态、daemon 更新时间、Git HEAD、worktree 状态和进程都没有变化，才标记 `suspected_stalled`。
- 先读取状态、日志和 diff，再决定等待、attach、resume 或从现有 diff 继续；不能无条件重跑。
- 完成时报告精确变更文件、commit、验证命令和已知风险。合并、冲突解决、推送、部署和最终发布验收由 Codex 统一完成。

用户参数：$ARGUMENTS
