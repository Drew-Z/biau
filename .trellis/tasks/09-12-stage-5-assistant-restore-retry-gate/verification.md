# 验收记录

状态：质量门禁通过，等待本地提交与归档。

## 旧版本证据

- 基线 HEAD：`e72ed5428868046e9eb299d9af73c3578fa772cf`。
- `assessment-probe.mjs` 实际 exit 1。1440/Morning/中文与 320/Stellar/英文均观测到：B 恢复 pending 时 A 的重试仍 enabled；A 成功后 B 返回 503，已显示的 A 历史保留但输入框重新禁用、恢复错误提示重新出现。
- 两种配置均只有 B/A 两个明确恢复动作，聊天请求为 0；A 的草稿/身份未变化；无页面、未知 API 或外部请求错误。
- 证据：`C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-restore-retry-1icsdx4s/assessment-before.json`，以及 `assessment-before-1440.png`、`assessment-before-320.png`。这不是生产模型验收。
- `baseline-proof.json` 验证旧 source 506、build 172、spec 3、真实预览响应 47 均与前轮冻结清单一致，原 13 份资料与保护快照保持。
- 新增永久历史回归在旧构建真实 exit 1：`1440/morning/zh/restore-retry-restore-0-success` 失败于 `current-session restore retry must share the pending history action gate`，actual false / expected true。见 `history-before.log`、`history-before-result.json` 和 `history-before/` 截图，属于预期的产品行为失败。

## 最终版本

生产改动只有两行：恢复重试的 rendered disabled 增加历史 loading ID；命令 guard 增加同步 history pending ref。已有离线/限流、target/controller、手动恢复接替和 finally 身份判断保留。未改变 API、文案、样式、依赖或既有完整 UI 组。

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| lint / build | exit 0 / 0 | `lint-final-result.json` / `build-final-result.json` |
| API / conversation / browser-state 合同 | 三项 exit 0 | 三份对应 `*-final-result.json` 和日志 |
| 历史浏览器矩阵 | 152/152，模型 0，exit 0 | `history-final.log` / `history-final-result.json` |
| Branch 浏览器矩阵 | 32/32，模型 0，exit 0 | `branch-final.log` / `branch-final-result.json` |
| image 浏览器矩阵 | 48/48，模型 0，exit 0 | `image-final.log` / `image-final-result.json` |
| 性能 | exit 0；入口 JS 320266/430000 bytes | `performance-final.log` / 对应 result |
| smoke | 21 组、0 失败、10181 ms，exit 0 | `smoke-final.log` / 对应 result |
| 完整 UI | 46 组、0 失败、1737358 ms，exit 0 | 工具会话 `84385`、`full-ui.log` / `full-ui-result.json` |

最终版本冻结在 `validation-inputs.json`：506 source、172 build、3 spec。`freeze.json` 及完整 UI 结束后的 `final-validation.json` 均证明 49 个实际 HTML/JS/CSS HTTP 响应与构建一致；受检输入、其余既有 tracked 文件、13 份原资料及保护快照原字节保持。完整 UI 的实际运行时间为 2026-09-12T14:37:04.5473837Z 至 15:06:04.7680681Z，组累计与外层进程耗时分别记录，没有混用。

主会话核验新增场景的实际请求、DOM、身份/草稿及后续 Branch/parent/history；同一事件批次同时证明 disabled 尚未投影和额外 POST 为零。首次恢复 503 选项只作用于新场景，原 100 个场景保留；未知 API/外部请求/页面错误仍失败，gate 和页面仍在 finally 清理。已查看 1440/320 提示截图，文本与按钮无重叠或越界。

`source-review.json` 确认组件精确等于基线加两个计划内替换；`pre-full-ui-checks.json` 绑定 10 项前置命令日志与输入清单。完整 UI 内也通过了 152/32/48 三个矩阵。任务 manifest 各 4 条引用有效，`git diff --check` 通过；提交按 `work-commit-plan.json` 的 13 文件白名单执行，不包含原有资料。

本次只证明本地 fixture/构建行为；没有执行生产模型/DB/relay 验收、push、deploy、签名、公开发布或 Feed/Cron 操作，也未修改 scheduler。依赖、内容和生产门禁仍属于父路线图的独立范围。
