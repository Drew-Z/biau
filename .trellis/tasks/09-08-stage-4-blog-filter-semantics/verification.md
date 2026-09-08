# 博客栏目选中状态验收

2026-09-08，用户要求在新会话继续原会话 `01a07cf9-7ffa-7843-a3f6-c20b39aa224b`。主会话在规范目录接管原有未完成子任务，没有重建任务或覆盖其他工作。

## 行为与范围

- 桌面栏目使用具名 `role="group"`，六个原生按钮分别从已有 `selectedColumn` 派生 `aria-pressed`，只有当前栏目为 true。移动原生 select 继续共用同一值和回调。
- 保留点击、Enter、Space、Tab 和 Shift+Tab，以及刷新、复制地址、前进/后退、空结果、空栏目和 720/721 切换。
- 接续时组件修复和语义检查已经存在。本会话审核源码，并将检查器中逐个程序化 focus 改为真实 Tab/Shift+Tab 遍历；组件、CSS、路由、公开内容和依赖没有额外变化。

## 检查结果

| 检查 | 来源与实际结果 |
| --- | --- |
| 未修复负向基线 | 原会话日志明确失败：六个 `aria-pressed` 均为 null |
| lint、TypeScript/build | 本会话重跑，组合进程 exit 0；入口为 `index-SpSfukuL.js` |
| 博客 URL 合同 | 本会话重跑，8 组、25 个隔离 fixture posts，通过 |
| performance | 本会话重跑通过；入口 CSS 152358 bytes、route CSS 141623 bytes、入口 JS 295777 bytes |
| 最终博客专项 | 本会话重跑通过：24 组视口/主题/语言，6 组全栏目语义/原生键盘/断点 |
| 最终 smoke | 本会话重跑通过：21 组、0 失败，9529ms |
| 完整 UI | 明确复用原会话日志：45 组、0 失败，970554ms；不是本会话重新运行全量 |

完整 UI 的复用依据：原 build 日志、接续时 dist 和本会话重新 build 的入口文件名一致；重新 build 前后入口 JS、HTML 的 SHA-256 完全一致；5184 preview 返回相同字节。`scripts/check-ui.mjs` 未变。本会话只加强博客专项的 Tab 检查，并已重跑完整博客专项和 smoke。原完整 UI 的进程退出码未在本会话另行取得，完成依据是日志的最终通过摘要。

主会话查看了本次生成的 721px Morning 和 1440px Stellar 截图，筛选控件、结果与页面结构保持。六种语义场景与 24 种目录场景的截图保留在本轮证据目录。

## 接续与保护边界

- `task.py start` 已将本会话的任务指针恢复到现有子任务，父任务 `ownerThreadId` 已改为 `01a080b3-741a-74c0-a22b-fe6dcfae4b15`。
- 原生工具接受了 heartbeat `automation` 迁入本会话的更新，并返回 `PAUSED`。交付前复核发现原 `automation.toml` 已不存在；无法据此确认当前调度仍保存，未重建或重新启用自动化。本会话手动执行不受影响。
- 保护快照 `public/status/blog-semi-synthetic.json` 仍为 `d744ad0698c429fc3ecd33af3cae16911e00234c6e4d28ad30e5805bb9414909`。路由、URL 工具、公开数据、CSS、依赖和 lockfile 未纳入本项提交。
- 只使用本地 preview 和 API fixture；未调用真实模型、推送、部署、签名、发布公开内容、启用 Feed/Cron 或消费 usage reset。检查范围限 Chromium，不能推断生产或跨浏览器结果。
- 原有前导空格目录 ` .trellis/`、持续 UI 任务未跟踪资料、历史 worktree、原有 5183/5184 服务和历史证据均保留。本轮没有创建一次性脚本；新日志、截图与哈希清单属于验收证据。

## 证据与交付

`delivery-evidence.json` 保存本会话/来源会话、构建/源码/日志哈希和检查时长。当前证据在 `C:/Users/zhang/AppData/Local/Temp/blog-semi-resume-20260908-62seN4`；来源证据在 `C:/Users/zhang/AppData/Local/Temp/blog-semi-discovery-20260908-4f78e2a8f7f64b4799ddd9b9e3b8da57`。

按白名单本地提交后，仅归档本子任务并实际运行 `task.py start 09-06-website-completion-roadmap` 返回父任务，继续依据最新证据评估。
