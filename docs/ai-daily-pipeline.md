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
AI_DAILY_MODEL_EVALUATION_APPROVAL_ID=<only required for optional measured evaluation>
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
npm.cmd run ai-daily:rollback-check
npm.cmd run ai-daily:operations-check
npm.cmd run ai-daily:retention-check
npm.cmd run ai-daily:contracts-check
```

`ai-daily:manifest-check` 验证候选来源/查询组资产及人工审核 fail-closed 边界；`ai-daily:model-evaluation-check` 验证可选实测评估的排序、质量线、独立 fallback、hash 和人工批准边界；`ai-daily:model-runtime-check` 使用 loopback HTTP 验证运行时配置、手动静态选型、显式 reduced-redundancy 确认、无 temperature 的结构化请求、两类审批 bundle 防篡改以及 `--fixture/--live` 门禁，不调用外部 provider；`ai-daily:acceptance-check` 验证两类选型路径、首版验收 manifest 的跨阶段绑定、六个门禁、敏感字段禁入和篡改拒绝；`ai-daily:rollback-check` 验证独立 rollback evidence 的结构、绑定、封存和 CLI 往返；`ai-daily:operations-check` 验证专项 diagnostics、低基数 Prometheus 指标、snapshot unavailable 降级和敏感字段禁入规则；`ai-daily:retention-check` 验证 retention dry-run 的候选分类、保护原因、稳定排序、限制和禁止 mutation 契约。`--strict` 只适合在已注入目标部署环境变量的本地/CI preflight 中使用；它仍然不会发出网络请求。需要 disposable 本地 PostgreSQL 时，另外设置 `AI_DAILY_DATABASE_CHECK=1` 后运行 `npm.cmd run ai-daily:contracts-check -- --with-database`，不要指向生产或共享数据库。

## 首版生产验收记录

真实三角色 selection bundle 获批并确定首个 live issue/run 后，先创建一份 Git-ignored 的 rollback evidence，再创建和填写验收 manifest。rollback evidence 必须先于 acceptance seal 完成，因为 acceptance v3 的第六个门禁会校验它的封存 hash 和四元绑定（acceptance、edition、issue、run）：

```powershell
npm.cmd run ai-daily:rollback -- init `
  --evidence-id <evidence-id> `
  --recorded-by <reviewer-alias> `
  --acceptance-id <acceptance-id> `
  --edition-date YYYY-MM-DD `
  --issue-id <issue-id> `
  --run-id <run-id> `
  --reason acceptance-drill
```

人工填写该文件中的数据库备份、上一 Render revision、migration 名、两个 Cron/两个 feature flag 状态、Studio/离线工作流保留状态和 `decision.status`。不要填写 URL、凭据、备份路径、原始错误或内容正文。填写后依次执行：

```powershell
npm.cmd run ai-daily:rollback -- check
npm.cmd run ai-daily:rollback -- seal
npm.cmd run ai-daily:rollback -- check --require-sealed
```

然后创建验收 manifest：

```powershell
npm.cmd run ai-daily:acceptance -- init --acceptance-id <acceptance-id> --edition-date YYYY-MM-DD
npm.cmd run ai-daily:acceptance -- check --rollback server/data/ai-daily-rollback-evidence.local.json
```

默认读取 `server/data/ai-daily-model-selection.local.json`、`server/data/ai-daily-model-approval.v1.json`，写入 `server/data/ai-daily-acceptance.local.json`。若使用可选实测评估路径，则通过 `--proposal server/data/ai-daily-model-evaluation.local.json` 显式指定 proposal。该文件只允许保存以下低敏证据：

- `selectionBasis`、proposal、selection 和 bundle hash，以及审核人别名和批准时间；
- 首个 `PRODUCTION` edition 的 `issueId`、`runId`、日期、完成状态；
- 同一 issue/run/date 下的 Studio draft/review id、草稿版本时间和三个审核勾选；
- Publish Export id、绑定的 draft/review/version、仓库相对输出路径和命令退出码；
- `publicFeed`、`detailPage`、`etag304`、`withdrawn410`、`mobile` 五项部署观察，以及 sealed rollback evidence 的 `evidenceId`、`recordHash`、`status=passed` 引用。

不要写入 prompt、来源正文、文章正文、原始模型输出、模型端点、key/token、数据库 URL、私有后台地址或原始错误。manifest 不主动读取生产数据库，也不访问 Render、搜索服务或模型；值来自用户完成真实业务流程后的低敏记录。

六个 gate 全部通过后再 seal：

```powershell
npm.cmd run ai-daily:acceptance -- seal --rollback server/data/ai-daily-rollback-evidence.local.json
npm.cmd run ai-daily:acceptance -- check --rollback server/data/ai-daily-rollback-evidence.local.json --require-sealed
```

`seal` 会在重新验证 proposal/bundle、candidate/selection、edition/issue/run、Studio draft/review 版本、Publish Export、五项部署观察和 sealed rollback evidence 后生成 canonical `recordHash`。该 hash 只提供确定性完整性和后续漂移检测，不是平台签名或自动执行证明；人工观察和审核人身份仍是信任边界。缺少真实记录或 rollback evidence 时 production readiness 显示 `manual-gate`；已有 manifest/evidence 若 schema、hash 或跨阶段绑定被篡改则显示 `fail`。fixture contract 通过不能替代真实首版验收。

## 生产运维诊断

Studio token 持有者可以读取：

```text
GET /studio/api/ai-daily/operations
```

它从 Studio 数据库生成只读 snapshot，汇总来源健康、run/stage、work backlog、过期 lease、最近 24 小时质量拒绝、公开 Flash 年龄和待处理 retention 数量。响应还把最近 24 小时或仍处于 `DEGRADED` / `FAILING` 的来源错误、最近 24 小时 run/work/event 错误、证据缺口、过期 lease 和新鲜度超限归一化为 `config`、`provider`、`evidence`、`quality`、`infrastructure`、`stale-content` 六类固定故障信号。响应只包含固定枚举、计数和时间，不包含 source URL、run/issue id、provider id、标题、正文、token、数据库 URL 或原始错误。

当 Studio 服务显式设置 `METRICS_ENABLED=true` 和 `AI_DAILY_OPERATIONS_METRICS_ENABLED=true` 时，同一个 snapshot 会追加到 `/metrics`。AI Daily 指标覆盖 source health、run stage/status、latest run freshness/end-to-end lag、work backlog/lease、最近 24 小时 outcome/provider role、issue status、public feed age、retention due 和 `biau_ai_daily_failure_signals{category="..."}`；只使用固定低基数 labels，例如 `health`、`status`、`stage`、`outcome`、`provider_role`、`kind`、`category`、`code` 和 `severity`。freshness、end-to-end lag 和 public flash age 各有独立的 `*_available` gauge，看板只在 availability 为 `1` 时展示年龄，避免把缺失 checkpoint 编码出的 `0` 误读成“刚更新”。故障信号不是唯一事故数，同一事故可能在 source/run/work/event 多处留下信号；看板和告警只按 `> 0` 判断类别是否活跃。provider role 仅区分 primary/fallback 等角色，不输出渠道或模型身份。数据库未配置或 snapshot 查询失败时，只输出 `biau_ai_daily_operations_snapshot_up 0`，不会让 scrape 请求失败或泄露异常。

仓库提供 `observability/ai-daily-grafana-dashboard.json` 和 `observability/ai-daily-prometheus-alerts.yml`，看板除六类故障 panel 外还展示来源健康、work backlog/expired lease、run freshness/lag、provider role、issue 生命周期、公开内容年龄和 retention due；告警模板包含独立的 operations snapshot unavailable 规则。`npm.cmd run ai-daily:observability-contract-check` 会离线验证这些面板表达式、六类故障规则、snapshot 告警、固定 severity、套件注册和敏感字段禁入。模板不包含真实 datasource、scrape URL 或通知目标；导入生产 Grafana/Prometheus/ARMS 和配置通知路由仍需人工完成。

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

## 三角色模型选型与可选评估

运行时使用 `ai-daily-model-runtime-v2` server-only JSON：`channels` 保存模型、私有 base URL、API key、provider alias、failure-domain alias，并强制声明 `protocol: "responses"`；`candidates` 只把候选 id 和 extractor/composer/verifier 角色映射到 channel。真实值只放 Render secret 或忽略的本地环境文件。

### 推荐路径：静态选型，首版做真实质量验收

当前不需要遍历渠道目录或对每个模型执行 30 个案例。按模型职责选择三个 runtime candidate，先生成 pending proposal，再由站点所有者批准：

```powershell
npm.cmd run ai-daily:model-select -- --selection-id ai-daily-initial-static `
  --extractor <extractor-candidate-id> `
  --composer <composer-candidate-id> `
  --verifier <verifier-candidate-id> `
  --acknowledge-reduced-redundancy

npm.cmd run ai-daily:model-select-approve -- `
  --input server/data/ai-daily-model-selection.local.json `
  --reviewed-by site-owner `
  --notes "Static role mapping approved for first-edition Studio review." `
  --acknowledge-reduced-redundancy
```

两个命令都输出 `modelCalls: 0`。proposal/bundle 只保存 candidate id、role、provider/failure-domain alias、model identifier、批准状态和 canonical hash；不保存 endpoint、key、prompt、原始输出、质量分或延迟。每个角色只有一个 primary，因此 artifact 必须保持 `manual-static-selection`、`reduced_redundancy` 和空 fallback，不能把同一中转的多个模型描述成独立容灾。

当前建议把 `qwen3.7-max-t` 对应的 candidate 用于 extractor/verifier，把 `grok-4.5` 对应的 candidate 用于 composer。这里依据的是模型名称和角色职责，不是可用性测活或质量排名。真正的质量 gate 是一份完整 AI Daily 真实版次：进入 Studio 后人工核验事实、来源、引用、中文表达和公开安全，再决定批准、退回或更换模型。

### 可选路径：需要对照或独立 fallback 时再实测

仓库保留完整的 BIAU-owned 评估框架。`npm.cmd run ai-daily:model-evaluation-check` 只验证 30 个 golden cases、6 个业务类别、8 个负例切片、质量线、排序、hash、人工批准和独立 failure-domain fallback contract，不调用 provider。只有明确需要模型对照或建立独立 fallback 时，才运行真实业务评估：

```powershell
$env:AI_DAILY_BUSINESS_EVALUATION_ENABLED = 'true'
$env:AI_DAILY_MODEL_EVALUATION_APPROVAL_ID = '<approved-run-id>'
npm.cmd run ai-daily:model-evaluate -- --execute --approval-id <approved-run-id>
```

真实评估每个角色要求 2-3 个候选并串行执行。完整冗余要求不同 failure domain；同一渠道的多模型对照必须追加 `--allow-reduced-redundancy`，仍不得生成独立 fallback。评估结果默认写入 `server/data/ai-daily-model-evaluation.local.json`，人工检查全局与负例切片的 citation coverage/precision、可接受率、中文评分、延迟和结果 hash 后，再运行：

```powershell
npm.cmd run ai-daily:model-approve -- --input server/data/ai-daily-model-evaluation.local.json --reviewed-by site-owner --notes "Measured selection approved for one controlled edition."
```

`AI_DAILY_MODEL_EVALUATION_APPROVAL_ID` 只属于该可选实测路径；使用静态选型时保持为空即可。健康检查、部署 hook 和 Cron 都不能触发真实评估。

两条审批路径都默认输出本地 `server/data/ai-daily-model-approval.v1.json`（Git 忽略）。生产部署先把它上传为 Render Studio 的 Secret File `ai-daily-model-approval.v1.json`，设置 `AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json` 与输出的 `AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH`；后续创建 Editorial Cron 时必须在该服务重复上传。生产 runner 会重新校验 selection/bundle hash，以及 runtime candidate、role、provider、failure domain 和 model identifier；任何不一致都会 fail closed。

评估 artifact 使用 v2 schema，静态选型 artifact 使用独立 v1 schema，首版验收使用 `ai-daily-acceptance-v3` 并记录 `selectionBasis`。Secret File 文件名和挂载路径保持稳定，但旧本地 proposal/bundle 不能手工改版本号或沿用旧 hash。

部署前可在已配置同一份 server-only runtime 和审批文件的环境中运行：

```powershell
npm.cmd run ai-daily:model-approval-check
```

该命令只读本地文件和配置，输出 `selectionBasis` 与 `networkCalls: 0`，不会调用模型或搜索服务。`ai-daily:production-readiness-check` 在没有 runtime/file/hash 时报告人工门禁，在配置不完整或校验失败时报告结构性失败。

## Render Cron 运行草案

平台 Cron 使用 UTC 表达式，应用内部使用 `AI_DAILY_TIME_ZONE=Asia/Shanghai` 计算 edition date。每个 job 的执行 deadline 必须短于调度间隔，并依靠 durable work item、lease 和 checkpoint resume 处理重启：

| Job | UTC schedule | command | deadline rule |
| --- | --- | --- | --- |
| Ingest Cron | `*/15 * * * *` | `npm run ai-daily:ingest-tick` | 小于 15 分钟 |
| Editorial Cron | `0 * * * *` | `npm run ai-daily:editorial-tick -- --live` | 小于 60 分钟 |

Render 的环境变量和 Secret File 按服务隔离。Ingest Cron 不调用模型，因此不需要审批 bundle；Editorial Cron 必须单独配置与 Studio 相同的 `AI_DAILY_MODEL_RUNTIME_JSON`、`AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json`、`AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH` 和 `AI_DAILY_PRODUCTION_GENERATION_ENABLED`，并在该 Cron 自己的 **Environment → Secret Files** 上传同一份 `ai-daily-model-approval.v1.json`。只在 Studio 上传文件不能让 Editorial Cron 读取它。

这是启用前的 Render 配置草案，不代表当前已经启用生产自动化。`render.yaml` 故意不创建 Cron，避免 Blueprint 同步绕过人工门禁；通过首个真实版次验收后，再由站点所有者在 Render 控制台创建并启用。editorial runner 已实现 production provider 路径，但默认关闭：`--fixture` 只选择 FIXTURE work，`--live` 只选择 PRODUCTION work，两者互斥；live 还要求 `AI_DAILY_PRODUCTION_GENERATION_ENABLED=true`、完整 runtime config 和已批准 bundle。完成模型选型批准与一次真实业务版次验收前，必须保持开关为 `false` 且不要创建 Cron。回滚时先暂停两个 Cron，再把 `AI_DAILY_PRODUCTION_GENERATION_ENABLED` 和 `AI_DAILY_PUBLIC_FEED_ENABLED` 都设为 `false`，保留 Studio 手动编辑和离线导出路径。

未配置并获批生产 provider 时，`run`、`compose`、`resume` 和 `editorial-tick` 会 fail closed，不会发送测活请求。首个真实版次使用 `npm.cmd run ai-daily:run -- --date <edition-date> --live` 人工执行；通过 Studio 审核后才考虑 Cron。

## 模型边界

默认模式是 `Codex-only scaffold/review`，草稿或 issue 转换应记录：

```text
model channel: none
```

如果后续需要模型辅助摘要、初稿或润色，必须先有一次明确的内容任务批准。不要为了“测活”调用模型，也不要运行 provider ping。

博客草稿的私有模型配置仍使用博客模型向导；它不等于 AI Daily 的三角色生产选型，也不能替代上面的静态选型或可选评估记录：

```powershell
npm.cmd run blog:model -- setup
npm.cmd run blog:model -- status --all --format markdown
npm.cmd run blog:model -- doctor --all --format markdown
```

默认 `doctor` 是离线配置检查，不发送模型请求，也不应明文回显 API key。只有在用户明确批准具体内容任务时，才可以运行 `doctor --live` 或 `blog:draft -- --generate`。AI Daily 必须走独立的三角色静态选型/可选业务评估与人工批准门禁，不能用博客向导的配置状态代替。

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

自动抓取、issue 创建和真实模型生成路径已经实现，但生产启用仍是人工 gate：先批准静态 selection bundle 并完成首个真实版次验收，再决定是否打开两个 Cron、production generation 和 public feed。
