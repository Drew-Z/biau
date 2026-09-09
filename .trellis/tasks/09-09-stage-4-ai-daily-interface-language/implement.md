# 实施与验证

- [x] 第 15 轮完整交付/归档/日志完成，实际返回父任务并核对规范目录、Git、remote/worktree 和持续授权。
- [x] 完整读取两页面、public API decoder、现有 fixture 和相关 UI 检查；收敛本轮错误/状态/原文/请求边界。
- [x] 保存原源码和当前构建证据，先在旧界面取得真实语言负向：`ai-daily-language-negative.log` 在 320/Morning/英文因日报根语言未切换而 exit 1。
- [x] 原样提取共享 fixture；实现 UI 字典、有限错误类别、日期 formatter 和两页面展示，保持异步生命周期。
- [x] 完成确定性和状态语言矩阵，检查实际截图，修复有证据的问题；同步规范。
- [x] lint/build、相关合同、performance、完整 language、smoke 和完整 UI 通过；冻结与复核本轮最终状态。
- [ ] 精确本地工作提交，仅归档本项、实际启动父任务并继续下一轮。

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-ai-daily-language-20260909-1dc1d2cc`。复用自有 5190 preview 前核对 PID/命令及实际返回字节；原5183服务保留。仅本地 fixture，零真实模型请求。

验证命令：`npm.cmd run ai-daily:public-payload-check`、`npm.cmd run ai-daily:public-feed-check`、`npm.cmd run analytics:check`、`npm.cmd run docs:deployment-check`、`npm.cmd run assistant:kg-check`、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run performance:check`、日报语言专项同一 exported function、`npm.cmd run language:ui`、`npm.cmd run check:ui:smoke`、`npm.cmd run check:ui`。

## 当前恢复点

- 当前业务构建：`build-notice.log`；最后 lint：`lint-notice.log`。日报专项 `ai-daily-language-final.log` 已实际 exit 0（24+4+10+3+3 组、48854.2201ms、modelCalls 0）。
- `source-contract-review.json` 验证两 load 回调仅有错误分类变化，三个请求/SEO effect 原样保留，16 个受保护基线文件及原有十一份资料不变。
- `verification-final-freeze.json` 冻结 32 个受检文件、49 个 HTML/JS/CSS 构建、9 个 preview 响应；preview PID 10300/命令已重新核对。
- 终端 session `63849` 已真实 exit 0：完整语言通过，smoke 21/0（9878ms），完整 UI 46/0（1387595ms，外层 1389226.792ms）。`post-run-hash-check.json` 确认全部冻结文件、构建集合与响应无漂移。
- 保留 `ai-daily-language-negative/first/layout/reachability/anchor` 的原始失败及诊断。目录短章节的既有 scroll spy 和固定底栏下的原生 if-needed 滚动已通过实测澄清，只修检查器定位，不改共享阅读 hook/guide。
