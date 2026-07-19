# AI 日报内容流水线

AI 日报 / AI Daily 是独立栏目，用来记录短周期 AI 模型、工具、开发平台和工程实践变化。当前推荐路径已经从单个离线草稿脚本升级为 **Studio-first 内部编辑流程**：先维护来源池和单期 issue，再由证据绑定 generation runner 生成不可变 revision 和隐藏的待审核博客草稿，最后通过静态导出进入公开站。

公开站有两条相互独立的发布路径：近期 Flash 只读取数据库中 `ACTIVE + current APPROVED` 的公开投影；耐久版日报仍只读取已审核、已导出的 Git-tracked 内容。数据库里的 AI Daily issue、草稿、证据正文和审核记录都不会直接公开。

生产就绪状态、服务分库边界和人工验收顺序见 [`docs/studio-ai-daily-production-readiness.md`](./studio-ai-daily-production-readiness.md)。

## 推荐流程

1. 在 `/studio` 粘贴 Studio 管理 token，进入内容工作台。
2. 在来源池录入公开来源：标题、URL、来源名、source tier、语言、发布时间、摘要和标签。
3. 在“创建日报 Issue”里从“已有来源”下拉选择来源标题，点击“加入本期”，再创建 AI Daily issue。
4. 编辑 issue brief JSON，记录本期摘要、公共角度、关键信号、待核查问题和发布边界。
5. 运行 generation runner：它批量抽取 fact cards，再作中文 composition、风险 verifier 和确定性 citation/wording gate；每一步先写 PostgreSQL checkpoint，再推进下一阶段。
6. `VALID` 结果最多创建一个 `hidden + review-needed` 草稿；`NEEDS_EDITOR_REVIEW` 只保存不可变 revision；`REJECTED` 不创建草稿。已有草稿永远不被覆盖，只标记 `newEvidenceAvailable`。
7. 在 Studio 草稿区继续编辑正文和预览效果，完成来源、事实、版权摘要、敏感信息和栏目适配审核。
8. 审核通过后创建 Publish Export 记录。
9. 在本地或 CI 执行 `studio:export`，把 approved draft 写入公开博客静态数据。
10. 审查 Git diff，通过后提交发布。

这个流程保留人工 review gate，不做无人审核的每日自动发布。

## 来源与查询组策展清单

版本化来源清单位于 `server/data/ai-daily-source-manifest.v1.json`。当前包含 30 个来源和 10 个 discovery query groups，覆盖官方模型/平台、开源生态、AI 基础设施、研究、企业 AI、中国 AI、政策安全和多模态/端侧方向。2026-07-19 已完成公共页面预审和站点所有者确认：顶层 `readiness=approved`，16 个 approved 来源与 4 个核心查询组已启用，9 个 hold 来源、5 个 rejected 来源和其余 6 个查询组保持关闭。审查摘要见 [`docs/ai-daily-source-review-2026-07-19.md`](./ai-daily-source-review-2026-07-19.md)。

离线校验命令：

```powershell
npm.cmd run ai-daily:manifest-check
```

该检查严格验证 schema version、30-80 条来源范围、唯一 id/canonical URL、公开 HTTPS、locale/domain、TIER_1 官方域名、topics、查询组预算、include/exclude 冲突和审核状态；它复用 ingestion feed 归一化契约，不访问任何来源、搜索 provider、模型、数据库或部署服务。`hold`、`approved` 和 `rejected` 都必须填写非空 `reviewedBy`、可解析的 `reviewedAt` 和低敏结论；只有 `approved` 条目允许启用。顶层批准要求所有条目结束 candidate 状态、至少 12 个来源获批、至少 4 个查询组获批，并且启用项必须与 approved 状态一致。不要把本地 contract pass 解释为真实内容版次已经成功。

## Studio 后端配置

Studio 推荐使用独立数据库，方便和 Operator owner 数据分开维护：

```text
ASSISTANT_SERVICE_MODE=studio
STUDIO_DATABASE_URL=<studio postgres connection string>
STUDIO_ADMIN_TOKEN=<owner token>
CORS_ORIGIN=<main site origin without trailing slash>
TRUST_PROXY=true
AI_DAILY_PUBLIC_CORS_ORIGINS=<main site origin without trailing slash>
AI_DAILY_TIME_ZONE=Asia/Shanghai
AI_DAILY_PUBLIC_FEED_ENABLED=false
AI_DAILY_PUBLIC_WINDOW_HOURS=72
AI_DAILY_PUBLIC_STALE_MINUTES=180
AI_DAILY_MODEL_RUNTIME_JSON=<server-only channel and candidate mapping>
AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json
AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH=<approved bundleHash>
AI_DAILY_BUSINESS_EVALUATION_ENABLED=false
AI_DAILY_MODEL_EVALUATION_APPROVAL_ID=<one approved evaluation run id>
AI_DAILY_PRODUCTION_GENERATION_ENABLED=false
NODE_VERSION=22
```

前端需要指向 Studio 服务：

```text
VITE_STUDIO_API_BASE_URL=https://<studio-service>.onrender.com
VITE_AI_DAILY_API_BASE_URL=https://<studio-service>.onrender.com
```

公开页面使用 `GET /public/ai-daily/feed` 和 `GET /public/ai-daily/events/:publicId`，不会发送 Studio token。Flash 被暂挂时不会进入 feed，被撤回或超出公开窗口时详情返回 `410`；静态 Edition 的 Publish Export 审核不受 Flash 批准影响。

不要把真实数据库连接串、token、私有 RSS token、模型中转站地址或后台链接写进仓库。首次上线新增 Studio 模型时，需要确认生产 migration 已执行。

## 生产就绪检查

所有本地就绪检查都是离线的：只读取仓库配置和 fixture，不访问模型、搜索服务、生产数据库或 Render。默认模式会把必须由人工完成的平台配置标记为 `manual-gate`，不会把它们误报成失败：

```powershell
npm.cmd run ai-daily:production-readiness-check
npm.cmd run ai-daily:production-readiness-check -- --json
npm.cmd run ai-daily:manifest-check
npm.cmd run ai-daily:model-evaluation-check
npm.cmd run ai-daily:model-runtime-check
npm.cmd run ai-daily:acceptance-check
npm.cmd run ai-daily:operations-check
npm.cmd run ai-daily:retention-check
npm.cmd run ai-daily:contracts-check
```

`ai-daily:manifest-check` 验证候选来源/查询组资产及人工审核 fail-closed 边界；`ai-daily:model-evaluation-check` 验证 extractor/composer/verifier 三角色的离线评估记录、排序、独立 fallback、hash 和人工批准边界；`ai-daily:model-runtime-check` 只使用 loopback HTTP 验证运行时配置、无 temperature 的结构化请求、审批 bundle 防篡改以及 `--fixture/--live` 门禁，不调用外部 provider；`ai-daily:acceptance-check` 验证首版验收 manifest 的跨阶段绑定、敏感字段禁入和篡改拒绝；`ai-daily:operations-check` 验证专项 diagnostics、低基数 Prometheus 指标、snapshot unavailable 降级和敏感字段禁入规则；`ai-daily:retention-check` 验证 retention dry-run 的候选分类、保护原因、稳定排序、限制和禁止 mutation 契约。`--strict` 只适合在已注入目标部署环境变量的本地/CI preflight 中使用；它仍然不会发出网络请求。需要 disposable 本地 PostgreSQL 时，另外设置 `AI_DAILY_DATABASE_CHECK=1` 后运行 `npm.cmd run ai-daily:contracts-check -- --with-database`，不要指向生产或共享数据库。

## 首版生产验收记录

真实三角色 selection bundle 获批后，先创建一份 Git-ignored 的本地验收 manifest：

```powershell
npm.cmd run ai-daily:acceptance -- init --acceptance-id <acceptance-id> --edition-date YYYY-MM-DD
npm.cmd run ai-daily:acceptance -- check
```

默认读取 `server/data/ai-daily-model-evaluation.local.json`、`server/data/ai-daily-model-approval.v1.json`，写入 `server/data/ai-daily-acceptance.local.json`。该文件只允许保存以下低敏证据：

- proposal、selection 和 bundle hash，以及审核人别名和批准时间；
- 首个 `PRODUCTION` edition 的 `issueId`、`runId`、日期、完成状态；
- 同一 issue/run/date 下的 Studio draft/review id、草稿版本时间和三个审核勾选；
- Publish Export id、绑定的 draft/review/version、仓库相对输出路径和命令退出码；
- `publicFeed`、`detailPage`、`etag304`、`withdrawn410`、`mobile` 五项部署观察，以及 rollback readiness。

不要写入 prompt、来源正文、文章正文、原始模型输出、模型端点、key/token、数据库 URL、私有后台地址或原始错误。manifest 不主动读取生产数据库，也不访问 Render、搜索服务或模型；值来自用户完成真实业务流程后的低敏记录。

全部 gate 通过后再 seal：

```powershell
npm.cmd run ai-daily:acceptance -- seal
npm.cmd run ai-daily:acceptance -- check --require-sealed
```

`seal` 会在重新验证 proposal/bundle、candidate/selection、edition/issue/run、Studio draft/review 版本、Publish Export 和部署观察后生成 canonical `recordHash`。缺少真实记录时 production readiness 显示 `manual-gate`；已有 manifest 若 schema、hash 或跨阶段绑定被篡改则显示 `fail`。fixture contract 通过不能替代真实首版验收。

## 生产运维诊断

Studio token 持有者可以读取：

```text
GET /studio/api/ai-daily/operations
```

它从 Studio 数据库生成只读 snapshot，汇总来源健康、run/stage、work backlog、过期 lease、最近 24 小时质量拒绝、公开 Flash 年龄和待处理 retention 数量。响应还把最近 24 小时或仍处于 `DEGRADED` / `FAILING` 的来源错误、最近 24 小时 run/work/event 错误、证据缺口、过期 lease 和新鲜度超限归一化为 `config`、`provider`、`evidence`、`quality`、`infrastructure`、`stale-content` 六类固定故障信号。响应只包含固定枚举、计数和时间，不包含 source URL、run/issue id、provider id、标题、正文、token、数据库 URL 或原始错误。

当 Studio 服务显式设置 `METRICS_ENABLED=true` 和 `AI_DAILY_OPERATIONS_METRICS_ENABLED=true` 时，同一个 snapshot 会追加到 `/metrics`。AI Daily 指标覆盖 source health、run stage/status、latest run freshness/end-to-end lag、work backlog/lease、最近 24 小时 outcome/provider role、issue status、public feed age、retention due 和 `biau_ai_daily_failure_signals{category="..."}`；只使用固定低基数 labels，例如 `health`、`status`、`stage`、`outcome`、`provider_role`、`kind`、`category`、`code` 和 `severity`。故障信号不是唯一事故数，同一事故可能在 source/run/work/event 多处留下信号；看板和告警只按 `> 0` 判断类别是否活跃。provider role 仅区分 primary/fallback 等角色，不输出渠道或模型身份。数据库未配置或 snapshot 查询失败时，只输出 `biau_ai_daily_operations_snapshot_up 0`，不会让 scrape 请求失败或泄露异常。

仓库提供 `observability/ai-daily-grafana-dashboard.json` 和 `observability/ai-daily-prometheus-alerts.yml`，并由 `npm.cmd run ai-daily:observability-contract-check` 离线验证六类 panel/rule、固定 severity、套件注册和敏感字段禁入。模板不包含真实 datasource、scrape URL 或通知目标；导入生产 Grafana/Prometheus/ARMS 和配置通知路由仍需人工完成。

Studio token 持有者还可以读取 `GET /studio/api/ai-daily/retention/dry-run?limit=100`。该接口使用 `retention-dry-run-v1` 策略生成只读计划：过期且不是 current evidence 的 evidence 可标记为 eligible；Flash 只有在已撤回、没有 current approved revision、没有 revision history、没有 approval audit 时才可标记为 eligible。其余记录会返回固定的 blocked reason，例如 `current-evidence`、`current-approved-revision`、`approval-audit-history`、`publication-lifecycle` 或 `revision-history`。结果始终带 `mode=dry-run` 与 `mutationsApplied=false`，默认返回 100 条、最多 200 条；汇总计数只描述本次返回窗口，`truncated=true` 表示还有更多到期记录未进入本次窗口。传入任何 `mutate` 参数都会被拒绝。

当前没有删除或归档 mutation。未来 cleanup 必须另建显式 mutate 命令、事务保护、批量上限、并发/版本校验、审计记录和备份回滚；不得按 `createdAt` 粗暴删除 issue、revision、active Flash、当前 evidence 或有审核历史的记录。

## AI Daily issue brief 建议

`briefJson` 应保持为公开安全的 JSON 对象，例如：

```json
{
  "summary": "今天的 AI 信号集中在模型更新、开发工具和工程实践。",
  "publicAngle": "适合面向开发者解释变化的实际影响，不写成新闻速递堆叠。",
  "keySignals": [
    "官方来源发布了新的模型或平台能力",
    "开发工具生态出现可复用实践",
    "需要继续核查价格、可用区域或 API 行为"
  ],
  "toVerify": [
    "确认每条事实都有来源链接",
    "确认没有复制来源长段原文",
    "确认没有把社区传言写成已确认事实"
  ]
}
```

`briefJson` 不能包含 API key、数据库 URL、私有模型渠道、后台地址、账号密码或未公开部署信息。

`/studio/ai-daily/:issueId` 会在 textarea 下方显示本地 brief 质量反馈：

- JSON 格式错误、非对象，或缺少 `summary`、`publicAngle`、`keySignals`、`toVerify` 会阻止保存。
- 字段存在但内容偏薄，例如空摘要、空数组，会显示警告；编辑者可以继续补充，不会被误判成发布完成。
- 已保存的不完整对象会原样显示并提示问题，不会被自动替换成空模板。
- 页面还会显示 issue readiness。进入审核或转为内容草稿前，需要有可审核的 brief、至少 1 个公开来源、有效来源 URL，以及至少 1 个有可转述摘要的来源。
- 普通编辑态可以保存半成品；`review-needed` / `approved` / `published` 状态转换和转草稿由前端与 Studio API 同时守门。

## 离线兼容工具

`npm.cmd run ai-daily:draft` 仍保留，适合把人工整理好的 source JSON 转成 review 草稿，或者在 Studio 不可用时做离线兼容。

```powershell
npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --force
```

默认输出：

```text
content-drafts/ai-daily-YYYY-MM-DD.md
```

也可以指定输出：

```powershell
npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --out content-drafts/ai-daily-custom.md --force
```

来源 JSON 必须是公开可审查信息：

```json
{
  "date": "2026-07-05",
  "title": "AI 日报标题",
  "items": [
    {
      "title": "来源标题",
      "url": "https://example.com/post",
      "source": "Official Blog",
      "publishedAt": "source-provided",
      "summary": "用自己的话概括，不复制原文。",
      "impact": "说明对开发者、产品或本站的影响。",
      "toVerify": ["发布前还要核对的问题"],
      "tags": ["model", "tooling"]
    }
  ]
}
```

离线工具不会抓取网页、不会调用模型、不会发布公开内容。

## Generation runner 命令

这些命令操作的是 Studio 数据库中的 durable work item。长任务不放在 HTTP request 内；worker 崩溃后由 lease expiry 和 checkpoint resume 接管。

生成阶段不仅验证 claim 与 evidence 的绑定，还会把标题、导语、事件标题、事实摘要、影响说明和趋势段逐块交给独立 verifier。缺失或重复审查、正文与 claim 不一致、过期 worker 尝试写 revision，以及投影后崩溃导致的重放偏移都会 fail closed。revision/draft 投影会在同一事务中锁住对应 work item，避免 lease 校验后被另一 worker reclaim 的并发穿透。正常一期仍将 extractor 批次、composer 和 verifier 控制在约 4-7 次角色调用内。

```powershell
# 只登记到期来源采集 work，不调用模型
npm.cmd run ai-daily:ingest-tick

# 开发/回归 fixture；显式 --fixture 才允许 mock provider
npm.cmd run ai-daily:run -- --date 2026-07-18 --fixture
npm.cmd run ai-daily:compose -- --issue <issue-id> --fixture
npm.cmd run ai-daily:resume -- --issue <issue-id> --fixture
npm.cmd run ai-daily:editorial-tick -- --fixture
```

## 三角色模型评估与角色选型

AI Daily 不按公开榜单直接指定一个“最佳模型”。extractor、composer 和 verifier 分角色使用同一版 BIAU-owned case set、prompt version、generation schema version 与质量口径进行离线评估，各角色可以选择不同的 primary 与 ordered fallback。

```powershell
npm.cmd run ai-daily:model-evaluation-check
```

这个命令只验证评估和批准 contract，不调用 provider。仓库另有版本化资产 `server/data/ai-daily-model-evaluation-cases.v1.json`，它固定 30 个 BIAU-owned 真实评估案例、6 个业务类别和 8 个负例切片；当前 fixture 使用 40 个扩展案例验证以下规则：

- case descriptor 的 id、role/category、排序后的 `negativeTags` 和 content-bound version 会生成稳定 hash；content-bound version 还包含完整规范化案例内容的 SHA-256 指纹，因此修改 `scenario`、预期编辑结果或评分也会让旧评估失效。候选自报 hash、结果 category/tag 或业务 golden case set 不一致时直接拒绝。业务评估的 `resultSetHash` 还必须绑定完整测量 `cases` 数组的规范化 SHA-256，不能只提供任意格式合法的 64 位字符串；
- extractor、composer、verifier 都会按每个案例声明的负例标签注入角色对应的挑战输入；若实际注入标签集合与 golden contract 不一致，评估会在写入案例结果前失败，不能只在结果聚合时补贴标签；
- 候选必须通过现有绝对质量线，包括零关键事实错误、100% citation precision、至少 98% citation coverage、至少 85% 可接受率和至少 4/5 中文编辑评分；
- 每个类别至少有 4 个案例，每个必需负例切片至少有 3 个案例；任一负例切片出现关键事实错误、citation precision 低于 100%、coverage 低于 90% 或可接受率低于 80%，候选都不能进入审批，即使全局总分仍然通过；
- primary 依次按可接受率、中文评分、citation coverage、citation precision、p95 latency 和稳定 candidate id 排序；
- fallback 必须独立通过全部质量线、与 primary 的可接受率相差不超过 5 个百分点，并使用不同的低敏 failure-domain alias；同一中转或故障域不能被标记为完整冗余；
- `fixture-contract` 记录永远不能进入生产批准；`business-evaluation` 还必须带已完成案例数、非零模型调用计数、评估运行 id、evaluator version 和结果集 hash；
- 候选记录只保留低敏标识、版本、hash、聚合质量指标、延迟和 token 用量摘要；选择记录用稳定 `candidateSetHash` 绑定当时参与选型的候选记录集合。两者都不保存 prompt、原始输出、正文、endpoint、凭据或错误原文。

fixture contract 通过只说明仓库算法和门禁有效，不说明任何真实模型已经评估或获批。真实候选必须在用户批准的业务评估任务中运行，生成三角色选择记录后仍保持 `approval.status=pending`，由人工确认 primary/fallback 和故障域后才能批准。

运行时使用一个 server-only JSON：`channels` 保存模型、私有 base URL、API key、provider alias 与 failure-domain alias，`candidates` 只把候选 id 和角色映射到 channel。每个角色必须配置 2-3 个候选，并至少覆盖两个独立 failure domain；同一个 channel 可以参与多个角色，不需要准备六套密钥。真实值只放 Render secret 或忽略的本地环境文件。

真实业务评估不会由健康检查或部署自动触发。它必须同时满足 `--execute`、`AI_DAILY_BUSINESS_EVALUATION_ENABLED=true`，以及命令中的 `--approval-id` 与 `AI_DAILY_MODEL_EVALUATION_APPROVAL_ID` 完全相同：

```powershell
npm.cmd run ai-daily:model-evaluate -- --execute --approval-id <approved-run-id>
```

评估按候选顺序串行执行，每个角色使用同一份版本化 BIAU-owned golden case set，覆盖官方发布、多来源、数字、更正、中文来源和低证据场景，以及 citation/source 错配、更正反转、日期实体错位、重复归因、低证据越界、数字篡改、范围膨胀和无依据断言。请求不设置 `temperature`，不会并发轰击同一中转。默认只写入被 Git 忽略的 `server/data/ai-daily-model-evaluation.local.json`；内容只有 case score、固定切片聚合、延迟、调用计数和 hash，不保存 prompt、输入正文、原始输出、endpoint、key 或错误响应。

人工确认 proposal 后再执行审批命令；该命令不调用模型，只把 selection 与审核结论写成可审查、用于受控部署交付但不提交仓库的 bundle：

```powershell
npm.cmd run ai-daily:model-approve -- --input server/data/ai-daily-model-evaluation.local.json --reviewed-by site-owner --notes "Measured selection approved for one controlled edition."
```

审批命令默认输出到本地 `server/data/ai-daily-model-approval.v1.json`（该文件被 Git 忽略）。生产部署不依赖仓库中的默认文件：先把它上传为 Render Studio 服务的 Secret File `ai-daily-model-approval.v1.json`，并设置 `AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json` 与命令输出的 `AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH`；后续创建 Editorial Cron 时必须在该服务重复上传。生产 runner 会重新校验 candidate record、selection record、bundle hash、期望 hash，以及 runtime channel 的 provider/failure-domain/model 是否漂移；任何不一致都会 fail closed。

当前 evaluation/proposal/approval 的内部 schema 已升级到 v2；Secret File 文件名和挂载路径继续保持稳定，但任何由旧 evaluator 生成的本地 proposal 或 bundle 都必须删除后重新执行真实业务评估与人工审批，不能原地复用或手工改版本号。

部署前可在已配置同一份 server-only runtime 和审批文件的环境中运行离线检查：

```powershell
npm.cmd run ai-daily:model-approval-check
```

该命令只读本地文件和配置，输出 `networkCalls: 0`，不会调用模型或搜索服务。`ai-daily:production-readiness-check` 在没有这三项配置时报告人工门禁，在配置不完整或校验失败时报告结构性失败。

## Render Cron 运行草案

平台 Cron 使用 UTC 表达式，应用内部使用 `AI_DAILY_TIME_ZONE=Asia/Shanghai` 计算 edition date。每个 job 的执行 deadline 必须短于调度间隔，并依靠 durable work item、lease 和 checkpoint resume 处理重启：

| Job | UTC schedule | command | deadline rule |
| --- | --- | --- | --- |
| Ingest Cron | `*/15 * * * *` | `npm run ai-daily:ingest-tick` | 小于 15 分钟 |
| Editorial Cron | `0 * * * *` | `npm run ai-daily:editorial-tick -- --live` | 小于 60 分钟 |

Render 的环境变量和 Secret File 按服务隔离。Ingest Cron 不调用模型，因此不需要审批 bundle；Editorial Cron 必须单独配置与 Studio 相同的 `AI_DAILY_MODEL_RUNTIME_JSON`、`AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json`、`AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH` 和 `AI_DAILY_PRODUCTION_GENERATION_ENABLED`，并在该 Cron 自己的 **Environment → Secret Files** 上传同一份 `ai-daily-model-approval.v1.json`。只在 Studio 上传文件不能让 Editorial Cron 读取它。

这是启用前的 Render 配置草案，不代表当前已经启用生产自动化。`render.yaml` 故意不创建 Cron，避免 Blueprint 同步绕过人工门禁；通过首个真实版次验收后，再由站点所有者在 Render 控制台创建并启用。editorial runner 已实现 production provider 路径，但默认关闭：`--fixture` 只选择 FIXTURE work，`--live` 只选择 PRODUCTION work，两者互斥；live 还要求 `AI_DAILY_PRODUCTION_GENERATION_ENABLED=true`、完整 runtime config 和已批准 bundle。完成模型评估与一次真实业务版次验收前，必须保持开关为 `false` 且不要创建 Cron。回滚时先暂停两个 Cron，再把 `AI_DAILY_PRODUCTION_GENERATION_ENABLED` 和 `AI_DAILY_PUBLIC_FEED_ENABLED` 都设为 `false`，保留 Studio 手动编辑和离线导出路径。

未配置并获批生产 provider 时，`run`、`compose`、`resume` 和 `editorial-tick` 会 fail closed，不会发送测活请求。首个真实版次使用 `npm.cmd run ai-daily:run -- --date <edition-date> --live` 人工执行；通过 Studio 审核后才考虑 Cron。

## 模型边界

默认模式是 `Codex-only scaffold/review`，草稿或 issue 转换应记录：

```text
model channel: none
```

如果后续需要模型辅助摘要、初稿或润色，必须先有一次明确的内容任务批准。不要为了“测活”调用模型，也不要运行 provider ping。

博客草稿的私有模型配置仍使用博客模型向导；它不等于 AI Daily 的三角色生产选型，也不能替代上面的评估记录：

```powershell
npm.cmd run blog:model -- setup
npm.cmd run blog:model -- status --all --format markdown
npm.cmd run blog:model -- doctor --all --format markdown
```

默认 `doctor` 是离线配置检查，不发送模型请求，也不应明文回显 API key。只有在用户明确批准具体内容任务时，才可以运行 `doctor --live` 或 `blog:draft -- --generate`。AI Daily 真实模型评估必须走独立的三角色业务评估与人工批准门禁，不能用博客向导的配置状态代替。

## 发布导出

审核通过后，在 Studio 创建 Publish Export，然后在本地或 CI 执行：

```powershell
$env:STUDIO_EXPORT_API_BASE="https://<studio-service>.onrender.com"
$env:STUDIO_ADMIN_TOKEN="<owner token>"
npm.cmd run studio:export -- --draft <draft-id-or-slug> --publish-export-id <export-id> --run-checks
```

导出器会写入公开博客数据文件，并可回写导出文件列表和检查结果。默认拒绝覆盖已有 slug；确认重写时需要显式 `--force`。

## 发布前检查

- 每条事实都能追溯到来源链接。
- 摘要是转述，不包含大段复制。
- 没有私有链接、密钥、账号、后台路径或未公开部署细节。
- 没有把样例草稿包装成真实自动日报。
- 没有夸大来源原文，例如“首个”“最强”“彻底替代”。
- AI 辅助方式被标记为 `none`、`summary-assisted`、`draft-assisted` 或 `polish-assisted`。
- 通过 `blog:audit`、`blog:check`、`lint`、`build`，必要时通过 `studio:export -- --sample --dry-run`。

推荐检查命令：

```powershell
npm.cmd run studio:ai-daily-brief-check
npm.cmd run studio:smoke
npm.cmd run studio:export -- --sample --dry-run
npm.cmd run blog:audit
npm.cmd run blog:check
npm.cmd run lint
npm.cmd run build
```

`studio:ai-daily-brief-check` 会验证 issue brief 的默认模板、完整样例、错误 JSON、不完整对象和格式化行为。`studio:smoke` 是默认的无 live 检查入口：它会把 AI Daily 样例草稿写入系统临时目录并自动清理，不会在 `content-drafts/` 留下 smoke 副本，也不会调用模型或抓取网页。

是否每日自动抓取来源、是否自动创建 issue、是否接入真实模型生成，都属于后续单独任务和人工 gate。
