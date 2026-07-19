# Studio / AI Daily 生产就绪记录

这份记录用于收口 BIAU Operator、Content Studio 与 AI Daily 的生产边界。真实 token、数据库 URL、模型渠道和后台地址只保存在平台环境变量中；当前人工步骤以 [`docs/manual-gates.md`](./manual-gates.md) 为准。

## 当前结论

- Studio-first 流程已建立：来源池 -> AI Daily issue -> `hidden + review-needed` 草稿 -> 人工审核 -> Publish Export -> 本地/CI 静态导出。
- BIAU Operator 可以通过 `studio.draft` 创建待审核草稿，但不能审核、导出或发布。
- Studio API 与 Operator 使用同一个 `STUDIO_DATABASE_URL`，Operator 自己的会话/记忆数据库仍使用独立 `DATABASE_URL`。
- AI Daily 自动抓取、自动摘要和自动发布保持关闭，直到真实模型评估、首个版次和导出流程验收完成。
- 三角色模型评估 contract、server-only OpenAI-compatible provider path、runtime channel 漂移检查和批准 bundle 校验已经实现；当前仍没有真实候选评估或人工批准记录。

## 服务边界

| 服务 | 数据库 | 责任 |
| --- | --- | --- |
| `biau-operator-api` | `DATABASE_URL` | owner session、message、memory、usage、站务知识。 |
| `biau-operator-api` | `STUDIO_DATABASE_URL` | 仅用于 `hidden + review-needed` draft-write。 |
| `biau-content-studio-api` | `STUDIO_DATABASE_URL` | 草稿、来源、review、AI Daily issue 和 Publish Export。 |

两个服务的 `STUDIO_DATABASE_URL` 必须指向同一个内容库；不要把 Studio 数据库填入 Operator 的 `DATABASE_URL`。

## 本地验证

```powershell
npm.cmd run ai-daily:production-readiness-check
npm.cmd run ai-daily:model-evaluation-check
npm.cmd run ai-daily:model-runtime-check
npm.cmd run ai-daily:runner-check
npm.cmd run ai-daily:operations-check
npm.cmd run ai-daily:observability-contract-check
npm.cmd run ai-daily:retention-check
npm.cmd run ai-daily:contracts-check
npm.cmd run studio:smoke
npm.cmd run studio:ai-daily-brief-check
npm.cmd run operator:knowledge-check
npm.cmd run assistant:agent-eval
```

这些命令不调用外部模型，不需要生产数据库，也不会自动公开内容。`ai-daily:model-evaluation-check` 只证明 case-set hash、三角色排序、质量线、独立 fallback、低敏记录和人工批准状态机有效；`ai-daily:model-runtime-check` 使用 loopback HTTP 验证 provider 请求/解析、超时和 bundle 漂移门禁；两者都不能把 fixture 变成生产批准。`ai-daily:operations-check` 使用纯内存 fixture 验证 diagnostics、六类故障投影和 metrics 安全契约；`ai-daily:observability-contract-check` 验证仓库内 Grafana dashboard 与 Prometheus alert 模板；`ai-daily:retention-check` 验证默认 dry-run、发布/审核链保护和禁止 mutation 契约；`ai-daily:contracts-check` 默认跳过需要 disposable PostgreSQL 的 repository checks，只有明确设置 `AI_DAILY_DATABASE_CHECK=1` 并传入 `--with-database` 才会运行它们。

Studio 已提供受 `STUDIO_ADMIN_TOKEN` 保护的 `GET /studio/api/ai-daily/operations` 和 `GET /studio/api/ai-daily/retention/dry-run`。后者只生成候选与阻断原因，始终不执行 mutation。只有同时设置 `METRICS_ENABLED=true` 与 `AI_DAILY_OPERATIONS_METRICS_ENABLED=true` 时，Studio `/metrics` 才会追加 operations snapshot；默认仍为关闭。snapshot 查询失败只暴露 availability=0，不输出数据库或 provider 错误。仓库已提供六类故障 dashboard/alert 模板，但生产 scrape、Grafana/ARMS 导入、通知 routing 以及任何未来 retention mutation 仍需人工平台配置和独立批准。

`ai-daily:production-readiness-check -- --strict` 只用于已经注入目标环境变量的离线 preflight。它不会读取或输出变量值，也不会代替 Render migration、Cron 启用、真实来源审核、真实三角色模型评估/批准或真实业务版次验收。普通模式会把缺少真实评估/批准 bundle 显示为 `manual-gate`，而不是把 loopback contract 误报为生产就绪。

## 既有部署基线与当前 schema 变更

以下部署基线已经完成，不应作为每轮内容工作的前置 setup 重复执行：

- `biau-content-studio-api` 使用 `ASSISTANT_SERVICE_MODE=studio`，既有 Studio migration 与独立内容数据库边界已建立。
- `biau-operator-api` 使用 `ASSISTANT_SERVICE_MODE=operator`，并通过共享 `STUDIO_DATABASE_URL` 写入同一内容库。
- `/studio` 已能读取 health、草稿、来源、AI Daily 和 Publish Export；Operator artifact 能定位 `hidden + review-needed` 草稿。

后续每个真实内容周期只执行：

1. 在 Studio 修改或归档 `needs-changes` 草稿，保存后重新提交审核。
2. 人工复核事实、来源、结构、版权与公开安全边界；通过后创建 Publish Export。
3. 使用 Publish Export 卡片显示的本地命令执行 `studio:export -- --run-checks`。
4. 审查 Git diff 和博客检查结果后再提交，不让线上 Studio 直接写仓库。

`20260717000000_publish_export_version_binding` migration 已在生产 Studio 服务执行。它给 Publish Export
增加可空的草稿版本与批准记录字段、新增记录更新时间字段，同时创建 `(draftId, draftUpdatedAt)` 唯一索引，并增加指向 `ContentReview` 的外键。部署后，受保护的 health、草稿、来源和 Publish Export 只读接口均返回 `200`；Publish Export 查询成功使用新版 schema。既有旧记录不会被猜测回填，继续导出时应在 Studio 中重新创建一条记录。

当前人工顺序和低敏成功标准只在 [`docs/manual-gates.md`](./manual-gates.md) 维护。

`20260718010000_ai_daily_generation_runner` 是当前待部署 migration。它新增不可变 generation checkpoint、generated revision 幂等键和原始 draft 投影绑定；必须先备份 Studio 数据库、保留可回滚 Render revision，再执行 migration 和服务部署。部署本身不授权真实模型调用或自动发布。

`AI_DAILY_PUBLIC_FEED_ENABLED` 默认和 Render blueprint 均为 `false`。只有公开 Feed migration、Studio CORS 和 Cloudflare browser base 全部完成并经过人工验收后，才在 Studio 服务显式改为 `true`。

## 三角色生产模型门禁

Studio 服务只从 `AI_DAILY_MODEL_RUNTIME_JSON` 读取 server-only channel/candidate 映射；它不会把 API key、base URL 或原始模型输出写入 proposal、bundle、日志或公开 API。每个角色至少配置两个候选并覆盖两个 failure domain，模型评估命令按候选串行执行，避免把一次真实业务任务变成高并发测活。

真实业务评估必须由用户明确批准，并同时满足：

```powershell
$env:AI_DAILY_BUSINESS_EVALUATION_ENABLED = 'true'
npm.cmd run ai-daily:model-evaluate -- --execute --approval-id <approved-run-id>
```

评估输出默认写入被忽略的 `server/data/ai-daily-model-evaluation.local.json`。人工审阅 case 质量、中文编辑质量、citation coverage/precision、延迟、fallback 故障域和 hash 后，再运行不调用模型的审批命令：

```powershell
npm.cmd run ai-daily:model-approve -- --input server/data/ai-daily-model-evaluation.local.json --reviewed-by site-owner --notes "Measured selection approved for one controlled edition."
```

批准 bundle 仍不能单独开启生产：首个版次还必须显式使用 `--live`、设置 `AI_DAILY_PRODUCTION_GENERATION_ENABLED=true`，并完成 Studio 审核、Publish Export、部署和公开 Feed 验收。任何 runtime provider/failure-domain/model 漂移都会 fail closed。

## 发布边界

- 线上 Studio 不直接写 Git 仓库。
- hidden draft、issue 和未审核 source 不进入公开博客、公开助手知识或 sitemap。
- AI Daily 必须包含具体来源、发布日期、事实摘要和逐条影响判断，不能把来源主页或流程说明当日报正文。
- 模型渠道只能用真实内容任务验收，禁止测活 prompt。
- Render Cron 的 UTC 调度草案和 Asia/Shanghai edition date 规则记录在 [`docs/ai-daily-pipeline.md`](./ai-daily-pipeline.md)；在 provider 与人工 gate 完成前保持 disabled。
- 公开 Feed 回滚使用 `AI_DAILY_PUBLIC_FEED_ENABLED=false`；这只关闭公开投影路由，不删除 Studio 数据或历史审核记录。
- production generation 回滚先暂停两个 Cron，再把 `AI_DAILY_PRODUCTION_GENERATION_ENABLED=false`；公开 Feed 若已启用，再把 `AI_DAILY_PUBLIC_FEED_ENABLED=false`。保留 Studio 手动编辑、审核和离线导出路径，不删除数据库历史。
