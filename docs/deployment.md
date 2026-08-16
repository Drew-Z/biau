# BIAU Port deployment

本文描述当前生产拓扑、环境变量边界、迁移顺序和回滚点。所有真实 URL、数据库连接串、Token 与模型密钥只保存在 Cloudflare、Render 或本地私有环境中。

需要用户在平台完成的步骤统一记录在 [`docs/manual-gates.md`](./manual-gates.md)。

## 生产拓扑

同一仓库部署为三个 Render Web Service：

| Service | Mode | Responsibility |
| --- | --- | --- |
| `biau-public-assistant-api` | `ASSISTANT_SERVICE_MODE=public` | 公开研究助手、匿名会话/反馈持久化 |
| `biau-content-studio-api` | `ASSISTANT_SERVICE_MODE=studio` | Content Studio、AI Daily、发布导出 |
| `biau-rag-orchestrator` | `ASSISTANT_SERVICE_MODE=rag` | public-only Supabase pgvector 检索与公开知识同步 |

Cloudflare Pages 承载静态站和同源 Functions。浏览器只访问同源 `/api/chat/public*` 与 Studio 公共读取入口；模型、搜索、RAG、数据库和同步凭据均留在服务器端。

```text
Browser
  -> Cloudflare Pages / Functions
       -> biau-public-assistant-api
            -> bounded primary + fallback Responses generation chain
                 -> authenticated fixed-upstream Cloudflare model relay
            -> Tavily discovery + safe original-page fetch
            -> biau-rag-orchestrator -> Supabase pgvector
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

MODEL_RELAY_SHARED_TOKEN=<Cloudflare 与 Render 共享的至少 32 字符随机 server-only token>
MODEL_RELAY_UPSTREAM_BASE_URL=<获批第一套渠道的 Responses base URL>
MODEL_RELAY_UPSTREAM_API_KEY=<获批第一套渠道的 server-only key>
MODEL_RELAY_FALLBACK_UPSTREAM_BASE_URL=
MODEL_RELAY_FALLBACK_UPSTREAM_API_KEY=
MODEL_RELAY_FREE3_UPSTREAM_BASE_URL=<AI Daily 获批 Free3 渠道的 Responses base URL>
MODEL_RELAY_FREE3_UPSTREAM_API_KEY=<AI Daily 获批 Free3 渠道的 server-only key>
MODEL_RELAY_ALLOWED_MODELS=grok-4.5
MODEL_RELAY_TIMEOUT_MS=50000
```

`PUBLIC_ASSISTANT_API_BASE_URL`、proxy timeout 和 `MODEL_RELAY_*` 都是 Functions 的服务端变量，不会进入 Vite bundle。URL、上游 key 与共享 token 使用 Cloudflare Secret 类型；模型白名单与 timeout 可以使用普通服务端变量。不要创建 `VITE_*` 模型、搜索、RAG、数据库或 Token 变量。

`POST /api/model-relay/responses`、可选的 `POST /api/model-relay/fallback/responses` 和 AI Daily 专用的 `POST /api/model-relay/free3/responses` 只接受共享 bearer token、JSON Responses 请求和上述白名单模型。三个路由分别固定到主、备用和 Free3 上游，不接收浏览器 Cookie、任意上游 URL、任意模型或未知顶层字段；任一路由的专用 Secret 未完整配置时都会 fail closed。每个路由对一条请求最多发送一次固定上游请求，relay 不因网络、timeout 或 `5xx` 自动切换其他渠道；Responses 客户端仅在收到 `404/405` 时保留既有兼容路径回退。非 2xx 上游正文会被丢弃，仅保留固定枚举供 Render 映射为低敏故障类别。SSE 直接流式转发并保留取消传播、总时限、512 KB 请求上限和 512 KB 响应上限。

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

ASSISTANT_MODEL_BASE_URL=<CPA Responses base URL ending in /v1>
ASSISTANT_MODEL_API_KEY=<CPA server-only client key>
ASSISTANT_MODEL_NAME=free5/DeepSeek-V4-Flash
ASSISTANT_MODEL_PROVIDER=cpa-channel-gateway
ASSISTANT_MODEL_PROTOCOL=responses
ASSISTANT_MODEL_STRUCTURED_OUTPUTS_MODE=off

ASSISTANT_RAG_API_BASE_URL=<RAG Render URL>
ASSISTANT_RAG_API_KEY=<与 RAG_PUBLIC_API_KEY 相同>
ASSISTANT_RAG_TIMEOUT_MS=3000

PUBLIC_ASSISTANT_REQUEST_TIMEOUT_MS=45000
PUBLIC_ASSISTANT_ANSWER_TIMEOUT_MS=20000
PUBLIC_ASSISTANT_MODEL_MAX_ATTEMPTS=1
PUBLIC_ASSISTANT_VISION_TIMEOUT_MS=12000
PUBLIC_ASSISTANT_DIRECT_MAX_OUTPUT_TOKENS=800
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

生产模型配置改为由 Render 服务端直接消费单租户 CPA Responses 网关。真实 base URL 和 client key 只写入 Render 环境变量，不进入仓库、浏览器变量、健康响应或验收记录；访客域名仍只承担站点与公开 API 入口。旧 Cloudflare model relay 代码和变量暂时保留为历史回滚边界，但不再是当前模型路径。

`DATABASE_URL` 不存 IP、账号、Cookie、hidden prompt、provider payload 或完整网页正文。原始 turn 最长保留 30 天，长期统计只保留 topic fingerprint 与计数。

`ASSISTANT_MODEL_STRUCTURED_OUTPUTS_MODE` 是服务端能力开关，生产默认保持 `off`。只有用一条获批的真实业务问题确认当前 CPA Responses 路径支持 JSON Schema 后，才可改为 `json-schema`；不做 endpoint、protocol 或模型目录探测。

当前已交付配置只启用精确模型 `free5/DeepSeek-V4-Flash`，不使用可能随 CPA 配置移动的别名。`PUBLIC_ASSISTANT_MODEL_MAX_ATTEMPTS=1` 保证一次真实问题的失败生成不会被自动重放；Planner 只使用主通道，Planner 失败后使用确定性 Planner。运行时保留的 `ASSISTANT_MODEL_FALLBACK_*` 能力在生产保持未配置，`free7-glm-5-2/glm-5-2` 仅作为未来需要重新批准的替代方案，不在同一次请求中自动切换。配置交付和健康边界已验证，非降级真实回答仍是独立产品门禁。

未来若启用备用链，必须先为新的精确模型和 failure domain 完成单独业务批准，再在 Render 填写完整的 `ASSISTANT_MODEL_FALLBACK_*`；这些值默认留空，不属于当前生产必填项。CPA 自己负责渠道互斥与忙碌隐藏，本站不通过自动重放绕过该约束。

图片问题最多携带一张浏览器端压缩后的 JPEG、PNG 或 WebP。Cloudflare 只对 `/chat/public`、`/chat/public/stream` 和固定模型 relay 放宽到 512 KB；历史、反馈和分支接口仍保持 32 KB。Render 校验 data URL、Base64、文件魔数和 256 KB 解码后上限，只用 SHA-256 digest 参与请求幂等，不保存原图。当前没有经过业务任务验证的视觉模型，因此 `ASSISTANT_VISION_MODEL` 留空：图片问题会准确提示图片理解暂不可用，不会让文本模型猜测图片内容。未来只有在一个已配置备用渠道中的视觉模型通过获批图片任务后才启用该变量。

MCP 不是图片能力本身，因此同一 Render 进程内不再增加一次 MCP 网络自调用。图片理解实现保留 typed tool 边界；只有未来其他产品需要复用时，才在这一边界外增加 MCP facade。

生产一次公开请求只允许一次最终回答生成尝试，并与 Planner、检索共享 `PUBLIC_ASSISTANT_REQUEST_TIMEOUT_MS` 的绝对截止时间。代码仍支持在独立、已批准的回滚环境中把上限显式设为 1 至 3，但当前 Blueprint 固定为 1。`/health` 只检查是否至少存在一套完整配置，不调用模型，也不返回通道数量、顺序、provider、model 或 endpoint。

`METRICS_ENABLED=false` 时 `/metrics` 不采集也不暴露。生产 scrape 目标、鉴权和告警接收方仍是人工 gate；`/health` 始终与指标开关独立。

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

AI Daily 的 CPA 切换使用一个新的 server-only runtime channel，并为 extractor/composer/verifier 各绑定一个精确的 `free5/DeepSeek-V4-Flash` candidate。该 channel 使用 `providerRef=cpa-gateway` 与 `failureDomainRef=cpa-free5`，显式标记 `reduced_redundancy`，不声明独立 fallback；真实 base URL 和 API key 只存在于 Render runtime JSON。旧 Free3 approval bundle 与这一 provider/failure-domain/model identity 不一致，不能复用。必须先生成并明确批准新的零调用 proposal/bundle，再更新 Secret File/hash；平台交付完成后，一次真实 Edition 仍需再次单独批准。

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
RAG_STORE_PROVIDER=supabase
RAG_DATABASE_URL=<公开助手 Supabase PostgreSQL server-only URL>
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

RAG 只接受 public scope。读取入口是 `/v1/retrieve`，版本化公开同步入口是 `/v1/sync/public`；旧通用同步入口不存在。`RAG_SYNC_TOKEN` 只用于发布流水线，公开助手服务只持有 `RAG_PUBLIC_API_KEY`。生产存储使用 Supabase pgvector；当前 4096 维 embedding 超过 pgvector `vector` ANN 索引的 2000 维上限，因此在当前小规模语料上使用精确余弦检索，不创建 HNSW/IVFFlat 索引。

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
2. 部署并验证 `biau-rag-orchestrator` public-only 代码与当时的公开 RAG 存储路径。
3. 部署 `biau-public-assistant-api`，运行 Prisma public persistence migrations。
4. 部署 `biau-content-studio-api`，确认 Studio/AI Daily migration 与 health 正常。
5. 部署 Cloudflare Pages，完成同源 SSE、feedback、public sync 和持久化验收。
6. 停止旧 Operator writer，运行 `scripts/operations/postgres/operator-retirement/preflight.sql`。
7. 只有在备份可恢复、数据库指纹和 allowlist 均经人工确认后，才运行 `apply.sql` 与 `verify.sql`。
8. 通过 public persistence、Studio 和 RAG smoke 后，最后人工删除 Render Operator 服务（已完成）。
9. 在独立观察窗口后，人工删除旧 internal Qdrant collection 与平台侧废弃变量（已完成；当前生产公开存储已迁移到 Supabase pgvector）。

破坏性 Operator SQL 不得放入 `prisma/migrations/`，因为 Render 启动会自动执行 Prisma migrations。完整操作见 `scripts/operations/postgres/operator-retirement/README.md`。

## 验证

```bash
npm run prisma:validate
npm run prisma:generate
npm run assistant:index
npm run assistant:public-agent-check
npm run assistant:public-model-check
npm run assistant:public-metrics-check
npm run assistant:public-quality-check
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
npm run cf-model-relay:check
npm run studio:smoke
npm run ai-daily:contracts-check
npm run ai-daily:production-readiness-check
npm run docs:deployment-check
npm run lint
npm run build
```

上述 deterministic checks 不得访问真实模型、搜索、embedding、reranker 或向量数据库供应商。

公开助手可靠性版本发布时只部署 `biau-public-assistant-api` 与匹配提交的 Cloudflare 静态站，不重启 Content Studio 或 RAG Orchestrator。先在 Render 原子更新 CPA base/key/model/provider，再手动部署 Public API；自动部署保持关闭，避免代码先于服务端凭据切换。部署后先请求 `/health`，这一动作不得调用模型；随后最多执行一条用户明确批准的真实业务问题，检查公开安全元数据并删除该临时匿名会话。结构化输出与生产 Prometheus scrape 仍分别受上述人工 gate 约束。

## 回滚

- SQL 退役前：回滚应用 revision 和当时的公开 RAG 存储配置即可。
- SQL 退役后：停止写入，把已验证的备份恢复到新数据库，再切换数据库 URL 与上一应用 revision；重新跑旧 migration 只能恢复空表结构，不能恢复数据。
- Studio/AI Daily 数据库从不进入 Operator 退役 allowlist。
- 模型中继无需数据库回滚；恢复 Render 上一组 model base/key/provider 并回滚 Cloudflare Pages deployment 即可。
- 观察窗口结束前保留备份、前一 revision 和旧 internal collection；窗口通过并删除旧 collection 后，继续按既定保留策略保存数据库备份与 revision 回滚证据。
