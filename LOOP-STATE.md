# Loop State

> 此文件是长任务循环的"单一真值源"。任何新会话开始时，AI agent 必须先读完此文件再行动。
> 不要把进度信息留在对话里，全部落到这里。

## Current Phase

Phase 0 - 恢复韧性基础设施 + 路由/页面骨架

## Last Completed Iteration

#1 - Phase 0.1+0.2+0.3 路由骨架落地：`react-router-dom` 装好，`App.tsx` 改成 `<Routes>`，`main.tsx` 包 `BrowserRouter`，5 个 page 全连通（HomePage / ProjectsPage / ProjectDetailPage / BlogPage / BlogPostPage）

## Next Up (Ranked Diff Backlog)

按优先级从上到下执行，每条做完一条划掉一条。完成一条 = 一个 commit。

1. [P1] Phase 0.4 通用化 `scripts/focus-compare.mjs`：支持 `TARGET_PATH` 环境变量切换对比页面（`/`、`/tools/`、博客详情），同时把现有硬编码的本地端口改成 `LOCAL_BASE` env
2. [P1] Phase 0.4 给对比脚本加像素 diff 评分（引入 `pixelmatch` + `pngjs`，输出 `score` 到 `compare-out/history.jsonl`）
3. [P1] Phase 0.5 跑首页 + 项目页 + 博客页三套基线对比，把发现的差异写进本文件的 Next Up（按 P0/P1 排序）
4. [P0] 验证 ProjectDetailPage / BlogPostPage 的导航与 404 兜底链路是否正常（手动 dev 起 `npm run dev`，或写一个 Playwright 烟雾脚本）
5. [P0] 抽 detail 页样式到 `src/styles/detail.css`（当前 `.detail-page`、`.detail-block`、`.detail-related` 等仍依赖 `index.css` 里隐性存在/不存在的类）

## Scores Trend (last 10)

尚无对比基线。Phase 0.5 完成后开始记录（之前都是 infra iteration，不打分）。

## Notes / Blockers

- 原站运行时 JS（`home-runtime.js`、`app.js`、GSAP）**未保存本地**，动画时序只能通过 `rotator-samples.json` + 截图反推，不可能像素级 1:1。
- 现有 `App.tsx` 里 `handleProjectClick` 用字符串前缀判断 link，迁路由时需要替换为 `useNavigate`。
- `hero.ts`（5 张轮播卡）与 `portfolio.ts`（11 个项目）是两套数据，id 部分重叠。本阶段不合并，先让路由跑通。
- 每轮 iteration 限制：动 1-3 个文件、`tsc --noEmit && npm run build` 必须通过、一个 commit、更新本文件。
- 单轮目标时长 10-15 分钟，超出请拆分。

## Iteration Cadence

- **完成一条 Next Up = 一次 commit** = 更新本文件
- commit 信息格式：`loop(<area>): <one-line summary>` 例如 `loop(routing): add react-router-dom and ProjectDetail page`
- 每次 commit 后追加一行到 `compare-out/history.jsonl`（基础设施 iteration 可以省略对比，标记 `kind: "infra"`）
