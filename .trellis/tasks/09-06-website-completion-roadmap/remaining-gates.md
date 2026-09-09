# 剩余本地工作与产品门禁

2026-09-08，接续会话 `01a080b3-741a-74c0-a22b-fe6dcfae4b15` 在规范目录执行只读检查。以下是本地仓库与 fixture 证据，不是生产验收。

## 公开助手

`assistant:public-api-check`、`assistant:public-conversation-check`、`assistant:public-browser-state-check` 均在本会话 exit 0。前两类传输和状态断言使用本地数据/替换 fetch，未调用真实模型。本地 UI 的完整助手场景由当前子任务的完整 `check:ui` 另行覆盖。

## AI Daily

`ai-daily:production-readiness-check -- --json` 本次 exit 1，报告 `networkCalls=0`。17 项中 13 pass、3 manual-gate、1 fail；不把它概括为生产就绪。

- fail：`first-edition-acceptance-record`。现有记录未封存，选型证据和 rollback 绑定与当前 artifacts 不一致，真实 Edition 未完成，Studio review/export 和部署观察缺失。
- manual-gate：生产 approval bundle 交付、业务 Cron 和当前进程生产环境。当前进程没有生产环境键不代表线上缺失。
- 进一步只读运行 `ai-daily:acceptance -- check --require-sealed`，返回 `acceptance-evaluation-evidence-mismatch`、`acceptance-rollback-evidence-binding-mismatch`、`acceptance-rollback-evidence-not-sealed`、`acceptance-rollback-evidence-reference-required`、`live-edition-not-completed`、`studio-review-required`、`publish-export-required`、`deployment-observation-required`、`acceptance-record-hash-required`。
- 这些是历史验收记录与当前批准/交付状态的证据缺口。未改写、重新初始化或封存原记录，未提交真实 Edition，未启用 Feed/Cron。必须回到已有 AI Daily operations 任务，先核实对应版次与批准范围，再完成实际生产门禁。

检查日志：本轮 Temp 目录的 `roadmap-offline-readiness.log`。脚本存在与 fixture 合同通过不等于 live Edition 获准发布。

## 本地质量工作流

本轮实施前，仓库 `.github/workflows/` 仅有：

| 工作流 | 触发与范围 | 基础质量门禁 |
| --- | --- | --- |
| reliability-check.yml | 手动/每日巡检，运行 reliability:check | 不运行 lint/build/浏览器 smoke |
| public-rag-sync.yml | main 上公开知识路径变更/手动同步 | 只做知识生成/合同并同步生产 |

`scripts/verify.mjs` 是本地聚合入口，会生成公开知识、读取本地 AI Daily 验收记录并包含广泛运行时检查，不宜直接等同于无凭证 PR 门禁。可独立下一项是在本地准备一个零生产调用的 PR 质量工作流，复用 lint/build、确定性合同、performance 和本地 preview smoke；不自动发布、不创建生产 Secret，也不启用新的定时任务。GitHub 实际执行需要后续批准推送，不能将本地 YAML/命令验证描述为远端 CI 已通过。

### 下一项实现依据

- 2026-09-08 使用 `smart-search context7-docs` 定位，并用 `smart-search fetch` 实际获取 [Playwright CI](https://playwright.dev/docs/ci) 和 [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)。正文证据保存在本轮 Temp 的 `ci-playwright-source.json`、`ci-github-source.json`，抓取 provider 为 Tavily；没有调用模型或执行广泛 provider doctor。
- 官方 CI 文档要求安装 npm 依赖和 Playwright 浏览器/系统依赖；本仓库只启动 Chromium，可用 `npx playwright install --with-deps chromium`，复用既有串行 smoke。
- 候选工作流使用普通 `pull_request`、main `push` 和手动触发，`contents: read`、checkout 不持久化凭证、按 workflow/ref 取消过期执行；无路径过滤，避免必需检查因过滤而停在 Pending。
- 明确 `shell: bash`，GitHub 使用 `bash --noprofile --norc -eo pipefail`；preview 使用独立 PID、有界 readiness 检查及退出清理，smoke 失败必须保留非零退出码。
- 复用仓库 Node 22 和 Actions v5 惯例。当前本机仅确认 Node 24，尚未模拟 Ubuntu/Node 22；不得把本地通过当成远端 CI 通过。
- 对比度交付后已建立 `09-08-stage-6-pr-quality-workflow`，新增 `site-quality.yml`，配置和本地成功/失败/端口冲突/TERM 清理路径通过。目标仍为 Ubuntu/Node 22，远端尚未运行；详情见子任务 verification.md。

## 仍需用户决定

- 语言范围已获用户决定：分阶段补齐中英文，先公共界面再内容。第 11 轮 `a8142559` 已交付共享偏好、导航辅助标签、页脚、载入与 404；第 12 轮 `d215071e` 已交付目录公共控件和移动分页；第 13 轮 `87b2e01c` 已交付详情公共阅读界面与共享目录；第 14 轮 `75431775` 已交付共享项目动作、候选标签、详情类别/状态和首页项目面板；第 15 轮 `68b3e162` 已交付状态总览/详情公共界面，最终完整 UI 46/0、完整语言和 smoke 21/0 通过。第 16 轮补齐 AI Daily 公共界面；剩余首页与助手继续分别评估。authored 内容与 SEO 仍属后续阶段，不宣称全站已经双语。
- 第 16 轮 AI Daily 公共界面已由 `e8154227` 本地交付：feed/detail 的刷新、重试、分页、加载、错误、过时/修正、来源计数、日期、详情元数据和阅读目录均跟随唯一 `SiteLanguage`；最终完整语言新增 44 组并与既有组全部通过，smoke 21/0、完整 UI 46/0，modelCalls 0。此项只覆盖本地 fixture 与公共 UI，不代表生产版次、真实内容或 Feed 已获发布批准。
- 第 17 轮首页公共界面已由 `46a0a22a` 本地交付并归档：状态标签/值、标题操作名称、根节点语言语义和刷新持久化跟随唯一 `SiteLanguage`；authored 题句/正文保持中文语义。完整语言首页新增 12 组、smoke 21/0、完整 UI 46/0、modelCalls 0，代表截图已复看。该项不代表 authored 内容或公开助手已经双语。
- 第 18 轮公开助手固定界面已由 `a9ed378b` 本地交付并归档：launcher、状态、模式、历史、分支、引用/证据外壳、修订、反馈、图片、输入和恢复控件跟随唯一 `SiteLanguage`；固定界面语言专项新增 12 组，`publicAssistantModelCalls=0`，smoke 21/0、完整 UI 46/0、lint/build/performance 通过，保护状态快照 hash 未变。回答正文、用户问题、建议问题、分支预览、历史标题、引用标题/摘要/URL、claim 和模型元数据仍保留 authored/payload 原始语言；这不代表公开助手内容或生产服务已经双语。
- 下一轮重新评估公开助手剩余内容语言与其他公共界面候选。优先寻找不依赖 authored 翻译、引用标题、真实模型或生产状态的可复现本地缺口；助手内容事实、引用、模型调用、生产状态和公开发布继续走既有门禁。
- 第 20 轮公共界面覆盖复核未发现新的本地缺口：首页、目录/详情、状态、AI Daily、404、公开助手以及共享导航/页脚的固定控件和语言标记均已有覆盖。`AppContent` 外层 `.app` 的 `lang="zh-CN"` 是未本地化 Studio/剩余页面的规范 fallback，公共页面根节点会覆盖它；Studio/Logo Lab 标签不属于公开范围。当前等待 authored 内容/SEO 翻译策略或独立生产批准，不创建空子任务，不修改 heartbeat 或保护状态快照。
- 第 21 轮 authored/SEO 审计已由 `d8602279` 本地交付并归档。审计确认项目 15 个、公开文章 11 篇、助手知识 31 条的 authored/payload 字段仍是原始语言；`SeoManager` 按 pathname 更新单一中文 metadata，canonical/Open Graph/Twitter 与 sitemap 仍是一套稳定 URL，没有已批准的 locale/hreflang 合同。下一实现前必须明确译文字段与审核责任、URL/canonical/hreflang 策略，以及助手/AI Daily approved payload 是否允许翻译；不据审计自动改公开内容、SEO、生产版次或 Feed/Cron。
- 公开内容发布、AI Daily 生产版次、Cloudflare/Render 变更与真实模型调用不在当前本地循环范围内。
- 原 heartbeat 更新曾获工具接受，但原本地配置后来消失；当前未确认调度持久化，不隐式重建。
