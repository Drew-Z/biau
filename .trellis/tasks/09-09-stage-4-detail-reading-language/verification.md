# 详情公共阅读界面双语验收

2026-09-09，规范目录 `D:/workspace4Cursor/blog-semi`，主会话 inline 实施及验证。基线 `5215516f095f803e158e2902f78ec929ef2cd935`，PowerShell 7 / Node 24.14.0 / Playwright Chromium，preview 为 `http://127.0.0.1:5190`。

## 结果

文章/项目返回、加载/缺失、固定阅读结构、关联阅读、原图动作与辅助名称，以及共享阅读目录的名称、计数和进度支持中英文。作者章节与正文、图注/alt、publication 标签和说明仍保留原值及中文语义。状态/AI Daily 使用共享目录的既有章节同样保留中文标记。

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| lint | exit 0 | `final-lint.log` |
| 最终业务 build | exit 0，包含缺失页 44px 修复 | `build-missing-touch-fix.log` |
| performance | exit 0；入口 JS 300457/430000，入口 CSS 152366/222755，路由 CSS 141669 bytes | `final-performance-check.log` |
| blog:discovery-check | 8 组，25 篇隔离 fixture，exit 0 | `blog-discovery-check.log` |
| projects:discovery-check | 6 组，exit 0 | `projects-discovery-check.log` |
| project-details:check | 15 projects，exit 0 | `project-details-check.log` |
| project-registry:check | 12 identities / 9 publications，exit 0 | `project-registry-check.log` |
| analytics:check | 17 route cases，exit 0 | `analytics-check.log` |
| 完整语言专项 | matrix 12 / catalog 24 / empty 12 / storage 5 / loading 1 / detail 24 / legacy guide 4 / detail loading 2；modelCalls 0 | `language-ui-final.log`、`final-focused-result.json` |
| smoke | 21 组、0 失败、9790ms，exit 0 | `ui-smoke-final.log` |
| 完整 UI | 46 组、0 失败、1100170ms；17 routes × 2 viewports 及专项 | `ui-full-final.log` |
| 外层执行及漂移 | session 55966 最终 exit 0；1101654ms；changedFiles=[] | `ui-full-result.json` |

完整 UI 使用本轮最终构建和检查器。全量前比对 preview HTML 与磁盘字节一致；全量结束及接续时再次比对 23 个源码/检查器/规范/边界文件和 8 个构建文件，全部相同。准确路径/hash 在 `source-freeze-before-full.json`；入口为 `index-DBe1Z8s9.js`。没有复用第 12 轮全量结果，也未为已通过的同一版本重新运行完整检查。

## 覆盖与限制

- 详情矩阵为 320/390/430/1440 × 三主题 × 两类详情，各验证中英文；覆盖固定/作者章节语言、内容/图片/publication 快照、目录 ID、DOM 连续性、history、键盘开关、Escape 焦点、实际锚点滚动、缺失返回 URL/Enter/44px 与刷新持久化。正文延迟加载分别从中英文启动，并在等待期间切换。
- 语言状态连续性使用 DOM `click()` 隔离已有 outside-pointer 关闭行为；不声称真实点击目录外的语言按钮后目录必须保持展开。实际键盘、Escape 和锚点另有检查。进度允许随布局重新测量。
- 已人工查看 `reading-blog-320-morning-en.png`、`reading-projects-320-stellar-en.png`、`reading-blog-1440-nature-en.png`。主要为目录/正文视口，展开目录和中英文结构可读；不把它们扩大为页头、缺失状态与所有原图动作的截图审查，这些控件由浏览器断言覆盖。
- 本轮没有翻译首页、状态/日报/助手整页、项目类别/状态、publication 共享词汇、作者内容或 SEO，不宣称全站英文完成。

## 保留的中间证据

1. 负向基线 `detail-language-baseline.log` 在第 12 轮原构建上因详情返回仍为“知识库”而失败，期望“Knowledge Base”。旧 HTML hash 为 `4875a93e15148863806495a8bffaccf97cd3c1ebde907f67f97755950dc7ce10`；该失败区别于第 12 轮目录标题负向断言。
2. 首次构建入口 JS 为 423376 bytes：共享字典运行时导入 portfolio 导致整组数据进入入口。改为 type-only import、在已有页面导入处选择映射后最终降至 300457。`static-checks.json`、`build.log`、`performance-check.log` 保存早期版本，不作为最终 build/performance 证据。
3. `detail-language-first.log` 的首个失败只直接测得 320px 英文文章缺失返回为 40px。两类页面沿用相同按钮结构，新增精确 `.detail-missing--catalog` 类并在既有移动媒体查询补齐 44px；最终矩阵验证两类通过。
4. `detail-language-second.log` 在主矩阵之后等待 AI Daily 目录超时。夹具缺少真实 decoder 要求的 `uncertainty: null` 和 `correctedAt: null`；只补齐夹具及错误上下文，随后完整语言专项和全量通过，生产 decoder 未变。

## 边界与交付

证据保留于 `C:/Users/zhang/AppData/Local/Temp/blog-semi-reading-language-20260909-9828749c`，日志及代表截图 hash 随 `delivery-evidence.json` 保存。保护文件 `public/status/blog-semi-synthetic.json` 始终为 `d744ad0698c429fc3ecd33af3cae16911e00234c6e4d28ad30e5805bb9414909`。

没有 push、部署、签名、真实模型调用、内容发布、Feed/Cron 或自动化修改。保留原有九项未跟踪记录、历史 worktree 与原服务；本轮未创建一次性脚本、未删除文件，自有 preview 与证据供下一轮复核。按白名单本地提交后，仅归档本子任务并实际启动父任务；实际 commit 与回切记录随后补入交付证据。
