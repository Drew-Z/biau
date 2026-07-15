# BIAU Port 部署说明

本文描述当前最终部署边界。仓库中只记录变量名、职责和验证方法；真实 token、数据库 URL、模型地址、Cloudflare Access 配置值和私有域名只保存在对应平台。

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
VITE_ANALYTICS_PROVIDER=<可选：umami | plausible | debug>
```

Operator 浏览器地址固定为同源 `/api/operator/*`，不需要 `VITE_OPERATOR_*`。不要把任何 token 写进 `VITE_*`。

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
Start Command: npm run server:start
```

```text
ASSISTANT_SERVICE_MODE=public
CORS_ORIGIN=<站点公开 origin>
ASSISTANT_MODEL_BASE_URL=<server-only OpenAI-compatible base>
ASSISTANT_MODEL_API_KEY=<server-only key>
ASSISTANT_MODEL_NAME=<model id>
ASSISTANT_MODEL_PROVIDER=<safe provider label>
ASSISTANT_RAG_API_BASE_URL=<RAG Orchestrator base>
ASSISTANT_RAG_API_KEY=<RAG_PUBLIC_API_KEY 对应值>
ASSISTANT_RAG_TIMEOUT_MS=3000
```

公开助手无模型或 RAG 不可用时保留公开知识 fallback，不需要 Operator 数据库。

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
STUDIO_DATABASE_URL=<与 biau-operator-api 相同的 Studio 数据库 URL>
STUDIO_ADMIN_TOKEN=<编辑和审核 token>
```

Studio 模式只挂载 `/health` 和 `/studio/api/*`，不挂载聊天、Operator 或 RAG 路由。

### 4. RAG Orchestrator

服务名：`biau-rag-orchestrator`

```text
Build Command: npm ci && npm run assistant:index && npm run prisma:generate && npm run server:build
Start Command: npm run server:start
```

```text
ASSISTANT_SERVICE_MODE=rag
RAG_STORE_PROVIDER=qdrant
QDRANT_URL=<Qdrant URL>
QDRANT_API_KEY=<Qdrant key>
QDRANT_PUBLIC_COLLECTION=biau_public_chunks
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
```

当前 Qdrant `internal` scope 表示 owner/private 站务知识的检索隔离层，不代表成员制产品。公开助手只能使用 public key/scope，Operator 使用 internal key/scope。

## Owner 数据迁移

旧成员制数据不会整体迁入 Operator。只迁移用户明确确认属于站长、状态为 `ACTIVE` 的长期记忆：

```powershell
npm.cmd run operator:memory-migration:check
npm.cmd run operator:memory-migration:apply -- --ids <approved-record-ids>
```

先保存脱敏 check 报告并人工确认记录 ID，再运行 apply。普通聊天、邀请码、成员、成员模型分配、成员用量和不确定记录都不迁移。生产迁移完成前保留数据库备份与上一 Render revision。

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
npm.cmd run assistant:service-modes-smoke
npm.cmd run server:smoke
npm.cmd run docs:deployment-check
npm.cmd run lint
npm.cmd run build
```

生产人工验收只使用真实站务任务，不发送 ping、doctor、空 prompt 或模型测活请求。验收记录只保留 HTTP 状态、低敏错误类别、工具结果和是否生成待审核草稿，不记录正文、token、模型端点或数据库信息。
