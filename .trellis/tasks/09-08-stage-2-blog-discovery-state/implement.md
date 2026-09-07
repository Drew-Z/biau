# 博客状态实施顺序

- [x] 读取列表/详情/卡片/public curation/App/analytics 及 frontend state spec，确认根因和既有隐私边界。
- [x] 完成 PRD 收敛与设计，按父任务持续授权启动；滚动与项目分组明确留给后续任务。
- [x] 新增可独立运行的浏览器检查，在旧 build 上确认预期失败。
- [x] 实现纯 URL 投影，接入列表与详情返回，添加确定性 fixture 和 analytics 用例。
- [x] 执行针对性检查、lint/build、performance、analytics、smoke 和完整 UI；查看截图，更新 state/quality spec。
- [ ] 记录实际验收结果与局限，精确暂存/提交，清理本项临时执行文件和 preview。
- [ ] 归档本子任务，返回父任务并重新评估下一项。

检查命令：`npm.cmd run blog:discovery-check`、`npm.cmd run blog:discovery-ui`（指定 UI_CHECK_BASE）、`npm.cmd run analytics:check`、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run performance:check`、`npm.cmd run check:ui:smoke`、`npm.cmd run check:ui`、`git diff --check`。

恢复点：最终源码 lint/build/performance、smoke 21 组以及完整 UI 42 组全部通过；完整 UI 用时 645929ms、实际退出码 0，日志为 `check-ui-final.log`。12 个源码/规范/保护快照哈希与最终构建基线一致。当前进入精确白名单本地交付，随后归档并返回父任务；不得重复执行已完成修复。
