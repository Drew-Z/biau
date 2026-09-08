# 阅读位置与焦点验收

## 交付行为

博客/项目目录进入详情时保存当前 history entry 的稳定入口与布局位置。显式返回或直接从详情后退时恢复原入口；相关同类详情继续保留原目录来源。新打开的详情在正文就绪后从标题开始；前进回到已读详情恢复其位置，等待可能改变上方布局的 eager 首图完成。用户在等待期间操作会取消迟到的自动定位。

目录记录与详情位置各最多 40 项，留在本页面内存；history state 只携带来源引用和返回标记。复制/刷新详情、过期或隐藏入口回到有效目录标题。跨尺寸或动作处于固定导航之外时，将焦点入口移到可见区域。搜索/筛选和从状态等非详情路由返回不触发旧阅读恢复。标题使用 `tabIndex={-1}`，不新增正常 Tab 停靠点。

范围为一个 hook、四个页面、两卡片的稳定标识、浏览器检查与检查入口、frontend state/hook 规范和任务记录。未更改 CSS、公开数据、App 路由结构、导航、阅读指南、状态导航、依赖/lockfile、后端或生产状态快照。

## 实际验证

所有正向检查均已实际取得 exit 0；负向基线单独列明。完整 UI 在最终 build 上完成，没有复用旧版本结果替代本项最终全量验证。

| 检查 | 结果 |
| --- | --- |
| 旧版本负向基线 | `reading-baseline.log` 实际 exit 1，详情 activeElement 为 BODY；既有博客 8 次与新增项目 8 次位置基线作为补充 |
| `reading:navigation-ui` | 48 组（四宽度 × 三主题 × 两种语言 × 两类目录）、4 组普通动效、22 组边界，全部通过；`reading-final-ui.log` |
| 延迟首图专项 | 修复前 770→1130，修复后 770→770；`reading-delayed-hero-baseline.log` / `reading-delayed-hero-fixed.log`，并纳入最终专项 |
| `lint` / `build` | 最终业务源码全量通过；Vite 8.0.16，入口 `index-3_YH5-i2.js`；`reading-lint-final.log` / `reading-build-final.log` |
| 博客/项目 URL 合同 | 8 组博客合同（25 篇隔离 fixture）、6 组项目合同通过；两份 URL 工具自本项基线未变 |
| `analytics:check` | 17 route cases 通过，analytics 实现及用例自本项基线未变 |
| `performance:check` | CSS 152358/222755 bytes、route CSS 141623、入口 JS 295685/430000、0 外部阻塞 stylesheet、immutable cache configured；`reading-performance-final.log` |
| `check:ui:smoke` | 7 routes × 3 viewports，21 组、0 失败，17144ms；`reading-smoke-final.log` |
| 完整 `check:ui` | 44 组、0 失败，17 routes × 2 viewports 及专项组，931080ms；`reading-check-ui-final.log`，exit 0 |
| 任务/差异 | 两份 context JSONL 验证通过；`git diff --check` 通过；最终提交前核对精确白名单、13 个源码/规范/保护哈希和入口哈希 |

专项直接检查 activeElement、入口坐标、历史位置和 URL。边界覆盖同地址不同目录条目、正常/相关/缺失返回、复制与刷新、窗口变化、隐藏入口、博客卡片键盘入口、快速搜索、指针卡片操作、有效/损坏 hash、正文延迟完成/用户操作/离开取消、非详情路由返回和首图延迟。所有页面仅允许本地 preview origin，API 使用明确的 503 fixture，无 pageerror 或被阻止请求。不是生产验收或跨浏览器兼容性声明。

## 本轮发现与修复证据

- 入场动画：首次位置差 16px。跟踪确认卡片 `fadeUp` 在 reduced-motion 下仍先保持 `translateY(16px)`，再变为 0；改用布局坐标，并在检查中等待有限动画结束后验证最终位置，没有放宽 8px 容差或修改 CSS。
- 检查器时序：相关详情先更新 URL、再替换 h1；最初检查闭包持有旧标题节点。改为每次重新解析 `:focus` locator，保留实际焦点断言。
- 首图加载：单场景重复 12 次及带调用跟踪的 12 次都通过，但完整矩阵仍出现 1130→1490，因此没有把重复通过当修复。延迟真实项目图片的 fixture 稳定复现 770→1130；增加生命周期内 load/error 等待后变为 770→770，最终完整阅读矩阵通过。
- 作用范围：只按旧 history record 判断会使从 Status 返回也回到旧文章。只读基线为期望 y=0、实际 y=1983；恢复现在还必须满足“直接来自详情”，并通过对应独立检查。
- 指针入口：标题可点击时，等价详情按钮可能在底栏外。恢复在现有导航的真实边界内显示该按钮，保持原键盘语义。

没有使用未完成探子的结论；主会话完成了调用点、代码、CSS 线索和最终验证审查。

## 视觉、哈希与清理

已亲自检查 `reading-blog-320-morning-zh-reduce.png`、`reading-projects-430-nature-en-reduce.png` 和 `reading-blog-1440-stellar-zh-no-preference.png`，原入口可见，目录和底部导航没有新增遮挡。专项截图对应返回后的目录；标题聚焦及加载/历史行为由实际浏览器断言验证。

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-discovery-20260908-4f78e2a8f7f64b4799ddd9b9e3b8da57`，保留 reading 前缀日志、诊断 JSON 与截图供复核。临时诊断使用 stdin 执行，没有留下独立 runner。正式 `scripts/check-reading-navigation-ui.mjs` 是交付物。

`delivery-evidence.json` 保存 13 个源码/检查器/规范/保护快照 SHA-256，以及最终入口 SHA-256。保护快照仍为 `d744ad0698c429fc3ecd33af3cae16911e00234c6e4d28ad30e5805bb9414909`；本项基线 `0351f601` 之后公开数据/CSS/URL 工具/App/阅读与状态导航/lockfile 均无差异。

原有前导空格目录、持续 UI 未跟踪资料、历史 worktrees 与非本轮 5183 服务保留。本地提交范围受父循环授权，不 push/deploy/sign，不调用真实模型、不发布内容、不启用业务 Feed/Cron、不消费 usage reset。5184 preview 在连续子任务之间复用。
