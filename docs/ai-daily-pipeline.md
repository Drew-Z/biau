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

版本化候选清单位于 `server/data/ai-daily-source-manifest.v1.json`。当前包含 30 个候选来源和 10 个 discovery query groups，覆盖官方模型/平台、开源生态、AI 基础设施、研究、企业 AI、中国 AI、政策安全和多模态/端侧方向。它是审核输入，不是生产批准记录：顶层 `readiness` 仍为 `pending-human-review`，每个来源和查询组都必须保持 `enabled=false + review.status=candidate`，直到用户逐条完成日期、事实、版权、页面结构、来源层级、查询成本和噪声风险审核。

离线校验命令：

```powershell
npm.cmd run ai-daily:manifest-check
```

该检查严格验证 schema version、30-80 条来源范围、唯一 id/canonical URL、公开 HTTPS、locale/domain、TIER_1 官方域名、topics、查询组预算、include/exclude 冲突和审核状态；它复用 ingestion feed 归一化契约，不访问任何来源、搜索 provider、模型、数据库或部署服务。批准时必须为条目填写非空 `reviewedBy`、可解析的 `reviewedAt` 和审核结论，再单独决定是否启用；不要把本地 contract pass 解释为 URL 当前可访问或内容适合公开使用。

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
npm.cmd run ai-daily:operations-check
npm.cmd run ai-daily:retention-check
npm.cmd run ai-daily:contracts-check
```

`ai-daily:manifest-check` 验证候选来源/查询组资产及人工审核 fail-closed 边界；`ai-daily:model-evaluation-check` 验证 extractor/composer/verifier 三角色的离线评估记录、排序、独立 fallback、hash 和人工批准边界；`ai-daily:operations-check` 验证专项 diagnostics、低基数 Prometheus 指标、snapshot unavailable 降级和敏感字段禁入规则；`ai-daily:retention-check` 验证 retention dry-run 的候选分类、保护原因、稳定排序、限制和禁止 mutation 契约。这些检查都只使用仓库资产或纯内存 fixture。`--strict` 只适合在已注入目标部署环境变量的本地/CI preflight 中使用；它仍然不会发出网络请求。需要 disposable 本地 PostgreSQL 时，另外设置 `AI_DAILY_DATABASE_CHECK=1` 后运行 `npm.cmd run ai-daily:contracts-check -- --with-database`，不要指向生产或共享数据库。

## 生产运维诊断

Studio token 持有者可以读取：

```text
GET /studio/api/ai-daily/operations
```

它从 Studio 数据库生成只读 snapshot，汇总来源健康、run/stage、work backlog、过期 lease、最近 24 小时质量拒绝、公开 Flash 年龄和待处理 retention 数量。响应只包含固定枚举、计数和时间，不包含 source URL、run/issue id、provider id、标题、正文、token、数据库 URL 或原始错误。失败告警仅依据最新一次 run，历史失败只保留为总量，不会让系统永久处于告警状态。

当 Studio 服务显式设置 `METRICS_ENABLED=true` 和 `AI_DAILY_OPERATIONS_METRICS_ENABLED=true` 时，同一个 snapshot 会追加到 `/metrics`。AI Daily 指标覆盖 source health、run stage/status、latest run freshness/end-to-end lag、work backlog/lease、最近 24 小时 outcome/provider role、issue status、public feed age 和 retention due；只使用固定低基数 labels，例如 `health`、`status`、`stage`、`outcome`、`provider_role`、`kind`、`code` 和 `severity`。provider role 仅区分 primary/fallback 等角色，不输出渠道或模型身份。数据库未配置或 snapshot 查询失败时，只输出 `biau_ai_daily_operations_snapshot_up 0`，不会让 scrape 请求失败或泄露异常。

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

## 离线模型评估与角色选型

AI Daily 不按公开榜单直接指定一个“最佳模型”。extractor、composer 和 verifier 分角色使用同一版 BIAU-owned case set、prompt version、generation schema version 与质量口径进行离线评估，各角色可以选择不同的 primary 与 ordered fallback。

```powershell
npm.cmd run ai-daily:model-evaluation-check
```

这个命令只验证评估和批准 contract，不调用 provider。当前 fixture 使用 40 个案例验证以下规则：

- case descriptor 的 id、category 和 version 会生成稳定 hash；候选自报 hash 与真实 case set 不一致时直接拒绝；
- 候选必须通过现有绝对质量线，包括零关键事实错误、100% citation precision、至少 98% citation coverage、至少 85% 可接受率和至少 4/5 中文编辑评分；
- primary 依次按可接受率、中文评分、citation coverage、citation precision、p95 latency 和稳定 candidate id 排序；
- fallback 必须独立通过全部质量线、与 primary 的可接受率相差不超过 5 个百分点，并使用不同的低敏 failure-domain alias；同一中转或故障域不能被标记为完整冗余；
- `fixture-contract` 记录永远不能进入生产批准；`business-evaluation` 还必须带已完成案例数、非零模型调用计数、评估运行 id、evaluator version 和结果集 hash；
- 候选记录只保留低敏标识、版本、hash、聚合质量指标、延迟和 token 用量摘要；选择记录用稳定 `candidateSetHash` 绑定当时参与选型的候选记录集合。两者都不保存 prompt、原始输出、正文、endpoint、凭据或错误原文。

fixture contract 通过只说明仓库算法和门禁有效，不说明任何真实模型已经评估或获批。真实候选必须在用户批准的业务评估任务中运行，生成三角色选择记录后仍保持 `approval.status=pending`，由人工确认 primary/fallback 和故障域后才能批准。

## Render Cron 运行草案

平台 Cron 使用 UTC 表达式，应用内部使用 `AI_DAILY_TIME_ZONE=Asia/Shanghai` 计算 edition date。每个 job 的执行 deadline 必须短于调度间隔，并依靠 durable work item、lease 和 checkpoint resume 处理重启：

| Job | UTC schedule | command | deadline rule |
| --- | --- | --- | --- |
| Ingest Cron | `*/15 * * * *` | `npm run ai-daily:ingest-tick` | 小于 15 分钟 |
| Editorial Cron | `0 * * * *` | `npm run ai-daily:editorial-tick`（当前仅保留命令契约） | 小于 60 分钟 |

这是启用前的 Render 配置草案，不代表当前已经启用生产自动化。当前 editorial runner 只有 fixture provider，未实现真实 provider 执行路径；没有 `--fixture` 会 fail closed，带 `--fixture` 也不允许作为生产 Cron。完成 provider 角色选择、来源审核和一次真实业务版次验收后，才可以另行实现并启用 production runner。回滚时先暂停两个 Cron，再把 `AI_DAILY_PUBLIC_FEED_ENABLED` 设为 `false`，保留 Studio 手动编辑和离线导出路径。

未配置并获批生产 provider 时，`run`、`compose`、`resume` 和 `editorial-tick` 会 fail closed，不会发送测活请求。生产 provider 接入属于单独的 production operations gate。

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
