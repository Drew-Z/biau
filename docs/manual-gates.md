# Manual Gates Ledger

这份总账只记录必须由用户在平台、生产凭据或发布审批层完成的事项。仓库与聊天中不得保存真实 token、密码、数据库连接串、模型端点、签名材料、私有后台地址或生产内容正文。

相关文档：

- [部署说明](./deployment.md)
- [Content Studio](./content-studio.md)
- [AI Daily Pipeline](./ai-daily-pipeline.md)
- [Studio / AI Daily 生产就绪记录](./studio-ai-daily-production-readiness.md)
- [知航产品验收矩阵](./public-assistant-product-acceptance.md)
- [潮讯产品验收矩阵](./ai-daily-product-acceptance.md)
- [站点监察](./site-monitoring.md)
- [可观测性策略](./observability-strategy.md)

## 执行规则

- Codex 完成本地代码、fixture、构建、文档、synthetic 和低敏状态整理。
- 平台控制台、生产数据库破坏性操作、真实模型任务、账号策略、APK 签名与公开发布由用户批准。
- 模型验收只能使用用户批准的真实业务问题；禁止 ping、doctor、空 prompt、catalog probe 和无意义测活。
- 完成记录只写低敏结论与可复跑命令，不记录配置值、私有内容或 provider 原始响应。
- 状态变化后运行 `npm.cmd run docs:manual-gates-check`。

## BIAU 平台状态

Render 三服务边界（public/studio/rag）已经进入代码和部署契约：

- Public：公开研究助手、匿名会话、反馈与低敏聚合。
- Studio：Content Studio、AI Daily 与 Publish Export。
- RAG：server-only Supabase pgvector、hybrid retrieval 与公开知识同步；可选 Qdrant 适配器只用于兼容/回滚测试。

已完成的生产门禁：

- Cloudflare 同源 SSE 已返回完整 `ready -> progress -> result -> done`。
- 用户批准的真实研究问题已得到模型回答、原网页证据和合法 citation 映射。
- 匿名 session/turn、feedback、公开 RAG sync 与 Supabase pgvector readiness 已完成验收。
- Cloudflare 生产环境已收缩为站点、Public proxy 与 Studio browser base 所需变量。
- Operator PostgreSQL 生产退役已完成：备份恢复演练、preflight、allowlist apply、verify 和 Public/Studio/RAG 健康检查均通过。

这些证据已完成旧 Operator 数据面的受控退役；随后已分别删除 legacy Render Operator 服务与 external internal Qdrant collection，当前不再存在 Operator/internal-RAG 删除门禁。

## Public assistant Cloudflare model relay rollout

第一套 Responses 渠道通过固定上游 Cloudflare relay 接入生产 Render。2026-08-12 用户批准用古诗生成作为有界真实业务任务验证候选模型：`grok-4.5` 经 Responses 协议成功返回完整结果；其余候选分别处于认证拒绝或上游不可用状态，不进入生产 fallback。平台收口按以下门禁执行：

- Cloudflare production 设置 `MODEL_RELAY_SHARED_TOKEN`（至少 32 字符随机值）、`MODEL_RELAY_UPSTREAM_BASE_URL`、`MODEL_RELAY_UPSTREAM_API_KEY` 三项 Secret，并设置模型白名单与 timeout 服务端变量。
- 先部署 Cloudflare Pages，确认未授权 relay 请求返回稳定 `401`，且不发送模型请求。
- 当前 `MODEL_RELAY_ALLOWED_MODELS` 只允许 `grok-4.5`；Render public service 只配置主 relay 和该 Responses 模型。备用 relay、fallback 模型和视觉模型保持关闭，直到独立渠道通过新的获批业务任务。
- 不执行 ping、doctor、空 prompt 或逐模型测活；本轮批准只覆盖已经完成的有界候选选型，新的生产端到端请求仍需再次明确批准，并在完成后删除临时会话。
- 2026-08-04 relay 诊断 revision `87210661` 已在 Cloudflare Pages 与 Render 进入生产；确定性检查、Render/Cloudflare health 与无认证 relay `401` 边界均通过。
- 2026-08-12 已在 `059b74a2` 上执行一次获批的站点业务问题：HTTP `200`，站内检索返回合法证据且会话持久化通过，但三次有界生成尝试后仍为 `degraded/fallback`。随后已修正 Public API 的外部 RAG URL 错配，但未自动发送第二次真实请求。低敏 Render 恢复事件为 `provider_unavailable`，主、备 relay 的配置/鉴权合同已通过，失败仍处于上游 `5xx` 边界。
- 本地获批古诗任务已证明当前主渠道可生成回答，但 Cloudflare 与 Render 新配置仍需按顺序重新部署后才能形成生产证据；不得用本地结果替代生产端到端验收。
- 回滚只恢复上一组 Render model 变量和上一 Cloudflare Pages deployment，不需要数据库迁移或回滚。

### Model and multimodal rollout

- [x] Cloudflare 主上游 Secret 已更新，`MODEL_RELAY_ALLOWED_MODELS` 已收缩为单个已验证模型；不要把 URL 或 key 写入仓库和截图。
- [x] Render public service 的主模型变量已更新；旧 fallback 模型和视觉模型变量已删除。
- [ ] 先完成新的 Cloudflare Pages 部署，再部署 Render Public API；之后只检查 `/health` 和不触达上游的 relay 请求合同。
- [ ] 图片理解保持关闭。只有再次获得用户明确批准，并且视觉模型通过一条真实图片业务问题后才配置 `ASSISTANT_VISION_MODEL`；不执行模型测活、逐模型探测或自动重试验收。

## Operator PostgreSQL 退役

生产 PostgreSQL 退役已于 2026-07-26 完成。以下步骤保留为可审计 runbook：

1. 确认旧 Operator writer 已停止，并保留可恢复数据库备份与上一 Render revision。
2. 从数据库控制台记录 database name 和 database user，不把连接串写入仓库。
3. 运行 `scripts/operations/postgres/operator-retirement/preflight.sql`，核对 12 个目标表、7 个 enum、public protection tables、row count、跨边界 FK 与活跃连接。
4. 只有在目标数据库指纹与 allowlist 均人工确认后，才以确认串运行 `apply.sql`。
5. 立即运行 `verify.sql`、public persistence、Studio 与 RAG smoke。
6. 观察通过后，最后人工删除 Render Operator 服务（已完成）。
7. 当时的公开 RAG 路径稳定且备份/回滚信息保留后，已通过独立 gate 删除 internal Qdrant collection。

破坏性 SQL 不在 `prisma/migrations/` 中，不会随 Render 重启自动执行；脚本不使用 `CASCADE`，也不会触碰 `PublicAssistant*`、Studio 或 AI Daily 表。

退役收尾已完成：

- 已删除暂停的 legacy Render Operator 服务。
- 已在确认当时的公开 RAG 路径稳定后删除旧 internal Qdrant collection，并清理 RAG 服务的废弃 internal collection/API-key 变量。

## Supabase Data API 权限加固

生产权限加固已于 2026-07-26 完成。仓库未使用浏览器端 Supabase client，应用通过服务端 Prisma 直连数据库；最近 API 日志也没有站点 `/rest/v1` 数据访问。

- 剩余 25 张 `public` 表已全部启用 RLS。
- `anon` / `authenticated` 已失去 public schema、table、sequence 与 function 权限。
- `postgres` 创建未来 public 对象时不再自动授予 Data API 权限。
- 两个 AI Daily 审计触发器函数已固定 `search_path` 并撤销公开执行。
- Public、Studio 与 RAG 健康检查通过，受保护数据计数未变化。

当前无 RLS policy 是服务器专用数据库的有意默认拒绝状态。未来如果引入 Supabase REST、GraphQL、Realtime、Edge Function 或浏览器/mobile client，必须先新建独立 Trellis 任务，按最小权限恢复 schema/object grant 并设计逐表 RLS policy；不得直接恢复 Supabase 的全表默认授权。完整 runbook 位于 `scripts/operations/postgres/data-api-hardening/README.md`。

## Content Studio / AI Daily

| Gate | 人工原因 | 安全证据 |
| --- | --- | --- |
| 后续 schema 变更 | 新 migration 需要数据库备份和可回滚 revision | migration 名、成功状态、低敏计数 |
| 首篇公开导出 | 公开数据文件必须审查 diff | `studio:export -- --run-checks`、博客检查、Git diff |
| AI Daily 来源与查询组变更 | 时效、版权和来源等级需要人工确认 | manifest 启用/暂缓/拒绝数量与审核时间 |
| 三角色模型重新选型 | runtime identity 或职责映射变化需要批准 | bundle hash、selection basis、低敏评估摘要 |
| 首版生产验收 | 真实 edition、审核、export、公开部署与 rollback 必须绑定同一版本 | sealed acceptance/rollback manifest 摘要 |
| AI Daily 自动化 | 自动抓取和发布存在事实与版权风险 | 人工流程稳定后再启用 Cron |
| 公开 Feed | CORS、browser base、flag 与页面观察需要平台配置 | route HTTP、ETag/CORS 类别、移动端截图 |
| retention mutation | 会删除/归档证据与审核链 | 当前仅允许 dry-run；未来另行备份和批准 |

当前已配置的模型批准包必须保持：

```text
AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json
AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH=<approved bundle hash>
```

批准包通过 Render Secret File 上传。Secret File 不会自动共享给未来的 Editorial Cron；创建 Cron 时必须单独上传同一文件并设置相同 runtime/path/hash。

## AI Daily 当前人工队列

### 1. 运行首个真实版次

- 暂时将 Studio 的 `AI_DAILY_PRODUCTION_GENERATION_ENABLED` 设为 `true` 并部署。
- 保持 business evaluation、Cron 与 public feed 关闭。
- 在 AI Daily 工作区选择证据完整且包含 Tier 1 来源的 Edition，运行一次明确批准的真实版次。
- run 到达终态后立即把 generation flag 恢复为 `false` 并重新部署。
- 不临时修改 Web Service Start Command，不把该流程包装成模型测活。

### 2. 初始化验收 manifest

```bash
npm run ai-daily:acceptance -- init --acceptance-id <id> --edition-date <YYYY-MM-DD>
```

把同一 `issueId`、`runId` 与 `editionDate` 记录在 Git-ignored 本地 manifest 中。Studio review、Publish Export 与 deployment gate 未完成前不得 seal。

### 3. 审核草稿与 Publish Export

- 打开 `needs-changes` 的 hidden 草稿，补齐事实、来源、结构、版权与公开边界。
- 保存真实修改后重新提交审核，不直接发布。
- 三项 checklist 全部通过后，创建第一个与 draft/review/version 绑定的 Publish Export。
- 运行本地 exporter 和公开内容检查，人工审查最终 Git diff。

### 4. 上线公开 Feed 并封存证据

- 设置 Studio CORS allowlist 与 `AI_DAILY_PUBLIC_FEED_ENABLED=true`，设置 Cloudflare 的 Studio public base 并部署。
- 验收 `/ai-daily`、已批准详情、ETag `304`、撤回 `410` 与移动端页面。
- 完成 rollback evidence，再 seal acceptance manifest。
- 只有所有 gate 都通过后才考虑 Editorial Cron。

## 关联项目门禁

| 项目 | 当前人工事项 | 成功标准 |
| --- | --- | --- |
| Legal RAG | 准备低权限可回收 demo 账号，验收问答、合同审查和质量面板 | credentialed synthetic 可复跑，只保留 HTTP/功能状态 |
| ERP | 决定生产注册策略，以低权限账号复核注册、登录和默认角色 | 注册/登录和同步路径有可复跑证据 |
| Xunqiu | 确认公开后端 base；正式 APK 需签名、SHA-256 校验、扫描和批准 | 状态页只展示获批 release |
| Pet | 等待正式 release APK/AAB、签名、校验和与公开下载批准 | `pet:synthetic` 与下载入口同时通过 |
| BIAU Playlab | 新试玩上线时确认公开入口和资源版本 | `playlab:synthetic` 与移动端试玩通过 |
| Chatus | 使用其独立 Trellis 任务和独立部署边界 | 自身 lint/test/build/deploy 证据 |
| Anchor Learning | 浏览器 Demo 继续保持零外部请求；Flutter Private Alpha 单独补齐安装、升级和本地数据迁移证据 | 浏览器 Demo 回归通过，Private Alpha 具备可复跑 release 证据 |
| 画帆 BIAU Canvas | 确认公开域名、owner、隐私/存储/限额/删除规则和可公开截图 | 核心流程、移动端、状态目标、助手知识与 synthetic 同时通过后升级为 online |

## 访问分析与可观测性

| Gate | 人工原因 | 默认决策 |
| --- | --- | --- |
| Cloudflare Analytics / Search Console / Webmaster | 需要站点所有权 | 可独立启用，不阻塞产品功能 |
| Plausible 或 Umami 二选一 | 需要隐私、托管和口径选择 | 不同时接两套访客统计 |
| Prometheus / Grafana / ARMS | 需要 scrape、告警和平台账号 | `/metrics` 默认关闭，生产启用需人工配置 |
| Sentry / Faro / Langfuse | 可能收集错误、prompt、trace 和用户内容 | 明确采样、脱敏与保留周期后再接入 |

## 延期项

- AI Daily 自动抓取和自动发布。
- AI Daily retention mutation。
- Umami/Plausible、Prometheus/Grafana/ARMS、Sentry/Faro/Langfuse。
- GitHub Social Preview 与额外运营素材。
- Chatus 与 BIAU 的只读 MCP 集成。
