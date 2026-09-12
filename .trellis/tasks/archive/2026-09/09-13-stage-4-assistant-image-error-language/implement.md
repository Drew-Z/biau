# 实施计划

- [x] 核对父任务、HEAD、原资料、旧构建；完成 4 场景有效负向探针。
- [x] 完成 PRD/design/implement、文件边界与本地授权评审。
- [x] 使用 trellis-before-dev 读取任务和相关 frontend 指南，启动本子任务。
- [x] 扩展现有图片检查，先在旧构建观察真实语言断言失败。
- [x] 仅修改组件四处错误状态/文案投影。
- [x] trellis-check：审查完整差异，执行下面的必要验证。
- [x] trellis-update-spec：记录错误代码派生译文契约与 72 场景矩阵。
- [x] 冻结最终 source/build/spec 与本地预览响应，完整 UI 后再次核对。
- [x] Phase 3.4：核对精确暂存文件、提交 blob 与原字节，完成无签名本地提交 `cc74128ba8929a06e5ac87dbd560f65f91fdb320`。
- [x] trellis-finish-work：只归档本子任务、实际返回父任务进入第 51 轮、再评估、记录 Session 137 并回收自有预览。

## 验证

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-branch-retry-fa3hoffd`；所有日志及结果使用新名称，拒绝覆盖。

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-conversation-check
npm.cmd run assistant:public-browser-state-check
$env:UI_CHECK_BASE = 'http://127.0.0.1:5198'
node scripts/check-public-assistant-image-ui.mjs
npm.cmd run performance:check
npm.cmd run check:ui:smoke
npm.cmd run check:ui
git diff --check
```

完整 UI 已包含本次图片矩阵、历史 188、Branch 32 和公共界面语言；没有新变化或失败时不重跑已通过的长检查。
