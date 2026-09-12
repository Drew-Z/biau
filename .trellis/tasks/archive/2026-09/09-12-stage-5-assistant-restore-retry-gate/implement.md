# 实施计划

- [x] 核对 main、当前父任务、原有 13 份资料、原 31 个已完成子任务及既有 worktree；创建目录前执行工作区只读审计。
- [x] 在未修改的构建上复现 1440/320 两种配置的恢复重试竞争；保留原始 exit 1、请求顺序、DOM/草稿/身份和截图。
- [x] 完成 PRD/design、owned/forbidden 文件与验证方案；本地范围由父循环及本次“继续”授权。
- [x] 激活本子任务，父循环记为 execute；不修改 scheduler。
- [x] 扩展历史回归至 152 场景，先在旧构建运行并保留有意义的失败。
- [x] 最小修改恢复重试的 disabled 派生与同步命令 guard；更新两份规范。
- [x] 依次 lint/build，冻结最终 source/build/spec 哈希；核对真实预览响应。
- [x] 运行三项助手合同、history 152、Branch 32、image 48、性能与 smoke。
- [x] 完整 UI 取得真实终局并在原字节输入上验证；检查新增断言、共享入口、受保护资料及 Git 差异。
- [x] 记录 verification 和精确提交白名单，本地无签名提交。
- [ ] 只归档本子任务、提交移动与父记账，实际 `task.py start 09-06-website-completion-roadmap` 返回父任务并重新评估。
- [ ] 追加本轮日志；关闭自己创建的预览并清理可丢弃临时文件；核对最终 Git 状态。

## 验证命令

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

每个命令保存实际退出码、起止时间及日志。代码/构建在受检阶段发生变化时重新建立清单并按影响补验，不把旧结果移植到新输入。

## 证据与进程

- 证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-restore-retry-1icsdx4s`。
- `baseline.json`：1554 tracked、13 原 untracked、172 dist 原字节及保护快照。
- `assessment-probe.mjs` / `assessment-before.json` / 两幅 before 截图：2/2 浏览器复现、真实模型 0；生成的临时 fixture 模块已由 finally 删除。
- 后台启动预览的复合命令被自动审批拒绝、没有执行；改为工具管理的前台 Vite preview，工具会话 `68934`，本地端口 5198。最终需按实际身份清理。
- 多行 Python 准备命令经本机 `python.cmd` 未实际执行；已改用该入口解析出的原生 Python 3.13.12 可执行文件完成基线。未将准备步骤当作产品检查。
- `baseline-proof.json` 重新核对原 506 source、172 build、3 spec 及 47 个真实 HTTP 响应，与前轮冻结输入逐字节一致；原 13 份资料/保护快照保持。随后仅新增本轮计划内源码与回归。
- `history-before-result.json`：新增永久回归在旧构建真实 exit 1，首个 1440 当前恢复成功场景失败于 `current-session restore retry must share the pending history action gate`（actual false / expected true），日志与截图已保留。
- `lint-final-result.json`、`build-final-result.json` 真实 exit 0；三项助手合同 `api-final` / `conversation-final` / `browser-state-final` 均真实 exit 0。
- `validation-inputs.json` / `freeze.json`：冻结最终 506 source、172 build、3 spec；49 个 HTML/JS/CSS 实际 HTTP 响应与构建原字节一致，原资料与保护快照保持。
- 历史矩阵工具会话 `21936` 已取得真实 exit 0：152/152、模型调用 0。两个同步批次场景在四配置均证明第二次 click 前 DOM 仍 enabled，再由 ref 门禁阻止并发 POST。预览实际 PID 29344、创建时间/命令/可执行路径记录于 `preview.json`。
- Branch 32/32、image 48/48、性能和 smoke 21/0（10181 ms）均真实 exit 0。主会话已查看 `history-final/history-restore-retry-pending-1440.png` 与 `320.png` 的提示区域，文本/按钮没有重叠或越界。
- 完整 UI 工具会话 `84385` 已取得真实 exit 0：46 组通过、0 失败，组累计 1737358 ms；实际起止为 2026-09-12T14:37:04.5473837Z 至 15:06:04.7680681Z。完整 UI 内也执行了 history 152、Branch 32、image 48 并全部通过。原始日志/回执为 `full-ui.log`、`full-ui-result.json`。
- `pre-full-ui-checks.json` 汇总 10 项前置命令的真实成功、日志哈希和最终输入清单哈希；`source-review.json` 证明生产源码仅为计划中的两个替换，测试与组件字节仍等于冻结值。`work-commit-plan.json` 保存 13 文件白名单，检查时索引为空、只有 6 个计划内 tracked 改动和本子任务 7 个新文件，原 13 份资料未混入。
- `final-validation.json` 于完整 UI 结束后验证 506 source、172 build、3 spec 及 49 个 HTTP 响应仍与冻结输入一致；原 13 份资料、其余既有 tracked 文件及保护快照保持。`git diff --check` 通过。质量门禁已通过，后续只有精确范围提交、归档、父任务评估及日志收尾。
- 工作提交 `f467ecaa0e130af5cce19e854ef8fd7df391a251` 已完成，精确 13 文件，无签名、未 push/deploy。`work-commit.json` 核对父提交、文件集合、每个 Git blob 和受检工作树原字节；提交后已跟踪工作树/索引干净，仅保留原 13 份资料。
