# 实施与验收

- [x] 核对父任务、HEAD、1591 tracked 与原 13 untracked；508 source / 4 spec / 172 build 与上一项冻结一致，49 个实际响应匹配。
- [x] 完成三主题原生缩放和 Ctrl 滚轮复现、页面 pinch 对照及严格命中的普通滚轮对照；保存初次无效对照与观察限制。
- [x] 工作区只读审计、规范目录/远端/worktree 核对；创建唯一子任务并完成 PRD/design/implement 收敛。
- [x] 实际激活子任务，按 trellis-before-dev 复核相关规范。
- [x] 新专项先在旧构建真实失败，再新增 Ctrl 守卫并接入原完整 UI 组。
- [x] 按 trellis-check 复审产品、专项和原断言；运行六项门禁并保存截图、退出码和冻结输入。
- [ ] 按 trellis-update-spec 更新合同；精确本地无签名工作提交，不推送。
- [ ] 仅归档当前子任务，修正引用并提交移动，实际返回父任务进入第 54 轮评估。
- [ ] 追加 Session 140，保留旧 journal/index；关闭自有预览，核对端口和最终受检字节。

## 验证命令

```powershell
npm.cmd run lint
npm.cmd run build
$env:UI_CHECK_BASE = 'http://127.0.0.1:5198'
node scripts/check-home-carousel-wheel-ui.mjs
npm.cmd run performance:check
npm.cmd run check:ui:smoke
npm.cmd run check:ui
git diff --check
```

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-carousel-wheel-fj7gm_p4`。自有 preview 为工具会话 83094 / PID 6948 / 5198；关闭前按 preview.json 的原始时间字符串、可执行路径、完整命令行及端口归属复核。读取时间用 `ConvertFrom-Json -DateKind String`，避免自动日期转换丢失精度或时区。

提交前核对空索引、精确白名单、Git blob 和工作树原字节。只归档本子任务，必须实际执行 `task.py start 09-06-website-completion-roadmap`；不归档父任务、持续队列或历史 worktree。所有未知资料保留；本地 waiting 不代表 scheduler 已暂停。
