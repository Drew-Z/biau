# 实施计划

## 顺序

- [x] 核对父任务、当前 HEAD、原资料和上一轮冻结构建，完成 8 场景本地负向探针。
- [x] 创建独立子任务，完成 PRD/design/implement 和文件边界；按既有授权评审并启动。
- [x] 按 trellis-before-dev 读取当前任务与 frontend 指南。
- [x] 扩展现有历史回归，并在旧构建确认新增断言真正失败。
- [x] 仅增加错误文案的 restore 显示上下文。
- [x] trellis-check：检查完整差异，运行以下必要验证并保存真实退出码。
- [x] trellis-update-spec：记录恢复文案与专用错误的优先级，更新历史矩阵数量。
- [x] 冻结最终输入和预览响应，完成 smoke/完整 UI 后核对无漂移。
- [x] Phase 3.4：核对精确暂存白名单、本地无签名提交。
- [ ] trellis-finish-work：只归档本子任务，实际返回父任务、重新评估、记录会话及清理自有资源。

## 验证命令

使用本轮独立证据目录 `C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-restore-copy-5p83n7xv`；日志拒绝覆盖，旧轮次结果不改写。

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-conversation-check
npm.cmd run assistant:public-browser-state-check
$env:UI_CHECK_BASE = 'http://127.0.0.1:5198'
node scripts/check-public-assistant-history-ui.mjs
node scripts/check-public-assistant-branch-ui.mjs
node scripts/check-public-assistant-image-ui.mjs
npm.cmd run performance:check
npm.cmd run check:ui:smoke
npm.cmd run check:ui
git diff --check
```

完整 UI 包含语言、replay refresh、历史 188、Branch 32 和 image 48；取得最终结果后不重复运行输入未变的长检查。截图复核 1440/320 的服务失败与通用失败；浏览器几何检查覆盖四配置。

## 过程记录

- 首次基线脚本错误地 trim 了 NUL 分隔 Git 输出，导致前导空格目录路径读失败；已修正为不 trim 文件名，仓库未修改、浏览器尚未开始。记录在 `preparation-error.json`，不计产品失败。
- 正确基线保存 1561 tracked、13 原 untracked、172 build 的原字节 SHA-256；保护快照哈希保持。
- `baseline-proof.json` 证明 506 source/172 build/3 spec 与上一轮最终输入一致；`assessment-before.json` 真实 exit 1，8/8 文案不符，网络边界检查通过。

- 最终完整 UI 28906 已取得 exit 0、46/0、组累计 1899615ms；外层 1904137ms。`final-validation.json` 再次核对 506/172/3/49 与冻结输入一致，`final-checks.json` 收齐真实终局。首次中断日志单独保留。

- 工作提交 `5807095d6ea35451665e204e7befea72822f47ee`：精确 13 文件，Git blob/原字节核验通过，无签名、未推送。恢复预览 PID 32728 已核对身份后停止，端口 5198 已真实重绑验证释放。
