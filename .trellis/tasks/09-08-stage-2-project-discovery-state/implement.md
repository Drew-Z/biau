# 项目分组实施顺序

- [x] 主会话读取项目列表、完整详情、卡片回调、既有移动项目检查、analytics 及 frontend state/quality 规范。
- [x] 根据父任务重新评估完成 PRD/设计收敛，确定默认 URL、桌面语义、白名单和独立验收范围。
- [x] 新增浏览器检查，在旧 build 上确认带分组 URL 失败：320px 期望 tool，实际 ai。
- [x] 实现纯解析工具、列表/详情接入及合同/analytics 用例，更新 state spec。
- [x] 运行专项、lint/build/performance/analytics、smoke 和受影响完整 UI 组；检查截图和源码哈希。
- [ ] 记录验证及复用基线，白名单本地提交并归档，实际返回父任务继续评估位置/焦点。

主要命令：`npm.cmd run projects:discovery-check`、`npm.cmd run projects:discovery-ui`（指定 UI_CHECK_BASE）、`npm.cmd run analytics:check`、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run performance:check`、`npm.cmd run check:ui:smoke`、相关完整 UI 组及 `git diff --check`。

本项复用上一叶子的本地 preview：5184，PID 21544，工具 session 4849；每次构建后核对实际资源，持续循环结束时由主会话关闭。原 5183 preview 不属于本次任务，保留。

恢复点：所有相关检查已通过，结果见 `verification.md`。完整专项 24+2 组、既有两个项目 UI 组、smoke 21 组通过；截图等待调整后复查 Morning 桌面两种语言及两个断点组通过。源码和保护快照哈希见 `delivery-evidence.json`。证据复用父循环的既有 Temp 目录，文件使用 project/projects 前缀；一次性提取 runner 已结束并清理，正式检查脚本保留。下一步精确提交、归档并实际返回父任务。
