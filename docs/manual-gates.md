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
- 不执行 ping、doctor、空 prompt 或逐模型测活；每次新的生产端到端业务请求都必须单独获得明确批准，并在完成后删除临时会话。
- 2026-08-04 relay 诊断 revision `87210661` 已在 Cloudflare Pages 与 Render 进入生产；确定性检查、Render/Cloudflare health 与无认证 relay `401` 边界均通过。
- 2026-08-12 已在 `207a5fe6` 上执行一次获批的站点业务问题：HTTP `200`，约 9.3 秒后以 `degraded/fallback` 结束，三次有界尝试的公开失败类别为 `upstream`；会话持久化与引用访问通过，但检索错误偏向 Legal RAG，未覆盖知航自身事实。根因是 Render Public API 缺少模型 base 环境配置，服务回退到不兼容的默认 upstream，而不是已经证明的供应商持续 `5xx`。
- 模型 base 配置已补齐并重新部署；`/health` 与已认证非法模型请求的 `400` 合同通过，均未触达模型上游。仓库同时新增知航专属知识、别名、实体关系、排序权重和离线回归用例；`fdd733a8` 已部署到 Cloudflare Pages、Public API 与 RAG Orchestrator，版本化 Public RAG sync 成功，Supabase pgvector 的 vector/keyword/reranker readiness 全部通过，知识规模为 31 documents / 61 chunks / 166 entities / 231 relations。
- `d1ec7adb` 已完成 Cloudflare Pages、Public API 与 RAG Orchestrator 全链生产部署。生产纯检索对同一知航问题返回 `site:public-assistant` 为第一引用，`candidateCount=60`、`citationCount=8`、`expandedEntityCount=47`，实际 reranker 模式为 `deterministic`，证明远端融合顺序修复生效。
- 第二次获批业务验收已执行浏览器断网恢复：首次 stream 在到达 API 前被拦截，恢复后由用户动作显式重试，同一问题只到达 API 一次。最终生成仍以 `degraded` 结束；旧日志只能给出 `public_api + 5xx`，不能据此猜测或修改 streaming/input 协议。临时会话及其 turn/request 已删除。
- `65c8af15` 已部署新的低敏 relay 来源归因。第三次获批业务验收只产生 1 个站点 Request，检索正确返回 4 条站内证据和 3 条知航相关引用，但生成仍为 `degraded`。Render recovery 明确为 `relay_edge + 5xx`；Cloudflare zone 在同一时间窗记录 3 个 relay 动态 `502`，同秒 Pages Functions 为 success、0 error、0 upstream subrequest，未登记到模型上游。
- Render relay base 已从访客自定义域切换为稳定 `https://biau.pages.dev/api/model-relay`，对应配置部署已 live。该 Pages 域的未认证请求可到达 Function 并返回固定来源头，检查不触达模型。
- 第四次获批业务验收已在稳定 Pages relay base 上完成：只产生 1 个站点 Request，检索返回 4 条站内证据和 3 条已核验引用；桌面刷新、手机 390px 无溢出、会话删除和恢复观察通过。最终仍为 `degraded/upstream`，Cloudflare 精确窗口显示 `scriptThrewException(errors=3, subrequests=3)` 与 `502/responseDisconnect`，低敏归因为 relay upstream transport；完整模型回答仍未通过。
- 本地获批古诗任务只证明候选主渠道曾成功生成，不能替代站点产品验收；生产端仍保持“产品待验收”。
- 回滚只恢复上一组 Render model 变量和上一 Cloudflare Pages deployment，不需要数据库迁移或回滚。

### Model and multimodal rollout

- [x] Cloudflare 主上游 Secret 已更新，`MODEL_RELAY_ALLOWED_MODELS` 已收缩为单个已验证模型；不要把 URL 或 key 写入仓库和截图。
- [x] Render public service 的主模型变量已更新；旧 fallback 模型和视觉模型变量已删除。
- [x] Cloudflare Pages、Render Public API 与 RAG Orchestrator 已部署提交 `65c8af15`；`/health`、纯检索和不触达上游的 relay 请求合同通过，Render relay base 已切换到稳定 Pages 域。
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

生产权限加固已于 2026-07-26 完成。仓库未使用浏览器端 Supabase client，应用通过服务端 Prisma 直连数据库；最近 API 日志也没有站点 `/rest/v1` 数据访问。2026-08-12 只读复核发现后续迁移新增的 `PublicAssistantRequest`、`PublicAssistantAnswerRevision`、`PublicAssistantBranch` 尚未启用 RLS，原“全部启用”结论已漂移。

- 既有 25 张 `public` 表已启用 RLS；上述 3 张后续新增表需要独立迁移补齐。
- `anon` / `authenticated` 已失去 public schema、table、sequence 与 function 权限。
- `postgres` 创建未来 public 对象时不再自动授予 Data API 权限。
- 两个 AI Daily 审计触发器函数已固定 `search_path` 并撤销公开执行。
- Public、Studio 与 RAG 健康检查通过，受保护数据计数未变化。

当前只读 grants 查询确认 `anon` / `authenticated` 对这 3 张表仍无 table privilege，因此没有形成 Data API 公开读取；但 RLS 漂移必须作为 defense-in-depth 缺口处理。不要直接在线执行 `ALTER TABLE`：先新建独立 Trellis 任务，补 migration、验证 Prisma 服务路径、运行 advisor 并准备回滚。未来如果引入 Supabase REST、GraphQL、Realtime、Edge Function 或浏览器/mobile client，仍必须按最小权限恢复 schema/object grant 并设计逐表 RLS policy。完整 runbook 位于 `scripts/operations/postgres/data-api-hardening/README.md`。

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

2026-08-12 已完成首个真实 Edition 的一次获批同 Edition 重跑。Issue `cmspekr1d000044bmbbnjin5u` 的最新 Run `cmspkl33d000045c7w21irnvy` 以 `COMPLETED_WITH_GAPS` 结束，`attemptNumber=3`；Revision 2 的 `promptVersion=ai-daily-prompt-v3` 仍为 `validationStatus=REJECTED` / `applyState=DISCARDED`，唯一 critical finding 为 `extractor-schema-or-provider-failure`。未创建 draft，未执行 Studio review、Publish Export、部署或公开 Feed。

2026-08-12 已部署实质性生产修复提交 `2566ac15`。修复将 AI Daily 三角色 provider 统一到共享 Responses 边界，并为 extractor/composer/verifier 发送 `text.format.type=json_schema`、`strict=true` 的角色专属 strict schema；`aiDailyGenerationPromptVersion` 已升级为 `ai-daily-prompt-v4`，旧 approval bundle 不再适用。离线 runtime/provider/composition/26 项合同、server build、lint、Vite build 与 rollback sealed check 全部通过，均为零 provider/network 调用。Render `/health` 已返回 `200`，Studio 未授权返回 `401 missing-studio-token`，公开 Feed 路由保持关闭。新的 approval bundle、Render Secret File/hash、Studio 二次确认和真实版次仍未完成，因此不得继续真实调用。

2026-08-13 已完成第二层生产修复与控制面交付：静态 selection proposal/bundle 升级为 v2，绑定 `ai-daily-prompt-v4` 与 `ai-daily-generation-v2`；旧 v1 approved bundle 已保留为 Render Secret File 备份，稳定挂载名已更新为 v2，`AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH` 与文件 canonical hash 一致。Studio runtime 的旧 relay 形状已对齐到 Public Assistant 已验证的稳定 relay 配置，Responses、`grok-4.5` 和三角色映射保持不变；手动部署 `dep-d9uad07avr4c73es6n6g` live，delivery check `networkCalls=0` 通过，health/database/auth、未授权 Studio `401 missing-studio-token`、Feed `404` 和 error-level 日志检查均通过。generation、business evaluation、public Feed 仍关闭，Cron 未创建。

同日唯一获批的真实同-Edition Run 为 `cmsqbkgxj000045feldx76y59`，work item `cmsqbkgzm000145fe5o29i6qo`，attempt 4，最终 `COMPLETED_WITH_GAPS`；EXTRACT_FACTS checkpoint 使用 v2 schema，唯一 extractor attempt 为 `calls=1 / provider_auth`，不是 schema rejection。VALIDATE/DRAFT checkpoint 已落库，Revision 3 使用 `promptVersion=ai-daily-prompt-v4`、`schemaVersion=ai-daily-generation-v2`、8 个 citation snapshot，但仍 `REJECTED` / `DISCARDED`、未创建 draft。Run 终态后 generation 已立即恢复 `false`，关闭部署 `dep-d9ua6dnlk1mc73ftror0` live。该结果证明 Structured Outputs 生产路径已被执行，但上游认证仍是当前阻断；不得把它写成生成成功，也不得在没有新的明确业务批准前再次调用。

rollback evidence `tidebrief-rollback-2026-08-12` 已封存，custom-format 数据库 dump 已完成独立恢复验证，上一 Render revision 和 19 条 migration 已记录；强校验 `npm.cmd run ai-daily:rollback -- check --require-sealed` 已通过。该 manifest 保留既有 acceptance binding，不代表最新 Run 已完成最终 acceptance seal。当前 `AI_DAILY_PRODUCTION_GENERATION_ENABLED=false`、`AI_DAILY_PUBLIC_FEED_ENABLED=false`、`AI_DAILY_BUSINESS_EVALUATION_ENABLED=false`，Cron 未创建。潮讯保持“待验收”，不得把 `COMPLETED_WITH_GAPS` 或 `REJECTED` 写成生产成功；除非完成新的实质性修复并重新获得批准，不得继续真实调用。

最新获批 Run `cmsqdx5bp000045j2q7rh3mxj`（work item `cmsqdx5ce000145j28q2avapi`）仍以 `COMPLETED_WITH_GAPS` 结束；Revision 4 为 `REJECTED` / `DISCARDED`，保留 8 个 citation snapshot，但没有 draft 或公共内容。Cloudflare 匹配请求约 8 秒后返回固定 `model-relay-upstream-unreachable` 错误包，根因收敛为原 relay 渠道的上游传输异常。站点所有 generation、business evaluation、public Feed 开关仍为 `false`，Cron 未创建。

用户已授权优先使用本地私有配置中的稳定 `Free3` Responses 渠道。生产修复使用独立 `/api/model-relay/free3/responses` 固定出口和独立 Cloudflare Secret，不覆盖主/旧 fallback；AI Daily runtime 只绑定 `providerRef=free3-relay`、`failureDomainRef=free3-channel` 与 `grok-4.5`，不声明自动 fallback，继续标记 `reduced_redundancy`。这项“优先使用”授权只批准渠道选择和修复部署，不批准真实 Edition。由于 runtime identity 已改变，旧 proposal/bundle 和旧真实调用批准均不可复用；必须在新 proposal hash、bundle hash 和部署验证完成后再次取得明确批准。

Free3 修复提交 `2ccd44c8` 已推送 `main`。Cloudflare Pages production deployment `adcc0f4b-675f-4531-af08-10c66259fe8c` 已 active，两项 Free3 专用 Secret 均显示为 encrypted；新路由无认证请求返回 `401 model-relay-unauthorized` 和 `X-BIAU-Relay-Origin=pages_function`。本地 Python HTTP 栈的已认证非法模型补验被 Cloudflare edge 以无 Function 来源头的纯文本 `403` 提前拦截，因此不把生产 `400` 写成已通过；确定性 relay fixture 已证明非法模型在 fetch 前返回 `400`。上述请求都未触达 Free3 上游，也不是模型调用。

Studio deploy `dep-d9umcqtbedkc73aijrg0` 已在相同 commit 上 live：`/health=200` 且 database/auth ready，未授权 workspace 为 `401 missing-studio-token`，public Feed 为 `404`，部署窗口无 error-level 日志。控制面复核确认 generation、business evaluation、public Feed 均为 `false`，Cron 未创建。新的零调用 static proposal 为 `ai-daily-free3-grok45-static-v2`，hash `708108cf06ea92d1e9cf8f8d15441e36134ee5d465695e4e2cac840b5f11c740`；三角色分别绑定 `extractor-free3-grok45`、`composer-free3-grok45`、`verifier-free3-grok45`，模型均为 `grok-4.5`，状态 `pending / reduced_redundancy`，artifact 不保留 endpoint/token。下一步必须明确批准这个 proposal hash 后才能生成 bundle 并更新 Render runtime/Secret File/hash；真实 Edition 仍需再单独批准。

2026-08-13 Free3 控制面交付已完成：已明确批准 proposal hash `708108cf06ea92d1e9cf8f8d15441e36134ee5d465695e4e2cac840b5f11c740` 并生成 bundle hash `45d9c5c272a81a415a2085b06d7a51706fd5b186f240cfd0689d04460d551097`。Render Studio 的旧稳定 Secret File 已先备份为 `ai-daily-model-approval.pre-free3.json`，备份与旧稳定文件 hash 一致；稳定文件读回 hash 与批准 bundle canonical hash 一致。`AI_DAILY_MODEL_RUNTIME_JSON` 已切换到唯一 Free3 channel（1 channel / 3 candidates / 1 failure domain），`AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH` 已匹配。手动部署 `dep-d9un2fr7uimc73a5jru0` 已 `live`；离线 delivery check `networkCalls=0` 通过，`/health=200`、数据库/鉴权 ready、未授权 workspace `401 missing-studio-token`、public Feed `404`。generation、business evaluation、public Feed 仍为 `false`，Cron 未创建。Free3 目录中的其他模型只记录为后续候选，未加入本 bundle、未逐模型探测；真实 Edition 仍需单独的明确批准。

同日站点所有者已单独批准一次真实 Edition。generation-only 开启部署 `dep-d9unlkbm8hqs73d61vsg` 达到 `live` 后，受保护 Studio 入口对 Issue `cmspekr1d000044bmbbnjin5u` 返回 `202`，创建 Run `cmsr90vqu000046fzfdgspjkj` 与 work item `cmsr90vri000146fzlysb418a`。该 Run 使用与 Free3 bundle 一致的 `ai-daily-generation-runner-45d9c5c272a8`，attempt 6 终态为 `COMPLETED_WITH_GAPS`；低敏 `EXTRACT_FACTS` checkpoint 显示 `extractor-free3-grok45` 仅调用 1 次，结果为 `failed / provider_upstream_error`，未进入 composer/verifier。Revision 5 `cmsr90wto000846fzt0poz90p` 为 `REJECTED` / `DISCARDED`，保留 8 个 citation snapshot、0 个内容块，没有 draft 或公共投影。终态后 generation 已立即恢复 `false`，关闭部署 `dep-d9unt33ncjis73a3f260` 达到 `live`；business evaluation 与 public Feed 仍为 `false`，Feed 为 `404`，Cron 仍未创建。未执行 Studio review、Publish Export、内容部署或发布。不得把本次结果写成生成成功；下一次真实 Edition 必须先完成新的实质性上游修复、重新交付控制面并再次取得明确批准。

低敏归因进一步确认失败发生在 schema 校验之前：Free3 私有 base 是标准 HTTPS `/v1` 形状，relay 解析结果为 `/v1/responses`，因此未发现路径拼接缺陷；当前批准 runtime 经 Cloudflare relay 收到受限的 upstream `5xx` 分类。下一项实质修复将移除这段失败传输：Studio 直接绑定同一 Free3 `/v1` Responses 渠道，同时继续使用 `failureDomainRef=free3-channel`、`grok-4.5` 和 `reduced_redundancy`。零调用 pending proposal `ai-daily-free3-direct-grok45-static-v2` 的 hash 为 `a8c67352428362606858ab4619d1b43ae0166692669d3d877302534a1e425bd9`，三角色 candidate 为 `extractor-free3-direct-grok45`、`composer-free3-direct-grok45`、`verifier-free3-direct-grok45`；runtime check 明确 `externalProviderCalls=0`，26 项合同、人工门禁与部署契约均通过。由于 `providerRef` 改为 `free3-direct`，旧 relay bundle 不可复用；必须先明确批准该 proposal hash，之后才能生成 bundle 和更新 Render。真实 Edition 仍需在交付验证完成后另行明确批准。

同日站点所有者已明确批准上述 direct proposal，生成 bundle hash `09b6b5438edf4b548e2a780633460119fc395eca85e641ee8aef7431b9cee23b`，审批过程 `modelCalls=0`。Render 更新遵循 backup-first：旧稳定 Secret File 已复制为 `ai-daily-model-approval.pre-free3-direct.json`，回读保持旧 bundle hash `45d9c5c272a81a415a2085b06d7a51706fd5b186f240cfd0689d04460d551097`；稳定文件与 `AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH` 现均匹配 direct bundle。runtime 回读为 1 channel / 3 candidates / 1 failure domain，`providerRef=free3-direct`、`failureDomainRef=free3-channel`，三角色 candidate 均为已批准的 `*-free3-direct-grok45`。手动部署 `dep-d9uqiu2jobas73bglrc0` 已 `live`；离线 delivery check `networkCalls=0`，`/health=200` 且 database/auth ready，未授权 workspace 为 `401 missing-studio-token`，public Feed 为 `404`，部署窗口无 error-level 日志，Render Cron 数量为 0。generation、business evaluation、public Feed 均保持 `false`。本次没有调用模型或执行真实 Edition；下一次真实 Edition 必须再次获得单独明确批准。

随后站点所有者单独批准一次 direct Free3 真实 Edition。generation-only 部署 `dep-d9ur79vqj5pc738add90` live 后，Studio 入口只提交一次 `202`，创建 Run `cmsrh9d5c000049jurscxa7oe` / work item `cmsrh9d5w000149ju71mluavn`。Run attempt 7 以 `COMPLETED_WITH_GAPS` 结束，并完成 `EXTRACT_FACTS`、`COMPOSE`、`VALIDATE`、`DRAFT` checkpoint；Revision 6 `cmsrhemt1000a49ju7jvqnat7` 为 `REJECTED` / `DISCARDED`，critical finding 为 `composer-schema-or-provider-failure`，保留 8 个 citation snapshot、0 个内容块且无 draft。该结果证明 direct transport 已越过原 relay upstream 阻断，但 composer/provider Structured Outputs 兼容性仍未通过。generation 立即恢复为 `false`，关闭部署 `dep-d9urbhvqj5pc738ams4g` 已 live；`/health=200`、workspace production generation=`disabled`、public Feed=`404`、error-level 日志为 0，business evaluation/public Feed 仍关闭，Cron 未创建。未执行 Studio review、Publish Export、内容部署或公开发布。下一次真实 Edition 必须先完成新的实质性 composer/provider 修复并重新获得明确批准。

2026-08-16 已完成 CPA 侧的零调用切换准备：Public API 的待交付主模型为精确 `free5/DeepSeek-V4-Flash`，生产 `PUBLIC_ASSISTANT_MODEL_MAX_ATTEMPTS=1`，真实 CPA base/key 仍只放 Render server-only 环境。AI Daily proposal `ai-daily-cpa-deepseek-v4-flash-static-v1` 的 hash 为 `508e23df7a6b53f7aee74fee6845fc5686f2b5988208e1a745be3868cefbb263`，三角色统一 `providerRef=cpa-gateway`、`failureDomainRef=cpa-free5`；站点所有者已明确批准并生成 bundle hash `4fa08db8374bef1e8bdc485ad626a69b3765da6efdbda6a8f7253aaa24a70248`，命令确认 `modelCalls=0`。Render 读回仍是旧 Public API/Free3 Studio 配置，新 runtime、Secret File 和 hash 尚未交付；不得把本地 bundle 当成生产可用，也不得在本门禁前发起真实模型请求。

### 1. 后续真实版次

- 先完成 composer/provider Structured Outputs 兼容性等实质性生产修复并部署，再重新取得明确业务批准。
- 不以重试、ping、doctor、空 prompt 或其他测活替代真实业务修复和批准。
- production generation、business evaluation、Cron 与 public feed 保持关闭。
- 不临时修改 Web Service Start Command。

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
