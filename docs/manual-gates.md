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

## BIAU 平台门禁

| Gate | 人工原因 | 安全证据 |
| --- | --- | --- |
| Cloudflare Access application 与 policy | 需要站点账号权限，并包含私有 team domain / audience / owner 邮箱 | 只记录 `/operator`、`/operator/*`、`/api/operator/*` 已受保护，以及非 owner 被拒绝 |
| Operator Function 私有变量 | `OPERATOR_SERVICE_TOKEN`、Render URL 和 Access 配置不能提交 | `operator:facade-smoke` 本地通过；生产只记录 200/401/403/502/504 类别 |
| Render 四服务边界 | 需要在控制台维护 public/operator/studio/rag 服务和变量 | `docs:deployment-check`、`assistant:service-modes-smoke`、四个低敏 `/health` 摘要 |
| Operator 数据库迁移 | 生产连接串只能在 Render；迁移需要备份和回滚 revision | `prisma:migrate` 成功、`/operator/me` 低敏结果 |
| Owner 长期记忆选择性迁移 | 只能迁移人工确认属于站长的 `ACTIVE` 记录 | `operator:memory-migration:check` 脱敏 ID 报告、批准 ID 数量、apply 成功数量 |
| Studio 数据库迁移 | Operator draft-write 与 Studio 审核必须写同一内容库 | `prisma:migrate:studio`、同一 draft id 在 Studio 可见 |
| Qdrant / embedding / reranker | URL、key、collection 和模型渠道为服务端私密配置 | `assistant:rag-smoke`、sync/retrieve 的 accepted/issue/维度摘要 |
| Operator 真实模型验收 | 会消耗额度并涉及 provider 配置 | 用户批准的站务任务、低敏 model mode、引用和工具结果 |
| Studio token | 编辑审核 token 不能写入浏览器构建或仓库 | 手工登录后草稿列表、审核状态和 export 数量摘要 |

## Operator 安全边界

- `/operator` 和 `/operator/settings` 是 owner-only 页面，不放入公共主导航或公共 synthetic。
- 浏览器只调用同源 `/api/operator/*`，不保存 Render service token。
- Operator 只允许 `read` 与 `draft-write`；不能发布、部署、Git 写入、云平台修改或凭据操作。
- `studio.draft` 必须保持 `hidden + review-needed`，人工审核后才允许导出。
- 旧成员、邀请码、成员模型分配、普通聊天和成员用量不进入 Operator 最终产品。

## Content Studio / AI Daily

| Gate | 人工原因 | 安全证据 |
| --- | --- | --- |
| 首篇公开导出 | 公开数据文件必须审查 diff | `studio:export -- --run-checks`、博客检查和最终 Git diff |
| AI Daily 真实来源 | 需要逐条确认日期、事实、版权和来源上下文 | source URL 数量、发布日期、审核结论，不复制长段原文 |
| AI Daily 自动化 | 自动抓取和发布存在事实与版权风险 | 默认保持关闭；人工流程稳定后再选择调度器 |
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
| Prometheus / Grafana / ARMS | 需要 scrape、告警和平台账号 | `/metrics` 默认关闭，先保留 synthetic 与低敏 health |
| Sentry / Faro / Langfuse | 可能收集错误、prompt、trace 和用户内容 | 明确采样、脱敏和保留周期后再接入 |

## 已完成的低敏事实

- 主站公开路由、项目/博客详情、状态页、sitemap、robots 和显式外链已有本地/线上无凭据检查；检查不发送模型问题。
- Qdrant public/private scoped knowledge 已有同步成功记录；真实 collection、key 和 embedding 配置未写入仓库。
- Studio 已能保存 `hidden + review-needed` 草稿和审核记录；尚未把质量不足的草稿导出为公开文章。
- ERP、Legal RAG、Xunqiu、Pet 和 Playlab 均已有本地构建或 synthetic 基础，生产账号/发布批准仍按上表处理。
- BIAU Operator 的 LangGraph、typed tools、owner session/memory schema、Cloudflare facade 和本地确定性测试已经进入代码收口；平台切换尚需下方步骤。

## 当前人工队列

按顺序处理，完成一项后只记录低敏结果：

1. **部署 `biau-operator-api`**
   - 将原私有助手 Render service 改名或新建为 `biau-operator-api`。
   - 使用 `ASSISTANT_SERVICE_MODE=operator` 和 [部署说明](./deployment.md) 的 Build/Start Command。
   - 配置 Operator、数据库、Studio、模型和 RAG server-only 变量。

2. **配置 Cloudflare Access 与 Operator Function**
   - 创建 self-hosted application，保护 `/operator*` 和 `/api/operator/*`。
   - 只允许 owner 邮箱。
   - 在 Pages 设置 Function 私有变量，并重新部署。

3. **确认 owner memory 迁移记录**
   - 先运行 check，审核脱敏 record ID。
   - 只把明确属于站长且状态为 `ACTIVE` 的 ID 交给 apply。
   - 不迁移普通聊天、邀请、成员、成员渠道或用量。

4. **用一个真实站务任务验收**
   - 例如“审查当前项目页内容缺口并创建一篇待审核 Studio 草稿”。
   - 成功标准：Access 身份通过、Operator 返回工具轨迹、草稿为 `hidden + review-needed`、Studio 页面能看到同一 draft。

5. **继续关联项目门禁**
   - Legal RAG demo、ERP 注册、Xunqiu/Pet release 按上表逐项处理。

## 延期项

- AI Daily 自动抓取和自动发布。
- Umami/Plausible、Prometheus/Grafana/ARMS、Sentry/Faro/Langfuse。
- GitHub Social Preview 与额外运营素材。
- Chatus 与 BIAU 的只读 MCP 集成；先完成 Chatus 自身产品化。
