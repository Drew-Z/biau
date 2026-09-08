# 执行计划

- [x] 核对父循环、来源审计、用户语言决定、Git 与工作区审计。
- [x] 阅读 state/hook/type 规范及即将修改的公共界面实现，完成范围设计。
- [x] 激活子任务；建立语言专项检查并在旧构建取得有效失败。
- [x] 实施统一语言类型/状态/持久化、共享界面文案和语言标记。
- [x] 同步必要的持久化检查假设，纳入日常完整 UI 入口。
- [x] 运行静态检查、语言专项、相关目录/阅读回归、smoke；检查桌面/手机截图。
- [ ] 更新规范和验收证据，精确白名单本地提交。
- [ ] 归档本子任务，提交归档与父记账，实际 start 父任务并评估目录公共控件。

## Commands

```powershell
python ./.trellis/scripts/task.py start 09-08-stage-4-public-language-shell
npm.cmd run lint
npm.cmd run build
npm.cmd run language:ui
npm.cmd run blog:discovery-ui
npm.cmd run projects:discovery-ui
npm.cmd run reading:navigation-ui
npm.cmd run check:ui:smoke
npm.cmd run performance:check
git diff --check
```

所有浏览器命令使用本地 preview，具体端口及产物目录写入 verification。检查异步启动时记录实际 exit code 后才能通过。
