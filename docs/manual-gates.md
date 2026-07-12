# Manual Gates Ledger

这份总账记录 BIAU Port / 泊岸主站和关联项目中必须由人确认的事项。它只描述公开安全的操作边界、推荐证据和下一步，不保存真实 token、数据库连接串、后台地址、模型中转站、账号密码、签名路径或生产指标。

相关文档：

- [可观测性策略](./observability-strategy.md)
- [站点监察与访问数据](./site-monitoring.md)
- [Studio / AI Daily 生产就绪记录](./studio-ai-daily-production-readiness.md)
- [Internal RAG / Studio / AI Daily 验收手册](./internal-rag-studio-ai-daily-runbook.md)
- [部署说明](./deployment.md)

## 使用规则

- Codex 可以继续做本地可验证的代码、文档、脚本、状态页和 smoke 改进。
- 需要平台控制台、真实凭据、生产账号、模型真实调用、付费资源或公开下载批准的事项，先记录到这里，不阻塞其他本地工作。
- 任何完成记录都只写低敏结论，例如“已人工确认并重新运行本地检查”，不要写真实值。
- 如果某项需要真实模型验证，只能用用户批准的具体业务任务，不能用 ping、doctor live、测活 prompt 或无意义小题。
- 状态页的 `reliabilityProjects` 必须在本总账中有对应的人工作业覆盖；新增、删除或重命名状态项目后，同步更新本总账并运行 `npm.cmd run docs:manual-gates-check`。

## Git / Repository Publishing

当前主仓 `main` 已恢复正常提交与 `git push origin main`。GitHub SSH host key 冲突和本地领先远端不再是当前人工阻塞项；只有当后续再次出现 SSH trust root 异常、远端拒绝推送或权限错误时，才重新进入人工 gate。

| Gate | Why Human | Safe Evidence |
|---|---|---|
| GitHub SSH host key 异常复核 | 仅在 SSH 指纹或 known hosts 再次异常时需要用户确认；代理不应自动改 SSH 信任根 | `git status --short --branch`、本地提交哈希、用户手动确认后的 `git push origin main` 结果 |
| 远端推送异常 | 仅在远端拒绝、权限变化或分支保护变化时需要用户确认下一步 | 提交列表、验证命令结果、推送失败的低敏错误类别 |

## Cloud And Deployment Platforms

| Gate | Why Human | Safe Evidence |
|---|---|---|
| Cloudflare Pages 环境变量和 Functions 部署 | 需要平台权限；变量可能含密钥 | 本地 `cf-assistant:smoke`、部署后低敏 `/api/health` 结果截图或文字摘要 |
| Render 四服务边界 | 需要控制台配置 public/internal/studio/rag 服务、启动命令和环境变量 | `assistant:service-modes-smoke`、`server:smoke`、低敏健康检查 |
| Aiven / Supabase / Qdrant / 数据库连接 | 连接串和 service key 只能放平台变量 | `prisma:validate`、迁移是否完成的低敏结论，不记录连接串 |
| 计划任务、CI、合成监控 | 需要仓库/平台权限和运行频率选择 | `reliability:check -- --strict` 的 artifact 或低敏摘要 |

## Databases And Production Migrations

| Gate | Why Human | Safe Evidence |
|---|---|---|
| 内部助手数据库迁移 | 生产数据库连接和 member token 数据不可公开 | `prisma:migrate` 成功摘要、`/me` 低敏验收结果 |
| 内部助手长期记忆迁移 | `AgentMemory` 表必须在私有内部助手数据库创建，且需要真实成员跨重启验收 | migration 成功、记忆数量/状态、跨重启仍存在的低敏结论；不记录正文或 token |
| Studio 数据库迁移 | 内容工作台数据库需要与 Studio 服务一致 | `prisma:migrate:studio` 成功摘要、`/studio/api/health` 低敏状态 |
| 分库边界复核 | 内部助手库和 Studio 库不能填反 | 对照 [部署说明](./deployment.md) 的变量职责，不记录真实值 |

## Model Providers And Live AI Tasks

| Gate | Why Human | Safe Evidence |
|---|---|---|
| 公开助手模型真实调用 | 会消耗模型额度，也可能暴露 provider 配置问题 | 用户批准的真实业务问题、返回的低敏 `meta.mode` / citation 摘要 |
| 内部助手成员模型渠道 | 每个成员的模型渠道由私有 env 解析，不能写入仓库 | `assistant:admin-check`、后台页面只显示 channel id / provider / model / configured |
| AI Daily 模型辅助生成 | 需要明确内容任务和来源范围，不做无意义测活 | 草稿 diff、来源清单、人工 review 结论 |
| LLM trace / Langfuse / Helicone / Phoenix | 涉及模型内容、成本、prompt、trace 存储 | 默认不接；接入前先确认采样、脱敏和保留策略 |

## Internal Assistant / RAG / Studio

| Gate | Why Human | Safe Evidence |
|---|---|---|
| RAG Orchestrator 外部存储启用 | Qdrant/pgvector/embedding/reranker 配置是服务端私密资源 | `assistant:rag-smoke`、`assistant:rag-sync-local`、低敏 sync/retrieve 摘要 |
| 内部知识库生产同步 | 可能包含内部内容和权限范围 | 本地 reviewed/active 文档数量、sync run 低敏状态 |
| 内部助手管理台刷新 / 成员渠道复核 | 需要浏览器里的 admin token 和成员上下文；模型渠道真实配置只在服务端 | `/assistant/admin` 点击“刷新全部状态”，成员页只记录 channel id/label、provider、model、configured / active |
| Studio token 生产验收 | token 不能写入仓库或页面源码 | 浏览器手动输入 token 后的健康状态和草稿列表低敏结果 |
| Agent draft-write 能力 | 只能创建 hidden + review-needed 草稿，不能发布 | Studio artifact id/slug、状态、可见性摘要 |
| Agent 长期记忆生产验收 | 需要真实成员 token 和已迁移数据库验证成员隔离与持久化 | 低敏记录“保存/去重/归档/恢复/重启后仍存在”是否通过，不记录记忆正文 |

## AI Daily And Blog Publication

| Gate | Why Human | Safe Evidence |
|---|---|---|
| 首次真实 AI Daily issue 转草稿 | 需要生产 Studio token、数据库和真实来源池 | `studio:ai-daily-brief-check`、issue readiness、草稿 status/visibility 摘要 |
| Publish Export 审核 | 公开博客数据写入必须由 Git diff 审查 | `studio:export -- --run-checks`、`blog:check`、`blog:knowledge-check`、`blog:project-notes-check` |
| AI 日报自动抓取 / 定时发布 | 来源选择、版权、事实核查和发布节奏需要人工策略 | 先保留为 planned；不要自动发布未审核内容 |
| 资源分享栏目内容 | 资源分享是站长主观筛选，不应由模型批量填充 | 手写或审稿后的草稿、来源和使用边界 |

## Project Demo And Credentialed Checks

| Gate | Why Human | Safe Evidence |
|---|---|---|
| Legal RAG 公开 demo 凭据 | 受保护问答、合同审查和质量面板需要低权限可回收账号 | `legal-rag:synthetic` 的 credentialed 低敏结果，不记录账号密码 |
| ERP 生产注册开放策略 | 注册是否公开涉及业务安全和滥用风险 | `erp:synthetic` registration 状态、公开页面截图或低敏摘要 |
| Xunqiu 后端 / APK / 兼容 API | 后端地址、凭据和 APK 发布批准都需要人工确认 | `xunqiu:synthetic`、APK gate 摘要、checksum 公开批准 |
| Pet 展示页和 APK 下载 | 正式 release 构建、APK/AAB、签名、checksum、下载入口需要 release 批准 | `pet:synthetic`、构建产物低敏摘要、公开下载批准记录 |
| BIAU Playlab / Game 试玩入口 | 静态资源、Web 试玩资源和试玩路径可以本地检查，外部发布仍需入口确认 | `playlab:synthetic`、`check:ui`、公开链接可达摘要 |

## APK / Mobile Release

| Gate | Why Human | Safe Evidence |
|---|---|---|
| Release APK/AAB 签名 | 签名文件和 keystore 路径不能公开 | 只记录产物文件名、版本号、SHA-256 是否已人工确认 |
| 公开下载链接 | 未批准前不能把真实 APK href 暴露给访客 | 状态页保持 planned/gated，下载按钮不指向真实文件 |
| Store / 分发平台 | 平台账号和审核状态由用户处理 | 审核通过/拒绝的低敏结果，后续再更新项目页 |

## Observability And Analytics

| Gate | Why Human | Safe Evidence |
|---|---|---|
| Cloudflare Analytics / Search Console / Webmaster | 需要站点所有权和平台账号 | 只记录“已启用/已提交 sitemap”的低敏状态 |
| Plausible 或 Umami 二选一 | 需要数据口径、隐私和托管方式选择 | `src/utils/analytics.ts` adapter 配置形状，不记录 site id/token |
| Prometheus / Grafana / ARMS | 需要 scrape 权限、告警渠道和平台账号 | 默认关闭 `/metrics`，先用本地 smoke 和 docs 检查 |
| Sentry / Grafana Faro | 需要 DSN、采样和隐私策略 | 真实错误影响体验后再接入 |

## 当前低敏复核记录

- ERP：关联 Web 构建、root workspace 测试和全 workspace build 已通过，认证桥修复已同步到远端分支；演示登录和插件同步仍等低权限账号 / 脱敏 fixture。
- Legal RAG：本地 `typecheck`、`build`、API unit、MVP validate、RAG eval 和合同审查 eval 已通过；生产法律问答、合同审查和质量面板仍等低权限 demo 凭据做 credentialed synthetic。
- Xunqiu：现代后端测试和打包已通过，展示站本地静态资源引用与公开入口可达性已复核；后端 synthetic base URL 和 APK 正式发布批准仍是人工门禁。
- Xunqiu Android64：本机 debug Java 编译和 debug APK 构建已通过；release 签名只应通过本机环境变量或本地 Gradle 属性提供，正式阶段 APK 仍需签名、校验和、扫描/回归证据与人工批准。
- Xunqiu 展示站：不可公开 GitHub 后端仓库链接已改为公开后端验证文档，线上首页和文档页已确认更新生效。
- Pet / Gamer：Node workspace 测试、Android debug unit test 和 debug APK 构建已通过，现有工作区有历史 WIP 未整理；当前证据仍是 debug-only，APK 公开下载必须等待正式 release 证据和人工批准。
- BIAU Playlab：内容审计、生产构建、构建产物审计和公开端点检查已通过；新试玩构建上线仍需入口确认。
- BIAU Port 主站：公开项目按钮与项目详情资料链接已接入 `public-links:check` synthetic 快照；状态页只展示通过数量、失败数量和错误类别，不保存具体外链 URL。
- BIAU Port 主站访问分析：`src/utils/analytics.ts` 已提供默认关闭的 Plausible/Umami/debug adapter，`route_view` 只发送归一化 `routePattern` / `routeArea` / `routeDepth`；`analytics:check` 已纳入 `verify`，防止完整 URL、query、hash 或动态 id 泄漏到事件元数据。
- BIAU Port 内部助手 Agent 工作台：`/assistant` 已提供简洁首屏、运行状态条、LangGraph inspector、工具轨迹卡、Studio artifact 链接、消息级 Agent trace replay、降级/guardrail 下一步提示；`assistant:agent-contract` 和 `assistant:agent-eval` 已覆盖本地 no-live 的 LangGraph 节点、工具权限、状态/项目、内部知识、Studio draft plan-only 和会话记忆用例。
- BIAU Port 内部助手长期记忆：生产成员 API 已确认 `AgentMemory` migration 生效；使用真实成员完成了明确同意保存、重复去重、归档和恢复验收，最终记录保持 `ACTIVE`。剩余人工项仅为重启 internal service 后确认同一成员仍能读取该记忆；不记录 token、成员信息或记忆正文。
- BIAU Port 内部助手管理台：`/assistant/admin` 已提供“刷新全部状态”，会统一刷新摘要、成员、邀请、内部知识、RAG 状态和用量；知识页已提供 sourceType 预设和 internal RAG readiness 路径；`check:ui` 已守护无 token 时按钮可见且禁用、token 只保存在当前浏览器的提示仍可见。
- BIAU Port Studio：`/studio` 第一屏已显示待审核队列摘要、下一篇待审核和“打开下一篇待审核”动作；`check:ui` 已守护无 token / 无草稿首屏仍能看见审核入口，真实审核和导出仍是人工 gate。
- BIAU Port 全链路本地验证：`npm.cmd run verify` 已通过；覆盖 assistant index、知识图谱检查、离线 RAG eval、内部 Agent contract/eval、本地 RAG sync plan、meta/admin 检查、Prisma validate、server smoke、服务模式 smoke、RAG smoke、Cloudflare function smoke、build、博客质量、部署/manual-gates/observability 文档、analytics、Studio smoke、项目详情、status contract 和 UI check；本轮没有 live model calls。`r`n`r`n## 当前人工队列摘要

以下是唯一的当前人工队列。已经完成的迁移、基础连接、保存/去重/归档/恢复验收不再列为待办；每一步只记录低敏结果，不记录 token、密码、连接串、模型地址、成员信息或私有内容。

1. 内部助手生产复核
   - 打开 `/assistant/admin`，在当前浏览器保存 admin token 后点击“刷新全部状态”。
   - 在“成员”页签确认成员状态和模型渠道符合预期。
   - 在 Render 手动重启 `biau-internal-assistant-api`；健康状态恢复后，用原成员打开 `/assistant`，确认已有 ACTIVE 长期记忆仍然存在。
   - 成功标准：成员渠道只显示低敏 channel id/label、provider、model、configured / active；长期记忆跨重启仍可读取。

2. Studio 首次公开导出
   - 打开 `/studio`，选择第一篇 `hidden + review-needed` 草稿，检查正文、来源、可见性和公开预览。
   - 内容不合格时先修改草稿；通过后才创建 Publish Export。
   - 成功标准：生成一条低敏 export 记录，并在本地或 CI 执行 `studio:export -- --run-checks` 后审查 Git diff。

3. Legal RAG 演示验收
   - 准备低权限、可回收 demo 账号，只允许访问公开安全数据集。
   - 在本机或 CI 环境变量中配置凭据后运行 credentialed synthetic。
   - 成功标准：法律问答、合同审查和质量面板具有可复跑的低敏证据，不在仓库或聊天中记录凭据。

4. ERP 演示验收
   - 使用专门的低权限 demo 账号复核注册、登录和默认角色。
   - 为插件与商品同步准备脱敏 fixture 或演示店铺，禁止使用真实店铺凭据。
   - 成功标准：注册/登录策略、默认角色和同步路径具有可复跑 smoke 证据。

5. Xunqiu 与 Pet 发布门禁
   - 为 Xunqiu 配置公开后端 base URL 后运行 health / 兼容 API synthetic。
   - Pet 与 Xunqiu 只有在正式 release 包、签名、SHA-256、扫描/回归证据、版本说明、回滚说明和人工批准齐全后才能公开 APK。
   - 成功标准：状态页只公开批准后的 release 摘要，不公开 debug 包或未经批准的下载链接。

6. 访问分析与工程观测
   - 先确认 Cloudflare Analytics 与 Search Console 的站点配置。
   - Umami / Plausible 二选一后再启用现有 analytics adapter，不同时接入两套访客统计。
   - Prometheus、Grafana、ARMS、Sentry、Langfuse 等需先确定采样、脱敏、保留周期、告警渠道和成本。
   - 成功标准：生产只启用经过明确选择的工具，公开事件不包含完整 URL、query、hash、动态 ID 或敏感业务内容。

如后续更换机器、SSH trust root 异常、远端拒绝推送或权限变化，再重新进入 GitHub 人工 gate；当前主仓 `main` 推送正常，不属于当前待办。