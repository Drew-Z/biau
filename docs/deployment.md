# BIAU Port 部署说明

本文描述当前最终部署边界。仓库中只记录变量名、职责和验证方法；真实 token、数据库 URL、模型地址、Cloudflare Access 配置值和私有域名只保存在对应平台。

当前仍需人工执行的事项只在 [`docs/manual-gates.md`](./manual-gates.md) 维护；本文件中的迁移命令是部署与回滚参考，不自动代表当前待办。

## 最终拓扑

同一仓库部署为静态前端加四个 Render Web Service：

| 服务 | `ASSISTANT_SERVICE_MODE` | 责任 |
| --- | --- | --- |
| `biau-public-assistant-api` | `public` | 公开助手、公开知识检索和公开模型回答。 |
| `biau-operator-api` | `operator` | owner-only 泊岸站务、LangGraph、站长会话/记忆、站务知识和 Studio draft-write。 |
| `biau-content-studio-api` | `studio` | 草稿、审核、AI Daily、来源池和发布导出记录。 |
| `biau-rag-orchestrator` | `rag` | public/internal scope 检索、Qdrant、embedding、可选 rerank 和知识同步。 |

Cloudflare Pages 承载 React 静态站点和 `/api/*` Functions。`/operator` 与 `/api/operator/*` 必须位于 Cloudflare Access 后；浏览器不直接持有 Render Operator service token。

## Cloudflare Pages

### 前端公开变量

```text
VITE_CHAT_API_BASE_URL=<公开助手浏览器 API base，推荐 /api>
VITE_STUDIO_API_BASE_URL=<Content Studio API 的公开浏览器 base>
VITE_AI_DAILY_API_BASE_URL=<Content Studio API origin；公开页面调用 /public/ai-daily/*，不带 token>
VITE_ANALYTICS_PROVIDER=<可选：umami | plausible | debug>
```

Operator 浏览器地址固定为同源 `/api/operator/*`，不需要 `VITE_OPERATOR_*`。不要把任何 token 写进 `VITE_*`。

### Public Assistant Function 私有变量

```text
PUBLIC_ASSISTANT_API_BASE_URL=<biau-public-assistant-api 的 Render base URL>
PUBLIC_ASSISTANT_PROXY_TIMEOUT_MS=55000
```

`functions/api/chat/public.ts` 和 feedback Function 只做同源薄代理。它们不会接触模型、搜索、embedding 或 Qdrant key，也不会转发浏览器提供的 `Authorization` 或 Cookie。
生产环境的薄代理预算必须大于 Render 侧 `PUBLIC_ASSISTANT_REQUEST_TIMEOUT_MS`，为持久化和网络回程保留余量；当前推荐分别为 55 秒和 45 秒。

### Operator Function 私有变量

```text
OPERATOR_API_BASE_URL=<biau-operator-api 的 Render base URL>
OPERATOR_SERVICE_TOKEN=<Cloudflare facade 与 Render 共享的随机服务凭据>
OPERATOR_OWNER_ID=<稳定 owner id>
OPERATOR_OWNER_EMAILS=<允许访问的 Access 邮箱，逗号分隔>
OPERATOR_DISPLAY_NAME=<站务显示名>
CF_ACCESS_TEAM_DOMAIN=<Cloudflare Access team domain>
CF_ACCESS_AUD=<Access application audience>
```

`functions/api/operator/[[path]].ts` 会验证 `Cf-Access-Jwt-Assertion` 的 RS256 签名、issuer、audience 和有效期，再检查 owner 邮箱。它会丢弃浏览器提供的授权/身份头，并注入服务端保存的 `OPERATOR_SERVICE_TOKEN` 和已验证 owner identity。

Cloudflare Access application 与 policy 需要在平台手工创建，至少覆盖：

- `/operator`
- `/operator/*`
- `/api/operator/*`

## Render 四服务边界

所有服务建议使用：

```text
NODE_VERSION=22
METRICS_ENABLED=false
```

### 1. Public Assistant

服务名：`biau-public-assistant-api`

```text
Build Command: npm ci && npm run assistant:index && npm run prisma:generate && npm run server:build
Start Command: npm run prisma:migrate && npm run server:start
```

```text
ASSISTANT_SERVICE_MODE=public
CORS_ORIGIN=<站点公开 origin>
DATABASE_URL=<公开助手匿名 session、turn、feedback 和 aggregate 数据库 URL>
TRUST_PROXY=true
ASSISTANT_MODEL_BASE_URL=<server-only OpenAI-compatible base>
ASSISTANT_MODEL_API_KEY=<server-only key>
ASSISTANT_MODEL_NAME=<model id>
ASSISTANT_MODEL_PROVIDER=<safe provider label>
ASSISTANT_MODEL_PROTOCOL=responses
ASSISTANT_RAG_API_BASE_URL=<RAG Orchestrator base>
ASSISTANT_RAG_API_KEY=<RAG_PUBLIC_API_KEY 对应值>
ASSISTANT_RAG_TIMEOUT_MS=3000
PUBLIC_ASSISTANT_REQUEST_TIMEOUT_MS=45000
PUBLIC_ASSISTANT_RATE_LIMIT=20
PUBLIC_ASSISTANT_RATE_WINDOW_MS=60000
PUBLIC_ASSISTANT_RETENTION_DAYS=30
PUBLIC_ASSISTANT_OPERATIONS_TOKEN=<低敏聚合 insights 的随机 server-only token>
PUBLIC_WEB_SEARCH_PROVIDER=tavily
PUBLIC_WEB_SEARCH_BASE_URL=https://api.tavily.com
PUBLIC_WEB_SEARCH_API_KEY=<Tavily Search API server-only token>
PUBLIC_WEB_SEARCH_TIMEOUT_MS=8000
PUBLIC_WEB_SEARCH_MAX_RESULTS=5
PUBLIC_WEB_FETCH_MAX_PAGES=3
```

`tavily` 是默认纯搜索适配器。服务端固定使用 Basic Search（每个查询 1 credit），关闭自动参数、Tavily 生成式 answer、raw content 和图片，只把结果当成发现线索；随后仍会抓取允许访问的原始 HTTPS 页面，再生成可核验引用。一次 Agent 研究可能拆成最多三个搜索查询，证据恢复时最多再执行一轮，因此公开接口必须保留现有限流并关注 credits 消耗。已有 Brave 或 Exa 配置可以继续使用：将 provider、base URL 与 key 换成对应服务端值即可。不要用 provider ping、catalog 或测活 prompt 验收，部署后只使用用户批准的真实研究问题检查完整业务链路。

公开助手使用独立数据库保存匿名会话、反馈和低敏聚合数据；原始 turn 最多保留 30 天。它不需要 Operator 数据库，也不保存 IP、Cookie、凭据或抓取全文。模型、站内 RAG 或网页研究部分不可用时会明确降级，不把降级结果伪装成完整回答。

### 2. BIAU Operator

服务名：`biau-operator-api`

```text
Build Command: npm ci && npm run assistant:index && npm run prisma:generate && npm run server:build
Start Command: npm run prisma:migrate && npm run prisma:migrate:studio && npm run server:start
```

```text
ASSISTANT_SERVICE_MODE=operator
CORS_ORIGIN=<站点公开 origin>
DATABASE_URL=<Operator owner 会话、消息、记忆、用量和站务知识数据库 URL>
STUDIO_DATABASE_URL=<内容工作台 Studio 数据库 URL，需与 biau-operator-api 相同>
OPERATOR_SERVICE_TOKEN=<与 Cloudflare Function 相同的随机服务凭据>
OPERATOR_OWNER_ID=<稳定 owner id>
OPERATOR_OWNER_EMAILS=<Access owner 邮箱白名单>
OPERATOR_DISPLAY_NAME=<站务显示名>
OPERATOR_MODEL_CHANNEL_ID=<可选，选定 server-only 模型通道>
ASSISTANT_MODEL_BASE_URL=<默认模型 base>
ASSISTANT_MODEL_API_KEY=<默认模型 key>
ASSISTANT_MODEL_NAME=<默认模型 id>
ASSISTANT_MODEL_PROVIDER=<safe provider label>
ASSISTANT_MODEL_CHANNELS_JSON=<可选 server-only fallback 通道列表>
ASSISTANT_RAG_API_BASE_URL=<RAG Orchestrator base>
ASSISTANT_RAG_API_KEY=<RAG_INTERNAL_API_KEY 对应值>
RAG_SYNC_TOKEN=<与 Orchestrator 相同的同步 token>
```

Operator API 只挂载 `/health` 与 `/operator/*`。它不挂载公开聊天、旧 `/chat/internal`、邀请码/成员管理、独立 Studio API 或 RAG HTTP API。`studio.draft` 通过 `STUDIO_DATABASE_URL` 直接创建 `hidden + review-needed` 草稿，发布与导出仍由人工审核。

`DATABASE_URL` 与 `STUDIO_DATABASE_URL` 通常指向两个不同数据库。Operator 服务和 `biau-content-studio-api` 的 `STUDIO_DATABASE_URL` 必须指向同一个内容库。

PostgreSQL 使用需要兼容证书链的 pooler 时，连接串按供应商说明配置 Prisma 7 / libpq 兼容参数；不要把连接串写入文档或 Git。

### 3. Content Studio

服务名：`biau-content-studio-api`

```text
Build Command: npm ci && npm run prisma:generate && npm run server:build
Start Command: npm run prisma:migrate:studio && npm run server:start
```

```text
ASSISTANT_SERVICE_MODE=studio
CORS_ORIGIN=<站点公开 origin>
TRUST_PROXY=true
STUDIO_DATABASE_URL=<与 biau-operator-api 相同的 Studio 数据库 URL>
STUDIO_ADMIN_TOKEN=<编辑和审核 token>
AI_DAILY_PUBLIC_CORS_ORIGINS=<允许读取公开 Feed 的站点 origin；多个值用逗号分隔>
AI_DAILY_TIME_ZONE=Asia/Shanghai
AI_DAILY_PUBLIC_FEED_ENABLED=false
AI_DAILY_PUBLIC_WINDOW_HOURS=72
AI_DAILY_PUBLIC_STALE_MINUTES=180
AI_DAILY_PUBLIC_RATE_LIMIT=60
AI_DAILY_PUBLIC_RATE_WINDOW_MS=60000
AI_DAILY_THE_NEWS_API_ENABLED=false
AI_DAILY_THE_NEWS_API_TOKEN=<仅启用 The News API 时填写>
AI_DAILY_HOTDAILY_ENABLED=true
AI_DAILY_MODEL_RUNTIME_JSON=<server-only channel and candidate mapping>
AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json
AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH=<ai-daily:model-select-approve 或 model-approve 输出的 bundleHash>
AI_DAILY_BUSINESS_EVALUATION_ENABLED=false
AI_DAILY_MODEL_EVALUATION_APPROVAL_ID=<only for optional measured evaluation>
AI_DAILY_PRODUCTION_GENERATION_ENABLED=false
```

Studio 模式挂载 `/health`、受保护的 `/studio/api/*`，以及独立无鉴权但有 CORS、限流和字段白名单的 `/public/ai-daily/*`。它不挂载聊天、Operator 或 RAG 路由。

AI Daily 的发现层不依赖 Tavily。未启用 The News API 时，GDELT DOC 作为无密钥 primary；启用并配置 `AI_DAILY_THE_NEWS_API_TOKEN` 后，The News API 成为 primary，GDELT 作为低结果量或失败时的 fallback。Hacker News Algolia 与 HotDaily 是 `leadOnly` 信号源；HotDaily 默认开启且不需要 token，可用 `AI_DAILY_HOTDAILY_ENABLED=false` 独立关闭。系统只保留 HotDaily 的原文标题、原文 URL 和 HN/Lobsters 等社区标识，不导入其 AI 摘要、价值评分或趋势结论。所有聚合/社区线索都必须重新抓取原始网页，取得可验证日期与正文并形成 `READY` evidence 后才可能进入日报。The News API token 只放在 Studio 以及未来 Ingest Cron 的 server-only environment，不放在前端、Editorial Cron、日志或数据库；查询参数中的 token 也不会进入候选或诊断数据。

`AI_DAILY_MODEL_RUNTIME_JSON` 只放在 Render 的 server-only environment 中，必须使用 `ai-daily-model-runtime-v2`。`channels` 保存私有 provider base、key、model 和 failure-domain alias，并统一声明 `protocol: "responses"`；`candidates` 将 extractor/composer/verifier 映射到 channel。AI Daily 不再使用 Chat Completions。默认推荐用 `ai-daily:model-select` 选择三个静态角色候选；它可以每个角色只有一个 candidate，并在批准 bundle 中明确 `manual-static-selection` 与 `reduced_redundancy`。只有需要质量对照或独立 fallback 时，才配置每角色 2-3 个候选并运行可选的真实评估。不要把真实 JSON 写入 Git、浏览器变量、日志或截图。审批 bundle 不依赖仓库构建产物：在 Studio 服务的 Render **Environment → Secret Files** 上传文件名 `ai-daily-model-approval.v1.json`，Render 运行时路径固定为 `/etc/secrets/ai-daily-model-approval.v1.json`，再把审批命令输出的 `bundleHash` 填入 `AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH`。Render Blueprint 只能声明固定路径和变量，Render Secret File 内容仍需在控制台人工上传或轮换。生产 runner 会同时校验文件 schema/hash、期望 bundle hash 和 runtime candidate/role/provider/failure-domain/model；任何缺失、篡改或漂移都会 fail closed。生产默认保持 `AI_DAILY_BUSINESS_EVALUATION_ENABLED=false` 和 `AI_DAILY_PRODUCTION_GENERATION_ENABLED=false`。首个真实版次优先在 Studio 的 AI Daily 工作区选择 Edition，展开“运行真实版次”，完成二次确认后入队；`ai-daily:run -- --date <date> --live` 仅保留为有 Shell/Job Runner 环境的运维入口。两条入口共享同一审批校验、持久化 work item、lease 和 checkpoint，Cron 不能作为模型测活或自动批准入口。

Secret Files 不会在 Render 服务之间自动共享。首个版次验收通过后创建 **Editorial Cron** 时，必须在该 Cron 上重复设置 `AI_DAILY_MODEL_RUNTIME_JSON`、`AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json`、`AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH`、`AI_DAILY_PRODUCTION_GENERATION_ENABLED` 和 Studio 数据库变量，并单独上传同一份 Secret File。Ingest Cron 不运行模型，不应配置模型 runtime、key 或审批 bundle；如果启用 The News API，它需要单独配置 `AI_DAILY_THE_NEWS_API_ENABLED=true` 和对应 token，HotDaily/GDELT/HN 不需要凭据。仓库的 `render.yaml` 故意不声明两个 Cron，防止 Blueprint 同步在人工门禁完成前直接启用定时任务。

审批 bundle 轮换顺序：先在本地完成人工审核并运行 `ai-daily:model-select-approve`（静态路径）或 `ai-daily:model-approve`（实测路径），记录新的 `bundleHash`；再分别向所有会执行 live runner 的服务上传同名 Secret File，更新相同的 `AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH`，最后选择 **Save, rebuild, and deploy**。回滚时恢复上一份已批准文件和 hash，或关闭 production generation；不要把 bundle JSON 粘贴进环境变量，也不要把真实 bundle 提交到 Git。

Studio 运维指标默认关闭，Render Blueprint 显式设置 `METRICS_ENABLED=false` 和 `AI_DAILY_OPERATIONS_METRICS_ENABLED=false`。仓库提供 `observability/ai-daily-grafana-dashboard.json` 和 `observability/ai-daily-prometheus-alerts.yml`，覆盖 `config`、`provider`、`evidence`、`quality`、`infrastructure`、`stale-content` 六类固定故障，并在 `biau_ai_daily_operations_snapshot_up` 为 `0` 或时间序列缺失持续 5 分钟时触发独立 critical 告警；先运行 `npm.cmd run ai-daily:observability-contract-check`，再由平台管理员人工配置 `METRICS_ENABLED=true`、`AI_DAILY_OPERATIONS_METRICS_ENABLED=true`、Prometheus scrape、Grafana 导入和通知 routing。模板不包含真实 datasource、凭据或告警目标。

### 4. RAG Orchestrator

服务名：`biau-rag-orchestrator`

```text
Build Command: npm ci && npm run assistant:index && npm run prisma:generate && npm run server:build
Start Command: npm run server:start
Health Check Path: /health
```

```text
ASSISTANT_SERVICE_MODE=rag
RAG_STORE_PROVIDER=qdrant
QDRANT_URL=<Qdrant URL>
QDRANT_API_KEY=<Qdrant key>
QDRANT_PUBLIC_COLLECTION=biau_public_chunks
QDRANT_PUBLIC_ALIAS=biau_public_chunks_active
QDRANT_INTERNAL_COLLECTION=biau_internal_chunks
RAG_PUBLIC_API_KEY=<公开助手 retrieve key>
RAG_INTERNAL_API_KEY=<Operator retrieve key>
RAG_SYNC_TOKEN=<知识同步 token>
EMBEDDING_BASE_URL=<embedding base>
EMBEDDING_API_KEY=<embedding key>
EMBEDDING_MODEL=<embedding model>
EMBEDDING_DIMENSION=4096
EMBEDDING_TIMEOUT_MS=20000
RERANKER_BASE_URL=<可选>
RERANKER_API_KEY=<可选>
RERANKER_MODEL=<可选>
RERANKER_TIMEOUT_MS=10000
```

当前 Qdrant `internal` scope 表示 owner/private 站务知识的检索隔离层，不代表成员制产品。公开助手只能使用 public key/scope，Operator 使用 internal key/scope。

公开知识同步由 `.github/workflows/public-rag-sync.yml` 在 `main` 的知识源发生变化时触发。GitHub Actions 需要两个 repository secrets：

```text
PUBLIC_RAG_API_BASE_URL=<biau-rag-orchestrator 的 Render base URL>
RAG_SYNC_TOKEN=<与 RAG 服务相同的同步 token>
```

workflow 会先重新生成并校验知识索引，再等待 RAG `/health` 返回的 `buildCommit` 与当前 Git SHA 一致、`publicSourceChecksum` 与当前索引一致，之后才调用受 token 保护的 `POST /v1/sync/public`。同步失败时 workflow 失败，但 Qdrant 旧 alias 保持可用；可从 GitHub Actions 手动运行 `workflow_dispatch` 重试。`RENDER_GIT_COMMIT` 由 Render 自动提供，不需要人工配置。

## Owner 数据迁移与回滚记录（已完成）

旧成员制数据没有整体迁入 Operator；已完成的选择性迁移只包含用户确认属于站长、状态为 `ACTIVE` 的长期记忆。以下命令保留用于审计和未来重新迁移，不是当前待执行 setup：

```powershell
npm.cmd run operator:memory-migration:check
npm.cmd run operator:memory-migration:apply -- --ids <approved-record-ids>
```

现有迁移已通过重启后 durable memory 复核。普通聊天、邀请码、成员、成员模型分配、成员用量和不确定记录都未迁移；未来只有出现新的人工批准记录时才重新运行 check/apply，并在操作前保留数据库备份与上一 Render revision。

## 本地开发

本地 Vite 可使用 server-only 代理连接 Operator API：

```text
OPERATOR_API_BASE_URL=http://127.0.0.1:8787
OPERATOR_SERVICE_TOKEN=<local placeholder>
OPERATOR_OWNER_ID=site-owner
OPERATOR_OWNER_EMAILS=owner@example.invalid
OPERATOR_DISPLAY_NAME=Local Owner
```

这些值放在 `.env.local`。`vite.config.ts` 只在开发服务器进程中注入请求头，不会把 service token 打包到浏览器代码。

## 验证

本地确定性验证不调用真实模型：

```powershell
npm.cmd run operator:facade-smoke
npm.cmd run operator:knowledge-check
npm.cmd run assistant:agent-contract
npm.cmd run assistant:agent-eval
npm.cmd run assistant:public-agent-check
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-persistence-check
npm.cmd run assistant:public-web-check
npm.cmd run assistant:public-sync-check
npm.cmd run assistant:hybrid-contract
npm.cmd run assistant:service-modes-smoke
npm.cmd run cf-assistant:smoke
npm.cmd run studio:export-contract-check
npm.cmd run server:smoke
npm.cmd run docs:deployment-check
npm.cmd run lint
npm.cmd run build
```

生产人工验收只使用真实站务任务，不发送 ping、doctor、空 prompt 或模型测活请求。验收记录只保留 HTTP 状态、低敏错误类别、工具结果和是否生成待审核草稿，不记录正文、token、模型端点或数据库信息。
