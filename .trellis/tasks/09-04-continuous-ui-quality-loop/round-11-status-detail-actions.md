# Round 11：状态详情移动返回操作（UI-012）

日期：2026-09-08。状态：`fixed / verified`。

## 问题与基线

- 范围：`/status/legal-rag` 的顶部两个操作和卡片内返回入口，以及 `/status/ui-check-missing-detail` 的返回入口。
- 严重度：P2。操作可用，但真实移动点击高度低于已有 `44px` 契约。
- 当前基线：HEAD `3808d46c`，保留旧 UI 工作区成果；重新 build，在本轮独立 `5184` 端口启动 production preview。
- 24 组浏览器矩阵覆盖两条路由、`1440/320/390/430 × 900`、三主题，stellar 切换英文导航，其余保持中文；所有页面使用 reduced-motion，窄屏启用触控模拟。
- 顶部与缺失页 `.btn` 高 `40px`，`.status-project__header-tools > a` 高 `30px`；18 组移动页面共 36 个目标均不足 `44px`。现有链接可命中、焦点可见、键盘可返回总览，无水平溢出，问题是点击高度。
- 根因：`route-pages.css` 的共享桌面样式分别给操作按钮 `40px` 和 header 工具 `30px`；现有移动规则只调整 header 排列，未覆盖上述控件。
- 证据目录：`C:\Users\zhang\AppData\Local\Temp\blog-semi-ui-012-20260908-d5b353410f334672ad71b6ea369f8be2`。保留 `baseline-measurements.json`、`baseline.log` 与八张桌面/移动截图；不纳入公开资源。

## 本轮范围与执行顺序

1. 仅在现有 `max-width: 720px` 中补充 `.status-detail-actions .btn`、`.site-status-page .detail-missing .btn` 和 `.status-project__header-tools > a` 的 `min-height: 44px`。
2. 保留桌面 `40px/30px`、状态计数徽标、文字、路由和数据；缺失页选择器限定为状态页，不顺带改变博客、项目或 AI Daily。
3. 在现有 `checkStatusDetailReadingNavigation()` 内增加非空、精确数量、可见、触控尺寸和实际命中断言，覆盖正常详情与缺失状态，并轮换三主题和中英文状态。
4. 复用同一脚本比较修复前后矩形和键盘返回；再运行 lint、build、smoke、完整 UI、性能预算、status contract、任务校验与 diff 检查。
5. 更新质量规范和审计记录；本轮增量独立交付，保留旧 UI、路线图与证据，不推送或部署。

## 验证与交付

- 修复后复用同一 24 组矩阵，移动端 36 个目标全部为 `44px`，未达标数量从 36 降至 0；桌面仍为 `40px/30px`。所有目标可命中、焦点可见、键盘可返回总览，均无横向溢出。详见 `fixed-measurements.json` 和 `fixed.log`。
- 新增的常驻检查函数单独执行通过：9 个页面场景、`failures=0`，覆盖正常详情、缺失详情与总览。其代码沿用已有页面助手和网络隔离，不依赖尚未提交的旧 UI 测试块。
- 完整 UI：41 组、17 条路由、`failed=0`，耗时 `566075ms`；smoke：21 组、7 条路由及 3 个 viewport、`failed=0`，耗时 `10064ms`。日志为 `check-ui.log` 和 `smoke.log`。
- lint、build、检查器语法、status contract（8 项目、7 入口、33 检查项）、任务校验与 diff 检查通过；性能预算通过，入口 CSS `152358 / 222755`、JS `422542 / 430000`，route CSS 为 `141623` 字节（本轮增加 99 字节）。
- 保留修复前后 JSON、日志和 16 张截图；修复后的详情首屏在阅读导航恢复可见后重新截图，避免把滚动隐藏动画的中间帧当成页面缺失。
- 独立提交范围：`route-pages.css` 本轮 6 行、`check-ui.mjs` 的状态详情检查函数增量（Git 暂存差异为 80 行新增、12 行删除）、质量规范本轮 2 行和本记录；旧导航、轮播、目录及其他移动样式不纳入。
- 受保护状态数据、Logo/favicon 和本轮未触及源码的 SHA-256 与基线一致；路线图、旧 UI 成果、原有未跟踪证据和前导空格目录保留，不推送或部署。持续任务保持 `in_progress`。
- 回滚边界：只回退本轮移动高度覆盖、状态详情回归增量和新增规范，保留原有阅读导航与历史 UI 成果。
