# Manual Gates Ledger

这份总账只记录必须由用户在平台、生产凭据或发布审批层完成的事项。仓库和聊天中不得保存真实 token、密码、数据库连接串、模型端点、Access audience、签名材料、私有后台地址或生产内容正文。

相关文档：

- [部署说明](./deployment.md)
- [BIAU Operator Agent Workspace](./internal-assistant-agent-workspace.md)
- [Content Studio](./content-studio.md)
- [AI Daily Pipeline](./ai-daily-pipeline.md)
- [Studio / AI Daily 生产就绪记录](./studio-ai-daily-production-readiness.md)
- [Operator RAG / Studio / AI Daily 验收手册](./internal-rag-studio-ai-daily-runbook.md)
- [站点监察](./site-monitoring.md)
- [可观测性策略](./observability-strategy.md)

## 执行规则

- Codex 继续完成本地代码、mock、构建、文档、synthetic 和低敏状态整理。
- 平台控制台、生产数据库、真实模型任务、账号策略、APK 签名和公开发布由用户处理。
- 模型验收只能使用用户批准的真实业务任务；禁止 ping、doctor、空 prompt 和无意义测活。
- 完成记录只写低敏结论和可复跑命令，不记录配置值或私有内容。
- 状态项目变化后运行 `npm.cmd run docs:manual-gates-check`，保证每个公开项目都有对应人工边界。
- AI Daily 本地就绪检查使用 `npm.cmd run ai-daily:production-readiness-check`、`npm.cmd run ai-daily:manifest-check`、`npm.cmd run ai-daily:model-evaluation-check`、`npm.cmd run ai-daily:operations-check`、`npm.cmd run ai-daily:retention-check` 和 `npm.cmd run ai-daily:contracts-check`；这些命令不替代来源批准、真实模型评估与选型、生产 migration、Cron 启用或真实内容验收。

## BIAU 平台门禁

四个 Render 服务、Operator / Studio 数据库边界、Owner memory 选择性迁移和 Qdrant scoped sync 已完成，不属于当前 setup 队列。以下事项只在配置变更、真实模型验收或内容发布时重新触发人工确认。

| 条件式 Gate | 何时需要人工 | 安全证据 |
| --- | --- | --- |
| Cloudflare Access application 与 policy | owner、team domain、audience 或路由策略发生变更时 | 只记录 `/operator`、`/operator/*`、`/api/operator/*` 的允许/拒绝结果 |
| Operator Function / Render 私有变量 | 服务迁移、token 轮换或上游地址变更时 | `operator:facade-smoke` 与四服务低敏 `/health` 类别，不记录配置值 |
| Operator 真实模型验收 | 用户批准一个具体站务任务时 | 只记录 model mode、引用、工具结果和错误类别，不做测活 |
| Studio token 与首篇公开导出 | 审核草稿或复核公开 diff 时 | 草稿状态、review/export 数量和本地检查结果，不记录 token 或正文 |
| 数据库 / Qdrant schema 变更 | 未来 migration 或 collection schema 变化时 | 备份、迁移命令、计数与回滚 revision；不重复已完成 bootstrap |

已完成的低敏平台基线：

- Render 四服务边界（public/operator/studio/rag）已经由 `assistant:service-modes-smoke` 和部署契约覆盖。
- Operator `DATABASE_URL` 与共享 Studio 内容库的边界已建立；Studio / Operator migration 不再作为重复 setup。Publish Export 版本绑定 migration 已部署并通过低敏只读复核。
- Owner durable memory 已通过重启后复核；旧成员制数据不会整体迁移。
- Qdrant public/internal scope 同步已完成，embedding 维度和 stale-point cleanup 已有低敏结果。

## Operator 安全边界

- `/operator` 和 `/operator/settings` 是 owner-only 页面，不放入公共主导航或公共 synthetic。
- 浏览器只调用同源 `/api/operator/*`，不保存 Render service token。
- Operator 只允许 `read` 与 `draft-write`；不能发布、部署、Git 写入、云平台修改或凭据操作。
- `studio.draft` 必须保持 `hidden + review-needed`，人工审核后才允许导出。
- 旧成员、邀请码、成员模型分配、普通聊天和成员用量不进入 Operator 最终产品。

## Content Studio / AI Daily

| Gate | 人工原因 | 安全证据 |
| --- | --- | --- |
| Generation runner migration | 生产 Studio 数据库需要备份和可回滚 revision | 执行 `20260718010000_ai_daily_generation_runner` 后只记录 migration 名、成功状态和低敏计数 |
| 首篇公开导出 | 公开数据文件必须审查 diff | `studio:export -- --run-checks`、博客检查和最终 Git diff |
| AI Daily 真实来源与查询组 | 2026-07-19 已完成公共页面预审并记录 `approved/hold/rejected` 建议；用户仍需确认首批核心集合、查询预算与版权边界，顶层 readiness 才能切换 | `ai-daily:manifest-check`、批准/暂缓/拒绝数量、审核时间和低敏结论，不复制长段原文 |
| AI Daily 三角色模型评估与选型 | fixture contract 只能验证算法；真实候选必须用 BIAU-owned case set 分别评估 extractor/composer/verifier，并由人工确认 primary、独立 failure-domain fallback 和 5 个百分点边界 | 版本化候选/选择 record hash、case-set/prompt/schema version、聚合质量和延迟摘要、审核时间与低敏结论；不记录 key、endpoint、prompt 或原始输出 |
| AI Daily 自动化 | 自动抓取和发布存在事实与版权风险 | 默认保持关闭；人工流程稳定后再选择调度器 |
| AI Daily 公开 Feed 上线 | 新增公开索引 migration、Cloudflare browser base 和 Studio CORS allowlist 需要平台配置 | 只记录 migration 名、公开 route HTTP 状态、ETag/CORS 类别和页面截图，不记录数据库 URL 或 token |
| AI Daily retention mutation | 删除/归档会触及 evidence、公开投影和审核审计链 | 当前仅允许受保护 dry-run；未来必须先备份、审查候选、批准显式 mutate、分批事务执行并验证回滚 |
| 资源分享 | 该栏目代表站长主观筛选 | 由用户撰写或逐条审核，不批量自动填充 |

## 关联项目门禁

| 项目 | 当前人工事项 | 成功标准 |
| --- | --- | --- |
| Legal RAG | 准备低权限可回收 demo 账号，验收法律问答、合同审查和质量面板 | credentialed synthetic 可复跑，只保留 HTTP/功能状态 |
| ERP | 决定生产注册策略，使用低权限 demo 账号复核注册、登录、默认角色和脱敏同步 fixture | 注册/登录和同步路径有可复跑证据 |
| Xunqiu | 确认公开后端 base；正式 APK 需要签名、SHA-256、扫描、回滚和批准 | 状态页只展示获批 release，不恢复阶段性 debug APK |
| Pet | 等待正式 release APK/AAB、签名、校验和、回归和公开下载批准 | `pet:synthetic` 与下载入口同时通过 |
| BIAU Playlab | 新试玩构建上线时确认公开入口和资源版本 | `playlab:synthetic`、移动端试玩和资源检查通过 |
| Chatus | 使用其独立 Trellis 任务和 GitHub Actions-only 部署；不共享 BIAU 数据、认证或模型凭据 | Chatus 自身 lint/test/build/deploy 证据 |
| Duoduo Learn | 当前并行开发，未经用户确认不得修改或包装发布 | 等稳定 commit、截图、Flutter 验证和独立 release gate |

## 访问分析与可观测性

访问分析与可观测性仍以隐私、低敏证据和人工平台授权为边界。

| Gate | 人工原因 | 默认决策 |
| --- | --- | --- |
| Cloudflare Analytics / Search Console / Webmaster | 需要站点所有权 | 可独立启用，不阻塞产品功能 |
| Plausible 或 Umami 二选一 | 需要隐私、托管和口径选择 | 不同时接两套访客统计 |
| Prometheus / Grafana / ARMS | 需要 scrape、告警和平台账号 | `/metrics` 默认关闭；Studio 已提供低敏 AI Daily snapshot，生产 scrape/dashboard/alert routing 仍需人工启用 |
| Sentry / Faro / Langfuse | 可能收集错误、prompt、trace 和用户内容 | 明确采样、脱敏和保留周期后再接入 |

## 已完成的低敏事实

- 主站公开路由、项目/博客详情、状态页、sitemap、robots 和显式外链已有本地/线上无凭据检查；检查不发送模型问题。
- Qdrant public/private scoped knowledge 已有同步成功记录；真实 collection、key 和 embedding 配置未写入仓库。
- BIAU Operator 的生产边界复核已完成；同一 member context 已在重启后成功刷新一条既有 durable memory。生产配置值和 memory 内容未写入仓库。
- Studio 首轮生产审核已完成：两个 hidden 草稿均被标记为 `needs-changes`，当前没有创建 Publish Export，也没有把质量不足的草稿导出为公开文章。
- Studio 已实现并启用草稿版本条件写入、真实修订后重提、归档只读，以及 Publish Export 与具体草稿版本/批准记录的绑定。
- `20260717000000_publish_export_version_binding` 已在生产 Studio 服务执行；受保护的 health、草稿、来源和 Publish Export 只读接口均返回 `200`，新版 schema 查询成功。验收只记录状态与计数，不记录 token、正文或记录 ID。
- ERP、Legal RAG、Xunqiu、Pet 和 Playlab 均已有本地构建或 synthetic 基础，生产账号/发布批准仍按上表处理。
- BIAU Operator 的 LangGraph、typed tools、owner session/memory schema、Cloudflare facade 和本地确定性测试已经进入代码收口；后续生产变更仍需按下方人工门禁执行。

## 当前人工队列

按顺序处理，完成一项后只记录低敏结果：

1. **部署 AI Daily generation runner schema**
   - 先备份 Studio 数据库并保留当前 Render revision。
   - 在 `biau-content-studio-api` 执行包含 `20260718010000_ai_daily_generation_runner` 的 migration，再重新部署最新代码。
   - 只复核 `/health`、migration 名、checkpoint/revision 表可查询和低敏计数；不要运行真实模型测活。

2. **批准 AI Daily 来源并完成三角色业务评估**
   - 逐条审核来源 manifest 与 query groups；未批准条目继续保持 disabled。
   - 使用同一 BIAU-owned case set 分别评估 extractor、composer 和 verifier 候选；这是一项用户批准的真实业务任务，不运行 ping、doctor 或空 prompt。
   - 审核聚合指标、failure-domain alias、primary/fallback 和 record hash；选择记录先保持 pending，明确批准后才可接入 production provider。

3. **上线 AI Daily 公开 Feed**
   - 在生产 Studio 数据库执行 `20260719020000_ai_daily_public_feed_index`，执行前保留备份和上一 Render revision。
   - Studio 服务设置 `AI_DAILY_PUBLIC_CORS_ORIGINS=https://biau.playlab.eu.cc` 和 `AI_DAILY_PUBLIC_FEED_ENABLED=true`，并部署当前代码。
   - Cloudflare Pages 设置 `VITE_AI_DAILY_API_BASE_URL=<当前 Studio 服务 origin>` 后重新部署静态站。
   - 只用真实浏览页面和公开 GET 验收 `/ai-daily`、一个已批准事件详情、ETag `304`、撤回 `410` 和移动端；不要用模型测活。

4. **处理首轮被退回修改的 Studio 草稿**
   - 在 Studio 中打开两个状态为 `needs-changes` 的 hidden 草稿。
   - 选择一个作为主稿，补齐可核验事实、来源、知识点、边界和配图/结构；另一个归档或明确保留为不发布稿。
   - 先保存修改并重新提交审核，不要直接发布；完成后由 Codex 复核低敏状态，再进入新版审核和 Publish Export 门禁。

5. **审核证据完整的新版草稿并创建第一个 Publish Export**
   - 仅在新版草稿完成事实、来源、结构和版权检查后执行。
   - 记录审核结论、draft id 的脱敏摘要和 export 数量，不记录文章正文或生产凭据。

6. **继续关联项目门禁**
   - Legal RAG demo、ERP 注册、Xunqiu/Pet release 按上表逐项处理。

## 延期项

- AI Daily 自动抓取和自动发布。
- AI Daily retention mutation；当前已实现受保护的只读 dry-run 与候选阻断原因，但没有删除/归档路径。
- Umami/Plausible、Prometheus/Grafana/ARMS、Sentry/Faro/Langfuse。
- GitHub Social Preview 与额外运营素材。
- Chatus 与 BIAU 的只读 MCP 集成；先完成 Chatus 自身产品化。
