# 项目分组交付验收

## 行为与范围

目录从规范化 `group` URL 读取现有三组；刷新、复制链接、浏览器历史、详情及相关项目返回保留分组。默认 `/projects` 保持有效，桌面继续展示全部项目，720px 边界仅控制可见性。正常与缺失详情的返回从固定目录路径构造，不接受任意 returnTo。博客阅读、公开体验/证据地址及 analytics/SEO 边界不变。

本次改动限于两个项目页面、一个纯解析工具、两份新检查脚本、完整 UI 的检查调用、analytics 用例、package 检查入口、state spec 和任务记录。没有修改 CSS、公开文章/项目/状态数据、博客业务源码或状态导航。滚动位置与焦点恢复留给下一独立子任务。

## 实际验证

所有正向结果均已实际取回 exit 0。下面的负向基线是预期失败，不计作正向通过。

| 检查 | 结果与证据 |
| --- | --- |
| 旧 build 负向基线 | 320/Morning/zh 打开 tool 参数，期望 tool，实际 ai，exit 1；`project-discovery-baseline.log` |
| `projects:discovery-check` | 6 组通过；默认、三组往返、未知/超长/Unicode、重复参数、编码幂等、固定返回路径；`project-contract.log` |
| `analytics:check` | 17 route cases 通过；`project-analytics.log` |
| `lint` / `build` | 最终业务源码全量通过；Vite 8.0.16，入口 `index-DSoEAwr8.js`；`project-lint.log` / `project-build.log` |
| `performance:check` | CSS 152358/222755 bytes、route CSS 141623、入口 JS 291179/430000、0 external blocking stylesheets、immutable cache configured；`project-performance.log` |
| `projects:discovery-ui` | 320/390/430/1440 × 三主题 × zh/en 共 24 组，另 720/721 两个断点组通过；`project-discovery-ui.log` |
| 既有项目 UI | 完整原 `checkMobileProjectCatalog()` 及原 `catalog-projects` 组通过，分别 12069ms / 102809ms；`project-existing-ui.log` |
| `check:ui:smoke` | 7 routes × 3 viewports，21 组、0 失败，13980ms；`project-smoke.log` |
| 截图绘制复查 | 等待字体与两帧绘制后，1440/Morning 两种语言完整导航流程及 720/721 两组通过；`project-paint-recheck.log` |
| 最后检查器改动 | 单文件 ESLint、`node --check scripts/check-ui.mjs`、`git diff --check` 通过 |

专项覆盖三组集合与顺序、刷新、复制目录/详情链接、正常/缺失/相关返回、back/forward、键盘进入/返回/切组、重复选择不增历史、跨断点、无横向溢出、canonical 无 query、博客阅读不带 group。每页使用共享 network guard，仅允许本 preview origin，`/api/**` 为 503 fixture；没有 pageerror 或被阻止请求。

本次没有重新运行新版全部 43 个 UI 组。未改变的其余 UI 组复用博客交付 `9991079a` 的最终完整基线（42 组、0 失败）；受影响的项目组和新增专项已在本次实际运行。完整 24+2 专项通过后仅调整截图等待，没有修改业务源码或功能断言，随后实际复查对应 2+2 组。

## 视觉与证据

主会话已查看 320/Stellar/zh、1440/Stellar/en 和重新截取的 1440/Morning/en。最后一张的标题、说明和 EN 按钮完整绘制。原截图问题来自过早截帧；仅调整检查器等待，没有改产品布局。

证据目录：`C:/Users/zhang/AppData/Local/Temp/blog-semi-discovery-20260908-4f78e2a8f7f64b4799ddd9b9e3b8da57`。保留 project 前缀日志与 24 张 projects 截图供复核。`project-catalog-regression.mjs` 是本次生成的原检查组提取 runner，完成后删除；正式源码检查器继续跟踪。

`delivery-evidence.json` 记录当前源码、规范、保护快照和 build 入口哈希。保护快照仍为 `d744ad0698c429fc3ecd33af3cae16911e00234c6e4d28ad30e5805bb9414909`。上一叶子修改且本项应保持的博客文件、状态导航及 quality spec 与 `9991079a` 一致。临时日志和截图未进入 Git。

本地提交，不 push/deploy/sign，不调用真实生产模型、不发布公开内容、不启用业务 Feed/Cron、不消费 usage reset。原有前导空格目录、旧持续 UI 未跟踪资料和历史 worktrees 保留。
