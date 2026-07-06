# 部署方案

## 当前线上地址

```text
https://biau.playlab.eu.cc
```

## 部署结论

当前站点部署在 Cloudflare Pages，并通过 GitHub `main` 分支自动更新。

推荐继续使用 Cloudflare Pages 的原因：

- 当前站点是 React + Vite 静态应用，生产产物是 `dist`，非常适合 Pages 的 GitHub 自动构建。
- 页面主要是官网展示、项目展示、案例中心和博客内容，不依赖常驻 Node 服务。
- Cloudflare Pages 自带 CDN、HTTPS、预览环境和回滚能力。
- `public/_redirects` 已加入，生产环境刷新 `/projects`、`/blog` 和详情页会回退到 `index.html`。

## Cloudflare Pages 配置

GitHub 仓库：

```text
git@github.com-bill:ciallo-bill/biau.git
```

Cloudflare Pages 项目配置：

```text
Framework preset: None
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: 留空
```

如果 Cloudflare 需要指定 Node 版本，建议使用：

```text
NODE_VERSION=22
```

前端如果要让公开助手优先走同域 Cloudflare Pages Functions，建议在 Cloudflare Pages 环境变量中增加：

```text
VITE_PUBLIC_ASSISTANT_API_BASE_URL=/api
VITE_INTERNAL_ASSISTANT_API_BASE_URL=https://biau-internal-assistant-api.onrender.com
```

公开助手前端也会在打开时自动探测同域 `/api/health`；如果 Functions 未部署或未配置模型，会使用本地公开知识回退。内部助手页面如需使用邀请码、数据库和管理能力，必须把 `VITE_INTERNAL_ASSISTANT_API_BASE_URL` 指向独立的 internal API。旧的 `VITE_CHAT_API_BASE_URL` 仍可作为兼容回退，但三服务部署不要只配置这一个变量，否则公开助手和内部管理页会误打到同一个服务。

Cloudflare Pages Functions 需要在 Pages 的运行时环境变量中配置模型通道：

```text
ASSISTANT_MODEL_BASE_URL=<OpenAI-compatible relay base URL, for example https://.../v1>
ASSISTANT_MODEL_API_KEY=<OpenAI 兼容中转 Key>
ASSISTANT_MODEL_NAME=glm-5.2
ASSISTANT_MODEL_PROVIDER=glm-compatible
```

这些变量只在 Pages Functions 服务端读取，不会进入浏览器 bundle。未配置 `ASSISTANT_MODEL_API_KEY` 时，`/api/chat/public` 会回退到公开知识摘要。

公开助手已经生成 V2 本地知识结构：`npm run assistant:index` 会写入 `server/data/public-knowledge.json` 和 `server/data/public-knowledge-v2.json`，后者包含 docs、chunks、entities、relations 和 fallback 检索配置。部署前可运行：

```text
npm run assistant:kg-check
```

这个检查只使用本地公开数据，不会调用真实模型或中转站。

外部 RAG Orchestrator 是最终形态的一部分，由单独的 Render 服务承载。Cloudflare Pages Functions 或公开助手 API 只保存 Orchestrator endpoint 和服务端 token，不直接连接 Qdrant、Supabase、模型中转或 embedding provider：

```text
ASSISTANT_RAG_API_BASE_URL=
ASSISTANT_RAG_API_KEY=
ASSISTANT_RAG_TIMEOUT_MS=3000
```

这些变量不能放进 `VITE_*`。最终推荐使用下面的 `biau-rag-orchestrator` 服务连接 Qdrant Cloud；如果暂时清空 `ASSISTANT_RAG_API_BASE_URL`，公开助手会退回本地公开知识，但这只是可靠性降级，不是最终目标架构。

部署后先检查 `https://<站点域名>/api/health`。它应该返回 JSON，并包含 `ok: true` 与 `mode` / `modelConfigured` 这类低敏状态；如果返回的是首页 HTML，或 `POST /api/chat/public` 返回 404/405，说明当前 Pages 部署没有把 `functions/` 目录发布为 Functions。此时单独增加模型 Key 不会生效，需要先确认 Cloudflare Pages 项目使用最新 `main` 提交重新构建，或用 Wrangler 部署时确认 Functions 一起上传。

## 助手后端与 RAG Orchestrator 部署

助手后端位于当前仓库的 `server/`，和静态前端独立部署。最终形态使用同一个 GitHub 仓库创建三个 Render Web Service，通过 `ASSISTANT_SERVICE_MODE` 明确运行边界：

```text
biau-public-assistant-api    ASSISTANT_SERVICE_MODE=public
biau-internal-assistant-api  ASSISTANT_SERVICE_MODE=internal
biau-rag-orchestrator        ASSISTANT_SERVICE_MODE=rag
```

这样可以复用同一套 TypeScript 类型、模型客户端、RAG contract 和测试，同时让公开接口、内部接口和检索服务拥有独立路由、密钥、日志、扩容和故障范围。不要把模型 key、RAG key、Qdrant key、Supabase service role、数据库 URL 或 admin token 放进 `VITE_*`。

Render 配置建议：

```text
Runtime: Node
Build Command: npm ci && npm run assistant:index && npm run prisma:generate && npm run server:build
Start Command:
  public/rag: npm run server:start
  internal: npm run prisma:migrate && npm run server:start
```

仓库根目录提供了 `render.yaml` Blueprint，可直接作为三服务配置参考；其中所有真实密钥、数据库 URL 和 provider endpoint 都使用 `sync: false`，需要在 Render 后台手动填写。

### Public Assistant API

```text
ASSISTANT_SERVICE_MODE=public
CORS_ORIGIN=https://biau.playlab.eu.cc
ASSISTANT_MODEL_BASE_URL=<OpenAI-compatible relay base URL, for example https://.../v1>
ASSISTANT_MODEL_API_KEY=<OpenAI 兼容中转 Key，可留空使用公开知识回退>
ASSISTANT_MODEL_NAME=<mimo 或其他 OpenAI-compatible 模型名>
ASSISTANT_MODEL_PROVIDER=mimo-compatible
ASSISTANT_RAG_API_BASE_URL=<biau-rag-orchestrator 的 Render URL>
ASSISTANT_RAG_API_KEY=<只允许 public scope 的 RAG key>
ASSISTANT_RAG_TIMEOUT_MS=3000
METRICS_ENABLED=false
PORT=10000
```

公开助手的模型接入点在服务端，不在前端。前端只配置 `VITE_PUBLIC_ASSISTANT_API_BASE_URL` 指向公开助手 API 或同域 `/api` facade，`VITE_INTERNAL_ASSISTANT_API_BASE_URL` 指向内部助手 API；真实模型 Key、Base URL 和模型名只放在 Render / Cloudflare Pages Functions / 本地 `.env.local` 等私有环境里。`ASSISTANT_MODEL_BASE_URL` 推荐填写 `/v1` base URL，也可以填写完整 `/chat/completions` endpoint。旧的 `OPENAI_BASE_URL`、`OPENAI_API_KEY`、`OPENAI_MODEL` 仍兼容，但新部署建议统一使用 `ASSISTANT_MODEL_*`。

### Internal Assistant API

```text
ASSISTANT_SERVICE_MODE=internal
CORS_ORIGIN=https://biau.playlab.eu.cc
DATABASE_URL=<内部助手成员/会话/邀请码数据库 URL>
ADMIN_TOKEN=<生成一个长随机字符串>
ASSISTANT_MODEL_BASE_URL=<OpenAI-compatible relay base URL, for example https://.../v1>
ASSISTANT_MODEL_API_KEY=<OpenAI 兼容中转 Key>
ASSISTANT_MODEL_NAME=<mimo 或其他 OpenAI-compatible 模型名>
ASSISTANT_MODEL_PROVIDER=mimo-compatible
ASSISTANT_MODEL_CHANNELS_JSON=<可选，内部成员专用多渠道 JSON>
ASSISTANT_RAG_API_BASE_URL=<biau-rag-orchestrator 的 Render URL>
ASSISTANT_RAG_API_KEY=<只允许 internal scope 的 RAG key>
RAG_SYNC_TOKEN=<内部知识同步到 RAG Orchestrator 的服务端 token>
ASSISTANT_RAG_TIMEOUT_MS=3000
METRICS_ENABLED=false
PORT=10000
```

如果使用 Supabase Postgres / Supavisor pooler 作为内部助手数据库，`DATABASE_URL` 建议使用 Session pooler URI，并在 query 参数里显式加上 Prisma 7 / `@prisma/adapter-pg` 兼容参数：

```text
?sslmode=require&uselibpqcompat=true
```

如果连接串已经有其他参数，用 `&` 追加。缺少 `uselibpqcompat=true` 时，Render 上可能在创建邀请码或读写会话时出现 `P1011` / `self-signed certificate in certificate chain`。

内部助手支持给不同成员分配不同模型渠道。推荐把 `ASSISTANT_MODEL_*`
作为默认/兜底通道，再用 `ASSISTANT_MODEL_CHANNELS_JSON` 定义可分配渠道：

```json
[
  {
    "id": "mimo",
    "label": "Mimo member channel",
    "provider": "mimo-compatible",
    "baseUrl": "<OpenAI-compatible relay base URL>",
    "apiKey": "<server-only key>",
    "model": "mimo-chat"
  },
  {
    "id": "deepseek",
    "label": "DeepSeek review channel",
    "provider": "deepseek-compatible",
    "baseUrl": "<OpenAI-compatible relay base URL>",
    "apiKey": "<server-only key>",
    "model": "deepseek-ai/deepseek-v4-pro"
  }
]
```

成员表只保存 `modelChannelId`；`/assistant/admin` 只展示渠道
`id/label/provider/model/configured`，不会展示 `apiKey` 或 `baseUrl`。如果成员未分配渠道或渠道不存在，内部聊天会回到默认通道；如果默认通道也未配置，则使用本地 fallback。

`/assistant/admin` 的内部知识源管理会把 `REVIEWED` / `ACTIVE` 文档作为 internal corpus 同步计划提交给 RAG Orchestrator。真实同步需要 Internal Assistant API 和 RAG Orchestrator 配置相同的 `RAG_SYNC_TOKEN`；未配置时只会记录低敏 `SKIPPED` 同步运行，不会把文档或 token 暴露给浏览器。

### RAG Orchestrator

```text
ASSISTANT_SERVICE_MODE=rag
RAG_STORE_PROVIDER=qdrant
QDRANT_URL=<Qdrant Cloud HTTPS endpoint>
QDRANT_API_KEY=<Qdrant API key>
QDRANT_PUBLIC_COLLECTION=biau_public_chunks
QDRANT_INTERNAL_COLLECTION=biau_internal_chunks
RAG_PUBLIC_API_KEY=<公开助手调用 retrieve 的服务端 token>
RAG_INTERNAL_API_KEY=<内部助手调用 retrieve 的服务端 token>
RAG_SYNC_TOKEN=<同步 public knowledge / internal corpus 到 Qdrant 的服务端 token>
EMBEDDING_BASE_URL=<OpenAI-compatible embedding /v1 base URL>
EMBEDDING_API_KEY=<embedding key>
EMBEDDING_MODEL=qwen3-embedding-8b
EMBEDDING_DIMENSION=4096
EMBEDDING_TIMEOUT_MS=20000
RERANKER_BASE_URL=<可选 reranker base URL>
RERANKER_API_KEY=<可选 reranker key>
RERANKER_MODEL=<可选 reranker model>
METRICS_ENABLED=false
PORT=10000
```

Qdrant collection 已按最终向量路径创建：

```text
biau_public_chunks    4096 / Cosine
biau_internal_chunks  4096 / Cosine
```

`QDRANT_URL`、`QDRANT_API_KEY`、embedding key 和 RAG token 只放在 Render 的 `biau-rag-orchestrator` 环境变量中。Supabase / Postgres 仍可用于内部助手的成员、会话、邀请码和管理数据；它不再是最终向量检索主路径。

本地后端开发：

```bash
npm run assistant:index
npm run prisma:validate
npm run prisma:generate
npm run server:dev
```

生产数据库迁移：

```bash
npm run prisma:migrate
```

### 邀请码初始化

管理员用 `ADMIN_TOKEN` 创建邀请码：

```bash
curl -X POST "$ASSISTANT_API/admin/invites" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"BIAU-PORT-ALPHA","label":"Alpha member","role":"MEMBER","dailyQuota":24,"maxUses":1}'
```

内部成员用邀请码兑换成员 token：

```bash
curl -X POST "$ASSISTANT_API/auth/redeem-invite" \
  -H "Content-Type: application/json" \
  -d '{"code":"BIAU-PORT-ALPHA","name":"成员名称"}'
```

前端内部助手第一版在 `/assistant` 提供邀请码兑换表单。兑换成功后会把 `biau-assistant-member-token`、基础成员信息和当前 `biau-assistant-session-id` 保存在当前浏览器的 `localStorage`。未配置 API、未兑换 token、数据库不可用或模型服务不可用时，页面会退回到已脱敏的公开站点知识，并明确说明限制。

隐藏管理页位于 `/assistant/admin`。第一版通过手动输入并本地保存 `ADMIN_TOKEN` 调用 `GET /admin/summary` 和 `POST /admin/invites`，只用于验证轻量管理链路，不包含完整成员列表、历史记录浏览、删除/禁用、导出或私有知识源管理。

当前公开助手和内部助手会先检索生成的公开站点知识；公开助手本地检索使用 docs/chunks/entities/relations 组成的轻量 Agentic Hybrid RAG 基线，覆盖意图路由、关键词/元数据/实体扩展、确定性 rerank 和 citation 边界。配置 `ASSISTANT_MODEL_*` 后，服务端可以在公开知识约束内调用 OpenAI-compatible 模型生成回答。未配置模型、模型服务不可用或公开知识置信度不足时，助手应回退到公开知识摘要并明确说明限制，而不是补造细节。网站博客页和项目页内容后续可以继续优化。

### API 健康检查

```bash
curl "$ASSISTANT_API/health"
```

最小接口包括：

```text
GET /health
POST /auth/redeem-invite
POST /chat/public
POST /chat/internal
GET /admin/summary
POST /admin/invites
GET /metrics
```

`/metrics` 默认关闭。只有设置 `METRICS_ENABLED=true` 后才输出 Prometheus text 格式指标；未开启时返回 `404 { "error": "metrics-disabled" }`。不要在没有访问控制或 scrape 计划的情况下把生产指标公开给第三方，后续 Prometheus / Grafana / ARMS 路线见 `docs/observability-strategy.md`。

## 自定义域名

当前绑定域名：

```text
biau.playlab.eu.cc
```

域名已在 Cloudflare Pages 的 `Custom domains` 中绑定，线上访问地址为：

```text
https://biau.playlab.eu.cc
```

## 自动更新流程

以后每次修改站点后，在本地执行：

```bash
npm run lint
npm run build
git add .
git commit -m "Update site"
git push
```

推送到 GitHub 的 `main` 分支后，Cloudflare Pages 会自动触发构建并更新线上站点。

## 如果 GitHub 已更新但线上还是旧版本

本地确认方式：

```bash
git log --oneline -3
git ls-remote origin refs/heads/main
```

如果两边都能看到最新 commit，但线上页面仍加载旧的 `/assets/index-*.js`，优先检查 Cloudflare Pages 后台：

- `Deployments` 是否出现最新 commit。
- 最新部署是否成功。
- `Production branch` 是否仍是 `main`。
- `Root directory` 是否留空。
- `Build command` 是否为 `npm run build`。
- `Build output directory` 是否为 `dist`。

如果没有出现最新部署，可以在 Cloudflare Pages 项目中手动点击 `Retry deployment` 或 `Create deployment`。

## 手动部署备用方案

如果 Git 集成暂时没有触发，可以用 Wrangler 直接上传本地构建产物。首次使用需要在本机登录 Cloudflare：

```bash
npx wrangler login
```

确认登录状态：

```bash
npx wrangler whoami
```

构建并部署：

```bash
npm run build
npx wrangler pages deploy dist --project-name=biau
```

如果 Cloudflare Pages 项目名不是 `biau`，把 `--project-name` 改成 Pages 后台显示的项目名。

## hidencloud 适用场景

hidencloud 当前更适合作为桌宠项目的公开 API、社区数据和生成代理层，而不是第一版静态官网的主托管入口。

适合放到 hidencloud 的内容：

- 桌宠社区 API
- 生成任务、审核、发布等后端接口
- 需要和桌宠 App 同域或同服务编排的页面
- 未来官网中需要读取真实社区数据的接口代理

不建议第一版官网直接放到 hidencloud 的原因：

- 静态官网不需要常驻服务，放在 Pages 更简单。
- hidencloud 已经承担社区 API 和生成代理职责，继续叠加官网静态托管会增加运维耦合。
- 官网内容更新更适合走 GitHub -> Cloudflare Pages 的自动部署链路。

## 线上检查记录

线上站点健康检查已固化为脚本：

```bash
npm run site:monitor
```

默认会检查以下核心路径返回状态、HTML SEO 基础信息、`sitemap.xml` 和 `robots.txt`：

```text
https://biau.playlab.eu.cc/
https://biau.playlab.eu.cc/projects
https://biau.playlab.eu.cc/blog
https://biau.playlab.eu.cc/assistant
https://biau.playlab.eu.cc/projects/legal-rag
https://biau.playlab.eu.cc/projects/ozon-erp
https://biau.playlab.eu.cc/projects/biau-playlab
https://biau.playlab.eu.cc/projects/xunqiu
https://biau.playlab.eu.cc/blog/legal-rag-review
https://biau.playlab.eu.cc/sitemap.xml
https://biau.playlab.eu.cc/robots.txt
```

如需检查预览环境或外链：

```bash
npm run site:monitor -- --base https://<preview-domain>
npm run site:monitor -- --check-links
npm run site:monitor -- --check-external
```

访问人数、来源、热门页面、搜索曝光和事件统计查看方式见 `docs/site-monitoring.md`。
