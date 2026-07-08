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

| Gate | Why Human | Safe Evidence |
|---|---|---|
| GitHub SSH host key 冲突核验 | 需要用户确认 GitHub 官方指纹并决定是否更新本机 known hosts；代理不应自动改 SSH 信任根 | `git status --short --branch`、本地提交哈希、用户手动确认后的 `git push origin main` 结果 |
| 本地领先远端提交推送 | 当前本地可以继续提交，但远端同步依赖 SSH gate | 提交列表、验证命令结果、推送前 diff 摘要 |

## Cloud And Deployment Platforms

| Gate | Why Human | Safe Evidence |
|---|---|---|
| Cloudflare Pages 环境变量和 Functions 部署 | 需要平台权限；变量可能含密钥 | 本地 `cf-assistant:smoke`、部署后低敏 `/api/health` 结果截图或文字摘要 |
| Render 三服务边界 | 需要控制台配置 public/internal/rag/studio 服务、启动命令和环境变量 | `assistant:service-modes-smoke`、`server:smoke`、低敏健康检查 |
| Aiven / Supabase / Qdrant / 数据库连接 | 连接串和 service key 只能放平台变量 | `prisma:validate`、迁移是否完成的低敏结论，不记录连接串 |
| 计划任务、CI、合成监控 | 需要仓库/平台权限和运行频率选择 | `reliability:check -- --strict` 的 artifact 或低敏摘要 |

## Databases And Production Migrations

| Gate | Why Human | Safe Evidence |
|---|---|---|
| 内部助手数据库迁移 | 生产数据库连接和 member token 数据不可公开 | `prisma:migrate` 成功摘要、`/me` 低敏验收结果 |
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
| Studio token 生产验收 | token 不能写入仓库或页面源码 | 浏览器手动输入 token 后的健康状态和草稿列表低敏结果 |
| Agent draft-write 能力 | 只能创建 hidden + review-needed 草稿，不能发布 | Studio artifact id/slug、状态、可见性摘要 |

## AI Daily And Blog Publication

| Gate | Why Human | Safe Evidence |
|---|---|---|
| 首次真实 AI Daily issue 转草稿 | 需要生产 Studio token、数据库和真实来源池 | `studio:ai-daily-brief-check`、issue readiness、草稿 status/visibility 摘要 |
| Publish Export 审核 | 公开博客数据写入必须由 Git diff 审查 | `studio:export -- --run-checks`、`blog:check`、`blog:knowledge-check` |
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

## 当前人工队列摘要

- Studio 生产连接已刷新成功；下一步是人工审核 hidden/review-needed 草稿，创建 Publish Export 后再审查公开内容 diff。
- Legal RAG 仍需低权限、可回收 demo 凭据和 credentialed synthetic 环境变量，用来验收法律问答、合同审查和质量面板。
- ERP 注册入口已在线可达；插件与商品同步仍需要脱敏 fixture 或低权限演示店铺再做 credentialed smoke。
- Xunqiu 后端 synthetic 仍需后端公开 base URL；APK 公开发布仍需正式 release 审批。
- Pet 展示页在线；APK 公开下载仍需正式 release 包、签名、SHA-256、扫描/回归证据、版本说明、回滚说明和人工批准。
- 决定 Plausible 或 Umami 的访问分析方案，并避免两个同时接入同一站点。
- 决定 Prometheus/Grafana/ARMS/Sentry/Langfuse 等平台的接入时机。
- 如后续更换机器或 SSH trust root 异常，再核验 GitHub SSH host key；当前主仓 `main` 推送已恢复正常。
