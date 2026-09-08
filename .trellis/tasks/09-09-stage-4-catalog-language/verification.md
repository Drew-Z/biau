# 目录公共界面双语验收

2026-09-09，规范目录 `D:/workspace4Cursor/blog-semi`，基线提交 `0ac0dfa97afeb6d2da34e760ca24231862d701be`。本轮主会话实现与最终验证，沿用父任务的本地循环授权。

## 结果与范围

知识库和项目目录的标题、搜索/栏目/分组、计数、分页、空态、普通阅读/详情操作与辅助名称已消费共享语言偏好。栏目保留双语身份；作者内容和 publication 投影保持原值与中文语义。未引入第二套语言状态、URL 参数或路由 key。

真实浏览器发现移动分页按钮高 42px，补齐 44px 后又在 320px 英文截图发现 Next 换行；最终在原 720px 媒体查询中使用三列 grid，Previous / 页码 / Next 保持一行。最终几何断言和 320px Morning 英文截图人工复看均通过。原生 select 的选项保留完整双语身份，折叠控件仍沿用原有紧凑省略显示。

## 实际检查

| 检查 | 结果 |
| --- | --- |
| `npm.cmd run lint` | 最终版本 exit 0，`final-lint.log` |
| `npm.cmd run build` | 最终版本 exit 0，`final-build.log`，入口 `index-J5mLG8va.js` |
| `npm.cmd run performance:check` | 最终构建 exit 0，入口 JS 300449 / 430000 bytes |
| `npm.cmd run blog:discovery-check` | exit 0，8 组、25 篇隔离 fixture |
| `npm.cmd run projects:discovery-check` | exit 0，6 组 |
| `npm.cmd run analytics:check` | exit 0，17 路由用例 |
| `npm.cmd run project-registry:check` | exit 0，12 identities / 9 publication records |
| `npm.cmd run language:ui` | exit 0，matrix 12 / catalog 24 / empty 12 / storage 5 / loading 1 / modelCalls 0 |
| 独立 `checkFilterSemantics` | 12 组、1152 文字对比度样本；原生 Tab/Shift+Tab、双语、三主题和 720/721 分界通过 |
| `npm.cmd run check:ui:smoke` | exit 0，21 组、0 失败、9562ms |
| `npm.cmd run check:ui` | 最终构建实际重跑，46 组、0 失败、1042641ms；外层 exit 0、1045197ms |
| Trellis task/archive 合同、`git diff --check` | 通过；交付时再次检查 |

完整 UI 覆盖导航、共享语言、博客/项目发现、阅读位置与焦点、公开坏路由恢复、17 路由桌面/移动、Studio、状态/目录、背景、公开助手、项目视觉和 AI Daily。本轮最终全量不是复用第 11 轮结果。`static-checks.json` 的初次 build 早于分页修正；最终构建以 `final-build.log` 与冻结清单为准，纯函数/analytics/registry 对应实现此后未变。

## 证据与中间失败

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-catalog-20260909-f0005f71`。`delivery-evidence.json` 保存日志、代表性截图及源码/构建哈希；`source-freeze-before-full.json` 为全量前固定清单，`ui-full-result.json` 记录检查完成及零漂移。

- `catalog-language-baseline.log`：原 build 的新断言失败，实际“知识库”，期望“Knowledge Base”。原 HTML SHA-256 为 `0acd28ae859142f792229b8404fe27235df15bd3ea83d795158d5ddbfbcb2bae`，与第 11 轮归档一致。
- `language-ui-first.log`：已有 uppercase CSS 使 `innerText` 返回 `READ MORE`；改用 `textContent` 核对真实文案，保持原样式。
- `language-ui-second.log` / `language-ui-third.log`：分页高度 42px，等待字体/有限动画后仍复现，修正为 44px。
- `language-ui-touch-fix.log`：高度修复后专项通过，但截图发现英文分页换行；继续修正布局、增加同一行断言，并重新构建、专项、smoke、完整 UI。修正前截图单独保留，不覆盖失败证据。

恢复后再次核对冻结的 19 个源码/检查器/边界文件和 3 个构建文件，`changedAfterVerification=[]`；暂存区为空。保护快照 SHA-256 始终为 `d744ad0698c429fc3ecd33af3cae16911e00234c6e4d28ad30e5805bb9414909`。

## 交付与保留

验收完成，待精确本地提交、仅归档本子任务并实际启动父任务。本文随后记录真实提交与回切结果。

所有浏览器检查使用本地 preview `http://127.0.0.1:5190`、fixture 和网络 guard，模型调用为零。没有 push、部署、签名、公开发布、生产验收、真实模型调用或 Feed/Cron 启用；未改保护快照、public/server、依赖、工作流、portfolio/projectPublication 或文章源数据。

首页、详情、状态、日报、助手及共享 publication 文案仍有后续公共界面工作，作者内容/SEO 翻译另行处理。旧 AI Daily readiness 结论没有在本轮重跑；heartbeat 持久化状态仍未确认且未重建。

本轮没有创建一次性脚本、没有删除文件。Temp 日志、截图和哈希是验收证据，保留；原有九项未跟踪资料、历史 worktree、5183 preview 保留，5190 为本轮自有 preview，可供下一轮复用。
