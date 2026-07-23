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
- AI Daily 本地就绪检查使用 `npm.cmd run ai-daily:production-readiness-check`、`npm.cmd run ai-daily:manifest-check`、`npm.cmd run ai-daily:model-evaluation-check`、`npm.cmd run ai-daily:model-runtime-check`、`npm.cmd run ai-daily:acceptance-check`、`npm.cmd run ai-daily:rollback-check`、`npm.cmd run ai-daily:runner-check`、`npm.cmd run ai-daily:operations-check`、`npm.cmd run ai-daily:observability-contract-check`、`npm.cmd run ai-daily:retention-check` 和 `npm.cmd run ai-daily:contracts-check`；这些命令不替代模型选型批准、Cron 启用或真实内容验收。实测评估仅是按需路径，现有 AI Daily migration 已于 2026-07-23 完成。

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
| AI Daily 后续 schema 变更 | 2026-07-23 的现有 migration 已完成；只有新增 migration 时才重新触发备份、可回滚 revision 和人工部署 | 只记录新增 migration 名、成功状态、低敏计数和回滚 revision；不重复执行既有 migration |
| 首篇公开导出 | 公开数据文件必须审查 diff | `studio:export -- --run-checks`、博客检查和最终 Git diff |
| AI Daily 真实来源与查询组 | 2026-07-19 已完成公共页面预审和站点所有者确认；16 个来源与 4 个核心查询组启用，hold/rejected 项关闭。来源包变更时重新触发此 gate | `ai-daily:manifest-check`、启用/批准/暂缓/拒绝数量、审核时间和低敏结论，不复制长段原文 |
| AI Daily 三角色模型选型 | 当前可直接采用手动静态选型：人工确认 extractor/composer/verifier 的 candidate id，并明确 `manual-static-selection`、`reduced_redundancy` 和无 fallback；只有需要质量对照或独立 fallback 时才做 BIAU-owned case set 实测评估 | `model-runtime-check`、`model-select`/`model-select-approve` 或可选评估 proposal/bundle hash、selection basis、审核时间与低敏结论；不记录 key、endpoint、prompt、伪造评分或原始输出 |
| AI Daily 首版生产验收 | 真实 edition、Studio 审核、Publish Export、公开部署和 rollback evidence 必须由人完成并确认是同一 issue/run/draft version | Git-ignored `ai-daily-rollback-evidence.local.json` 与 `ai-daily-acceptance.local.json` 的 sealed/hash 结果、四元绑定和 `ai-daily:* -- check --require-sealed` 摘要；不记录正文、URL、凭据或原始模型输出 |
| AI Daily 自动化 | 自动抓取和发布存在事实与版权风险 | 默认保持关闭；人工流程稳定后再选择调度器 |
| AI Daily 公开 Feed 上线 | 公开索引 migration 已完成；Cloudflare browser base、Studio CORS allowlist、Feed flag 和真实页面观察仍需要平台配置 | 只记录 Live revision、公开 route HTTP 状态、ETag/CORS 类别和页面截图，不记录数据库 URL 或 token |
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
| Prometheus / Grafana / ARMS | 需要 scrape、告警和平台账号 | `/metrics` 默认关闭；Studio 已提供低敏 AI Daily snapshot，仓库已提供六类故障 dashboard/alert 模板，生产 scrape、导入、权限和通知 routing 仍需人工启用 |
| Sentry / Faro / Langfuse | 可能收集错误、prompt、trace 和用户内容 | 明确采样、脱敏和保留周期后再接入 |

## 已完成的低敏事实

- 主站公开路由、项目/博客详情、状态页、sitemap、robots 和显式外链已有本地/线上无凭据检查；检查不发送模型问题。
- Qdrant public/private scoped knowledge 已有同步成功记录；真实 collection、key 和 embedding 配置未写入仓库。
- BIAU Operator 的生产边界复核已完成；同一 member context 已在重启后成功刷新一条既有 durable memory。生产配置值和 memory 内容未写入仓库。
- Studio 首轮生产审核已完成：两个 hidden 草稿均被标记为 `needs-changes`，当前没有创建 Publish Export，也没有把质量不足的草稿导出为公开文章。
- Studio 已实现并启用草稿版本条件写入、真实修订后重提、归档只读，以及 Publish Export 与具体草稿版本/批准记录的绑定。
- `20260717000000_publish_export_version_binding` 已在生产 Studio 服务执行；受保护的 health、草稿、来源和 Publish Export 只读接口均返回 `200`，新版 schema 查询成功。验收只记录状态与计数，不记录 token、正文或记录 ID。
- AI Daily schema 部署门禁已于 2026-07-23 完成：Supabase Free 项目不提供平台备份，站点所有者基于开发期、无不可替代日报数据和新增式 migration 明确接受跳过逻辑备份；Render 旧 revision `76c23cd` 已保留为应用回滚点，`3466eac7` 成功应用至 `20260719020000_ai_daily_public_feed_index`，公开 `/health` 返回 `200` 且数据库与鉴权均 ready。过程中未调用模型。
- ERP、Legal RAG、Xunqiu、Pet 和 Playlab 均已有本地构建或 synthetic 基础，生产账号/发布批准仍按上表处理。
- BIAU Operator 的 LangGraph、typed tools、owner session/memory schema、Cloudflare facade 和本地确定性测试已经进入代码收口；后续生产变更仍需按下方人工门禁执行。

## 当前人工队列

按顺序处理，完成一项后只记录低敏结果：

1. **已完成：确认三角色选型并批准 selection bundle**
   - 2026-07-24 已完成 runtime JSON、批准 bundle Secret File、文件路径和 bundle hash 的 Studio 配置与部署。以下静态命令只在未来重新选型或 runtime identity 变化时重跑；当前人工流程从第 2 项继续。
   - 来源预审已完成：16 个来源与 4 个核心查询组启用，hold/rejected 项关闭；只有来源包变更时才重新触发来源 gate。
   - 推荐先走零模型调用的静态路径：按职责选择 `qwen3.7-max-t` 对应 candidate 作为 extractor/verifier、`grok-4.5` 对应 candidate 作为 composer，运行 `ai-daily:model-select`，检查输出的 role、model identifier 和 `reduced_redundancy`，再运行 `ai-daily:model-select-approve`。两个命令都要求显式 `--acknowledge-reduced-redundancy`。
   - 只有需要质量对照或独立 fallback 时，才另行批准 `ai-daily:model-evaluate -- --execute` 真实业务任务；不运行 ping、doctor 或空 prompt。实测路径必须满足 `AI_DAILY_BUSINESS_EVALUATION_ENABLED=true` 和匹配的 `--approval-id`，并且串行执行。
   - 审核静态角色映射或实测聚合指标、failure-domain alias 和 record hash；bundle 未批准或 runtime channel 漂移时，production runner 必须拒绝启动。
   - 只记录低敏摘要；不要提交本地 proposal、真实 endpoint、key、prompt、原始输出或模型响应。
    - 未来重新选型时，将批准命令输出的 `server/data/ai-daily-model-approval.v1.json` 上传到 Render Studio 服务的 Secret Files，文件名必须是 `ai-daily-model-approval.v1.json`；设置 `AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json`，并把输出的 `bundleHash` 填入 `AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH`。
    - 未来重新选型并选择 Save, rebuild, and deploy 后运行 `npm.cmd run ai-daily:model-approval-check`（只读检查，`selectionBasis` 和 `networkCalls=0`）；文件、期望 hash 或 runtime identity 任一不匹配都必须先修复，不能打开 production generation。
    - 首个真实版次验收完成后创建 Editorial Cron 时，必须在该 Cron 服务内再次设置相同 runtime/file/hash，并单独上传同一 Secret File；Render 不会从 Studio 服务继承文件或环境变量。Ingest Cron 不配置模型渠道或审批 bundle。

2. **运行首个真实版次并初始化验收 manifest**
   - 暂时把 Studio 的 `AI_DAILY_PRODUCTION_GENERATION_ENABLED` 设为 `true` 并重新部署；保持 business evaluation、两个 Cron 和 public feed 关闭。在 Studio 的 AI Daily 工作区选择具备至少 3 条有效证据且包含 Tier 1 来源的 Edition，点击“运行真实版次”，填写操作人并完成二次确认。API 返回 `202` 后由持久化 worker 执行，页面会自动刷新 `QUEUED/RUNNING/COMPLETED` 状态；它是用户批准的真实内容任务，不是测活。
   - 等待 run 到达终态后把 `AI_DAILY_PRODUCTION_GENERATION_ENABLED` 恢复为 `false` 并重新部署。没有 Studio UI 的受控 Job Runner 环境可使用等价运维入口 `ai-daily:run -- --date <YYYY-MM-DD> --live`，不要临时改 Web Service Start Command。
   - 版次完成后运行 `npm.cmd run ai-daily:acceptance -- init --acceptance-id <id> --edition-date YYYY-MM-DD`，再把同一 `issueId`、`runId` 和 `editionDate` 写入本地 manifest。
   - 此时 `check` 仍应显示 Studio、Publish Export 和 deployment gate 缺失；不要提前 seal，也不要把 fixture 结果复制成 production 记录。

3. **处理首轮被退回修改的 Studio 草稿**
   - 在 Studio 中打开两个状态为 `needs-changes` 的 hidden 草稿。
   - 选择一个作为主稿，补齐可核验事实、来源、知识点、边界和配图/结构；另一个归档或明确保留为不发布稿。
   - 先保存修改并重新提交审核，不要直接发布；完成后由 Codex 复核低敏状态，再进入新版审核和 Publish Export 门禁。

4. **审核证据完整的新版草稿并创建第一个 Publish Export**
   - 仅在新版草稿完成事实、来源、结构和版权检查后执行。
   - 把同一 issue/run/date、draft id、review id、draft version、三个审核勾选和 Publish Export 检查结果写入本地验收 manifest；不记录文章正文或生产凭据。

5. **上线公开 Feed、完成部署观察并 seal**
   - `20260719020000_ai_daily_public_feed_index` 已随 `3466eac7` 在生产 Studio 数据库成功应用；启用 Feed 前只需记录当时的 Live Render revision，不要重复执行 migration。
   - Studio 服务设置生产 CORS allowlist 与 `AI_DAILY_PUBLIC_FEED_ENABLED=true`，Cloudflare Pages 设置当前 Studio public base 后重新部署；具体值只留在平台，不写入仓库或 manifest。
   - 用真实浏览页面和公开 GET 验收 `/ai-daily`、一个已批准事件详情、ETag `304`、撤回 `410` 和移动端，并确认暂停两个 Cron/关闭 generation 与 public feed 的 rollback 路径可执行。
    - 先按 [`docs/ai-daily-pipeline.md`](./ai-daily-pipeline.md) 创建、填写并封存 `ai-daily-rollback-evidence-v1`，运行 `npm.cmd run ai-daily:rollback -- check --require-sealed`；再将五项观察记为 `passed`，把 evidence id/hash/status 引用写入 acceptance manifest，运行 `npm.cmd run ai-daily:acceptance -- seal --rollback server/data/ai-daily-rollback-evidence.local.json` 和 `npm.cmd run ai-daily:acceptance -- check --rollback server/data/ai-daily-rollback-evidence.local.json --require-sealed`。只有六个 gate 全部通过后，首版验收 gate 才关闭。

6. **继续关联项目门禁**
   - Legal RAG demo、ERP 注册、Xunqiu/Pet release 按上表逐项处理。

## AI Daily 运行时人工门禁

以下实现已经在仓库中完成，但故意保持关闭，等待站点所有者针对具体候选模型任务作出单独批准：

- `ai-daily:model-runtime-check` 只使用 loopback provider，证明结构化请求不携带 `temperature`、响应解析、超时分类、bundle 防篡改和 `--fixture/--live` 互斥；它不验证外部模型可用性。
- `ai-daily:model-select` 与 `ai-daily:model-select-approve` 只读取 runtime candidate 映射，生成并批准 `manual-static-selection` bundle，始终报告零模型调用；二者都要求显式承认 reduced redundancy。
- `ai-daily:model-evaluate -- --execute` 是可选的真实质量对照路径，会串行运行业务案例/候选，不得由部署 hook、health check 或 Cron 自动触发。
- `ai-daily:model-approve` 不调用模型，只在人工审阅实测 proposal 后生成批准 bundle。
- Studio `POST /studio/api/ai-daily/issues/:id/live-run` 是首个真实版次的产品入口；它要求 admin token、Edition 版本、证据门禁和固定确认串，返回 `202` 后才由后台 worker 领取 `PRODUCTION` work。CLI `ai-daily:run -- --date <YYYY-MM-DD> --live` 是共享同一执行服务的运维入口。
- `ai-daily:acceptance` 不调用模型或生产服务；它只创建、检查和 seal 本地低敏证据索引。缺少真实 edition/review/export/deployment 时必须保持未 seal。

在真实版次通过 Studio 审核、导出和公开部署验收前，Render 上的 `AI_DAILY_BUSINESS_EVALUATION_ENABLED`、两个 Cron 和 public feed 都保持关闭；`AI_DAILY_PRODUCTION_GENERATION_ENABLED` 只在用户明确确认的真实版次执行窗口短时开启，run 到达终态后恢复关闭。

## 延期项

- AI Daily 自动抓取和自动发布。
- AI Daily retention mutation；当前已实现受保护的只读 dry-run 与候选阻断原因，但没有删除/归档路径。
- Umami/Plausible、Prometheus/Grafana/ARMS、Sentry/Faro/Langfuse。
- GitHub Social Preview 与额外运营素材。
- Chatus 与 BIAU 的只读 MCP 集成；先完成 Chatus 自身产品化。
