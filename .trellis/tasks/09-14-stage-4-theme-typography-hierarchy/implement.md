# 三主题文字层级与卡片配色实施计划

## 当前状态

本轮仅规划。子任务创建于 2026-09-14，规划于 2026-09-15 继续；复用原目录，不按日期重新建项。完成 PRD/design/本文件与基线记录后停止在 planning；没有执行产品修改或运行实现验收。

推荐字体方向为轻衬线卡片标题；可选偏好未收到明确选项，方案按推荐默认整理。该偏好不阻塞规划完成，不能记录成已获用户选择。

## 顺序与检查点

- [x] 恢复前次分析、父 PRD/design/implement 和当前 Git 状态；确认已有子任务及唯一规范目录。
- [x] 记录 planning 基线，创建目录前运行工作区只读审计；原 13 份未跟踪资料与历史 worktree 保留。
- [x] 建立本子任务并完成需求收敛、影响范围、设计与验收矩阵；相关事实详见 baseline.md。
- [ ] 实施开始前重新核对本 PRD/design/implement、现有用户选择及工作区差异；按父路线图授权实际 start 当前子任务，使用 trellis-before-dev 读取相关前端规范。
- [ ] 保存当前三主题代表截图与最长标题矩形；确认实际编译源码仍匹配前次证据，差异则刷新基线。
- [ ] 节点 A：修复分类 accent 与背景/边框覆盖链；用真实浏览器验证四种分类与各 variant 的材质归属，保存修改前失败与修复后结果。
- [ ] 节点 B：按角色调整标题、正文、辅助文字、状态、计数、按钮和共享导航；先收敛 Stellar，再投影 Morning/Nature，记录实际字体与背景对比度。
- [ ] 节点 C：依据长标题矩形选择统一桌面卡片高度，移动端保持自适应；复核摘要、动作区、首屏节奏与 44px 目标，复用轮播专项确认周期/输入保持。
- [ ] 主会话完成 trellis-check；检查本任务全部 diff、动态主题/语言与状态归属，更新新视觉的确定性检查，不弱化旧交互断言。
- [ ] 依次 lint/build、首页层级专项、原运动/缩放专项、performance、smoke；主会话查看三主题桌面与窄屏前后截图。
- [ ] 方案和专项稳定后，在同一最终版本运行一次完整 UI；失败先诊断，仅在输入变化/修复/未解问题需要时重跑对应检查。
- [ ] trellis-update-spec：更新分类 token 所有权、文字角色与新的导航合同；检查器、规范与产品采用同一验收版本。
- [ ] 冻结最终输入/证据，核对精确白名单与原资料；本地不签名提交，保留所有权与回滚信息。
- [ ] 只归档本子任务；实际 start 父路线图后再递增 round/清空 activeChild，记录交付及新评估；关闭自有预览并检查本轮临时资源用途。

## 验证命令

实现后按实际检查入口执行；下面的 typography 脚本是待实现交付物，本轮没有运行它。

```powershell
npm.cmd run lint
npm.cmd run build
$env:UI_CHECK_BASE = 'http://127.0.0.1:5198'
node scripts/check-home-typography-ui.mjs
node scripts/check-home-carousel-motion-ui.mjs
node scripts/check-home-carousel-wheel-ui.mjs
npm.cmd run performance:check
npm.cmd run check:ui:smoke
npm.cmd run check:ui
git diff --check
```

网络隔离和 fixture 沿用仓库既有 browser helper。新专项需提供独立入口，支持由完整 UI 调用；证据目录独立命名、拒绝覆盖历史失败。开始正式全量前保存源码/构建版本，不能拿旧页面的完整 UI 结论替代新视觉的验收。

## 本轮规划验收

确认三份规划和 baseline 文件存在且无占位项，PRD 的每项需求均映射验收，引用的现有源码/规范/证据路径可访问。审阅 PRD 全文完成收敛；核对任务仍为 planning，父子关联唯一、原 38 个子任务不变。只检查文档结构与 Git 范围，不运行 lint/build/UI 来假装验证尚未实施的页面。

本轮若保存规划提交，只包含当前规划文件与父任务记账，不归档子任务、不标记实现通过、不执行 task.py start 或 push。后续用户要求实施时直接恢复本目录，无需重复创建任务或询问常规启动许可。
