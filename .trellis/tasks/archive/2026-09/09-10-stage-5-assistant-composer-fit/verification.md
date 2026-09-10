# 验证记录

## 基线与修复

- 基线：`f529afcb`，父任务第 28 轮完整 UI 46/0、exit 0；527 个原受检文件未漂移。基线证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-roadmap-round28-20260910T011736710Z`。
- 稳定负向：320px 英文、三主题的输入内部可见高度 57px，提示内容需要 76px。新增常驻断言在旧构建 `320/morning` 以同一 `76 > 57` 明确失败，见 `placeholder-negative.log`。
- 修复：`route-pages.css` 原有 `max-width: 360px` 块中增加三行加上下 padding/border 的最小高度；320px 输入框从约 58.63px 增至 78px，内部 76px，字体和提示原文保持。
- 常驻回归：现有助手语言矩阵在中文、英文及发送后回到中文三个空输入状态检查 `scrollHeight <= clientHeight + 1`。移动测量先等全屏面板实际达到视口宽度及字体就绪。

## 本轮证据

最终构建/检查证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-assistant-composer-fit-20260910T021328707Z`。

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| lint | exit 0 | `lint.log`、最后检查器版本 `lint-final.log` |
| build | exit 0 | `build.log`，`route-pages-DNZ5UIxs.css` |
| 助手语言专项 | 12 组通过，真实模型调用 0 | `assistant-interface-final.log` |
| 边界与长草稿 | 22 组通过，0 失败；320/360/361/390/430/1440px，640/900px 高度，中英文及主题对照 | `composer-boundaries-verified.log`、`composer-boundaries.json` |
| 三项助手合同 | API、conversation、browser-state 均 exit 0 | 对应 `assistant-public-*-check.log` |
| smoke | 21 组 / 0 失败，exit 0 | `smoke.log` |
| performance | exit 0；入口 JS 320266 / 430000 bytes，主 CSS 152582 / 222755 bytes | `performance-check.log` |
| 最终完整 UI | exit 0，46 组 / 0 失败，1372710ms | `check-ui-final.log`、`check-ui-final-result.json` |

边界检查同时核对输入/图片/发送控件的 viewport 与面板 containment、中心命中和移动 44px 目标；长草稿内部滚动、Shift+Enter 保留草稿、语言切换不丢草稿、清空后恢复完整 placeholder。代表最终 320px 截图 `composer-final-320-en.png` 已人工复看。

## 检查器诊断与保留限制

- 初版辅助边界测量只等 `.is-fullscreen` 类，偶尔测到打开过程中的 124.86px 输入宽度；实际全屏稳定宽度为 156.86px。增加面板宽度就绪门禁后不再把过渡布局当成最终裁切；真实的旧构建 76/57 缺口独立保留。
- 辅助夹具曾将会话过期返回成 `not-found`，进入了现有的恢复失败禁用态。改成协议规定的 `session-not-found` 后，22 组通过；没有修改生产 decoder 或恢复逻辑。
- 初版辅助命令漏传输出目录参数，创建了本轮自有 `D:/workspace4Cursor/blog-semi/undefined/composer-boundaries.json` 与 `composer-final-320-en.png`。自动审批拒绝其搬移/删除，仅返回 `blocked by policy`；原样保留，不纳入提交白名单。后续命令已使用上面的正确 Temp 目录。

## 完整检查恢复点

- 会话 `2017` 的最终 `npm.cmd run check:ui` 已于 `2026-09-10T03:08:28.083Z` 完成，实际 exit 0；本轮使用原有 `http://127.0.0.1:5190` preview，没有启动额外服务。
- `final-baseline-verification.json` 已核对 528 个源码、公开文件、质量规范和构建文件全部无漂移；保护快照保持 `D744AD0698C429FC3ECD33AF3CAE16911E00234C6E4D28AD30E5805BB9414909`。
- 本子任务最终完整检查实际重新执行，没有复用父任务的 46/0。已复看最终完整检查生成的 `public-assistant-320-en-viewport.png`，含历史与分支控件时提示仍完整可见。
- `git diff --check` 通过。最终范围为一个 CSS 规则、同一助手语言检查器和一条质量规范；无新 API、依赖或业务状态变更。

## 交付

- 工作提交：`b3b331fb7816c6d0f88d8fdc500780da576f6624`，13 个文件，精确暂存白名单及 `git diff --cached --check` 通过；没有推送。
- 提交后源码改动已清零，保护快照保持原 SHA-256；原有九项未跟踪记录及本轮 `undefined/` 两个临时文件继续保留。
- 已通过 `task.py archive 09-10-stage-5-assistant-composer-fit --no-commit` 仅归档本子任务，归档位置为 `archive/2026-09/09-10-stage-5-assistant-composer-fit`；原活动目录已不存在，当前会话指针已按脚本清空。归档提交后实际返回父任务并补充回切记录。
