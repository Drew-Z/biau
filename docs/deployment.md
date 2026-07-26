# BIAU Port deployment

本文描述当前生产拓扑、环境变量边界、迁移顺序和回滚点。所有真实 URL、数据库连接串、Token 与模型密钥只保存在 Cloudflare、Render 或本地私有环境中。

需要用户在平台完成的步骤统一记录在 [`docs/manual-gates.md`](./manual-gates.md)。

## 生产拓扑

同一仓库部署为三个 Render Web Service：

| Service | Mode | Responsibility |
| --- | --- | --- |
| `biau-public-assistant-api` | `ASSISTANT_SERVICE_MODE=public` | 公开研究助手、匿名会话/反馈持久化 |
| `biau-content-studio-api` | `ASSISTANT_SERVICE_MODE=studio` | Content Studio、AI Daily、发布导出 |
| `biau-rag-orchestrator` | `ASSISTANT_SERVICE_MODE=rag` | public-only Qdrant 检索与公开知识同步 |

Cloudflare Pages 承载静态站和同源 Functions。浏览器只访问同源 `/api/chat/public*` 与 Studio 公共读取入口；模型、搜索、RAG、数据库和同步凭据均留在服务器端。

```text
Browser
  -> Cloudflare Pages / Functions
       -> biau-public-assistant-api
            -> single Responses model
            -> Tavily discovery + safe original-page fetch
            -> biau-rag-orchestrator -> Qdrant public alias
            -> public assistant PostgreSQL
       -> biau-content-studio-api
            -> Studio / AI Daily PostgreSQL
```

## Cloudflare Pages

生产环境只需要以下站点变量：

```text
NODE_VERSION=22
PUBLIC_ASSISTANT_API_BASE_URL=<公开助手 Render URL>
PUBLIC_ASSISTANT_PROXY_TIMEOUT_MS=55000
VITE_STUDIO_API_BASE_URL=<Studio Render URL>
VITE_AI_DAILY_API_BASE_URL=<Studio Render URL>
```

`PUBLIC_ASSISTANT_API_BASE_URL` 和 proxy timeout 是 Functions 的服务端变量，不会进入 Vite bundle。不要创建 `VITE_*` 模型、搜索、RAG、数据库或 Token 变量。

发布后验证：

```bash
npm run cf-assistant:smoke
```

优先验证 SSE 路径能完整返回 `ready -> progress -> result -> done`；只有用户批准的真实业务问题才允许触发一次生产模型/搜索调用，不执行 provider ping、catalog probe 或测活 prompt。

## Render: Public assistant

Build Command：

```text
npm ci && npm run assistant:index && npm run prisma:generate && npm run server:build
```

Start Command：

```text
npm run prisma:migrate && npm run server:start
```

Health Check Path：`/health`

核心变量：

```text
NODE_VERSION=22
ASSISTANT_SERVICE_MODE=public
CORS_ORIGIN=https://biau.playlab.eu.cc
TRUST_PROXY=true
DATABASE_URL=<公开助手匿名 session、turn、feedback 和 aggregate 数据库 URL>

ASSISTANT_MODEL_BASE_URL=<Responses-compatible /v1 base URL>
ASSISTANT_MODEL_API_KEY=<server-only key>
ASSISTANT_MODEL_NAME=<single generation model>
ASSISTANT_MODEL_PROVIDER=<safe provider label>
ASSISTANT_MODEL_PROTOCOL=responses

ASSISTANT_RAG_API_BASE_URL=<RAG Render URL>
ASSISTANT_RAG_API_KEY=<与 RAG_PUBLIC_API_KEY 相同>
ASSISTANT_RAG_TIMEOUT_MS=3000

PUBLIC_ASSISTANT_REQUEST_TIMEOUT_MS=45000
PUBLIC_ASSISTANT_ANSWER_TIMEOUT_MS=20000
PUBLIC_ASSISTANT_RATE_LIMIT=20
PUBLIC_ASSISTANT_RATE_WINDOW_MS=60000
PUBLIC_ASSISTANT_RETENTION_DAYS=30
PUBLIC_ASSISTANT_OPERATIONS_TOKEN=<server-only operations token>

PUBLIC_WEB_SEARCH_PROVIDER=tavily
PUBLIC_WEB_SEARCH_BASE_URL=https://api.tavily.com
PUBLIC_WEB_SEARCH_API_KEY=<server-only Tavily key>
PUBLIC_WEB_SEARCH_TIMEOUT_MS=8000
PUBLIC_WEB_SEARCH_MAX_RESULTS=5
PUBLIC_WEB_FETCH_MAX_PAGES=3
METRICS_ENABLED=false
```

`DATABASE_URL` 不存 IP、账号、Cookie、hidden prompt、provider payload 或完整网页正文。原始 turn 最长保留 30 天，长期统计只保留 topic fingerprint 与计数。

## Render: Content Studio and AI Daily

Build Command：

```text
npm ci && npm run prisma:generate && npm run server:build
```

Start Command：

```text
npm run prisma:migrate:studio && npm run server:start
```

核心变量：

```text
NODE_VERSION=22
ASSISTANT_SERVICE_MODE=studio
CORS_ORIGIN=https://biau.playlab.eu.cc
TRUST_PROXY=true
STUDIO_DATABASE_URL=<内容工作台 Studio 数据库 URL>
STUDIO_ADMIN_TOKEN=<server-only admin token>

AI_DAILY_PUBLIC_CORS_ORIGINS=https://biau.playlab.eu.cc
AI_DAILY_PUBLIC_FEED_ENABLED=false
AI_DAILY_PUBLIC_WINDOW_HOURS=72
AI_DAILY_PUBLIC_STALE_MINUTES=180
AI_DAILY_PUBLIC_RATE_LIMIT=60
AI_DAILY_PUBLIC_RATE_WINDOW_MS=60000
AI_DAILY_MODEL_RUNTIME_JSON=<approved runtime JSON>
AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json
AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH=<ai-daily:model-select-approve 或 model-approve 输出的 bundleHash>
AI_DAILY_BUSINESS_EVALUATION_ENABLED=false
AI_DAILY_PRODUCTION_GENERATION_ENABLED=false
METRICS_ENABLED=false
AI_DAILY_OPERATIONS_METRICS_ENABLED=true
```

模型批准包通过 Render Secret File 上传，挂载为 `/etc/secrets/ai-daily-model-approval.v1.json`。Render Secret Files 不会在 Render 服务之间自动共享；未来创建 Editorial Cron 时，必须为 Cron 单独上传同一批准包并配置相同 runtime/path/hash。

AI Daily 第一期真实日报通过人工验收前，`AI_DAILY_PUBLIC_FEED_ENABLED` 与 `AI_DAILY_PRODUCTION_GENERATION_ENABLED` 保持 `false`。Editorial Cron 暂不加入 Blueprint，避免未批准的自动发布。

## Render: public-only RAG

Build Command：

```text
npm ci && npm run assistant:index && npm run prisma:generate && npm run server:build
```

Start Command：

```text
npm run server:start
```

Health Check Path：`/health`

核心变量：

```text
NODE_VERSION=22
ASSISTANT_SERVICE_MODE=rag
RAG_STORE_PROVIDER=qdrant
QDRANT_URL=<Qdrant server URL>
QDRANT_API_KEY=<server-only key>
QDRANT_PUBLIC_COLLECTION=biau_public_chunks
QDRANT_PUBLIC_ALIAS=biau_public_chunks_active
RAG_PUBLIC_API_KEY=<public service to RAG credential>
RAG_SYNC_TOKEN=<publication sync credential>

EMBEDDING_BASE_URL=<OpenAI-compatible embedding base URL>
EMBEDDING_API_KEY=<server-only embedding key>
EMBEDDING_MODEL=<embedding model>
EMBEDDING_DIMENSION=4096
EMBEDDING_TIMEOUT_MS=20000

RERANKER_BASE_URL=<optional reranker base URL>
RERANKER_API_KEY=<optional server-only key>
RERANKER_MODEL=<optional reranker model>
RERANKER_TIMEOUT_MS=10000
METRICS_ENABLED=false
```

RAG 只接受 public scope。读取入口是 `/v1/retrieve`，版本化公开同步入口是 `/v1/sync/public`；旧通用同步入口不存在。`RAG_SYNC_TOKEN` 只用于发布流水线，公开助手服务只持有 `RAG_PUBLIC_API_KEY`。

公开知识同步的 GitHub Actions workflow 是 `.github/workflows/public-rag-sync.yml`。仓库 secrets：

```text
PUBLIC_RAG_API_BASE_URL=<RAG Render URL>
PUBLIC_RAG_SYNC_TOKEN=<与 RAG_SYNC_TOKEN 相同>
```

本地 dry-run：

```bash
npm run assistant:rag-sync-local
npm run assistant:public-sync-check
```

## 迁移和发布顺序

以下顺序记录 2026-07-26 已完成的 public-only 发布与 Operator/internal-RAG 退役流程：

1. 备份公开助手数据库与 Studio 数据库，保留可回滚的 Render revision。
2. 部署并验证 `biau-rag-orchestrator` public-only 代码与 public alias。
3. 部署 `biau-public-assistant-api`，运行 Prisma public persistence migrations。
4. 部署 `biau-content-studio-api`，确认 Studio/AI Daily migration 与 health 正常。
5. 部署 Cloudflare Pages，完成同源 SSE、feedback、public sync 和持久化验收。
6. 停止旧 Operator writer，运行 `scripts/operations/postgres/operator-retirement/preflight.sql`。
7. 只有在备份可恢复、数据库指纹和 allowlist 均经人工确认后，才运行 `apply.sql` 与 `verify.sql`。
8. 通过 public persistence、Studio 和 RAG smoke 后，最后人工删除 Render Operator 服务（已完成）。
9. 在独立观察窗口后，人工删除旧 internal Qdrant collection 与平台侧废弃变量。

破坏性 Operator SQL 不得放入 `prisma/migrations/`，因为 Render 启动会自动执行 Prisma migrations。完整操作见 `scripts/operations/postgres/operator-retirement/README.md`。

## 验证

```bash
npm run prisma:validate
npm run prisma:generate
npm run assistant:index
npm run assistant:public-agent-check
npm run assistant:public-model-check
npm run assistant:public-api-check
npm run assistant:public-persistence-check
npm run assistant:public-rate-limit-check
npm run assistant:public-web-check
npm run assistant:public-sync-check
npm run assistant:hybrid-contract
npm run assistant:rag-smoke
npm run assistant:service-modes-smoke
npm run server:build
npm run server:smoke
npm run cf-assistant:smoke
npm run studio:smoke
npm run ai-daily:contracts-check
npm run ai-daily:production-readiness-check
npm run docs:deployment-check
npm run lint
npm run build
```

上述 deterministic checks 不得访问真实模型、搜索、embedding、reranker 或向量数据库供应商。

## 回滚

- SQL 退役前：回滚应用 revision 和 Qdrant public alias 即可。
- SQL 退役后：停止写入，把已验证的备份恢复到新数据库，再切换数据库 URL 与上一应用 revision；重新跑旧 migration 只能恢复空表结构，不能恢复数据。
- Studio/AI Daily 数据库从不进入 Operator 退役 allowlist。
- 观察窗口结束前保留备份、前一 revision 和旧 internal collection；窗口通过并删除旧 collection 后，继续按既定保留策略保存数据库备份与 revision 回滚证据。
