# AI 日报工程技术档案

## 项目摘要

AI 日报是一套 evidence-first 的采集、生成、编辑和发布系统，明确拆分 source discovery、original-page evidence、freshness、dedupe、clustering、ranking、durable generation revision、human review、Flash projection 和静态 Daily Edition。[source-verified] 证据：E-AID-001、E-AID-002、E-AID-003。

当前真实状态是“采集闭环已取得 evidence-ready 选择，但生成闭环仍未完成”：在 relay token 漂移修复并重新获批后，唯一一次受控真实 generation attempt 仍在 extraction 的共享 Responses 请求边界以低敏 `provider_error` 失败，没有创建 generated draft 或 public edition；production generation flag 已恢复关闭。[production-observed] 证据：E-AID-008、E-AID-009。

## 产品边界

- source manifest 只登记候选来源和人工启用状态，不是文章库、批准记录、secret 或 readiness 证明。
- search/community result 只是 lead，只有安全抓取的原始页面才能成为 generation evidence。
- Flash 是数据库中 approved active item 的公共投影；Daily Edition 是显式审核后进入 Git 的静态版本。
- internal evidence body、run/work state、review note 和 failure detail 不直接进入公共页面。
- model bundle、server runtime、feature flag 或 approval 缺失/漂移时，系统必须 fail closed。

[source-verified] 证据：E-AID-001、E-AID-004、E-AID-005。

## 架构与职责

后端负责 manifest、ingestion work、lease、checkpoint、evidence、dedupe cluster、ranking、generation revision、Studio review、Flash action、public projection、retention 和 low-sensitive operations。首个真实版次通过前，Cron 不自动进入初始部署蓝图。[source-verified] 证据：E-AID-002、E-AID-006、E-AID-007。

| 子系统 | 权威状态 | 关键合同 | 失败后停止点 |
| --- | --- | --- | --- |
| Ingestion runner | durable work、checkpoint、candidate、evidence | lease、conditional fetch、recovery | evidence-ready 之前 |
| Ranking | cluster、selection version、evidence floor | freshness、dedupe、domain coverage | needs-more-evidence |
| Generation runner | immutable revision、stage、checkpoint | `EXTRACT_FACTS` → `COMPOSE` → `VERIFY` → `VALIDATE` → `DRAFT` | 当前失败 stage |
| Studio editorial | draft、review、approval、hold/release/withdraw/export | version-bound human action | 未明确批准前 |
| Public projection | Flash、Feed/detail、static Edition | allowlist、cursor、rate-limit、ETag、cache | approved 字段之外 |

## 核心实现

- `server/src/aiDailyIngestionRunner.ts`：durable ingestion、lease、checkpoint、conditional fetch、finalization 与 recovery。
- `server/src/aiDailyGenerationRunner.ts`：staged generation 和 immutable revision transition。
- `server/src/aiDailyGeneration.ts`：`VALID`、`NEEDS_EDITOR_REVIEW`、`REJECTED` 到 hidden draft/review/rejection 的投影。
- `server/src/aiDailyStudioProduction.ts`、`server/src/aiDailyGenerationExecution.ts`：feature flag、approved bundle、server runtime 与 execution-time gate。
- `server/src/aiDailyPublicRoutes.ts`：Feed/detail 的 approved projection、cursor、rate-limit、ETag、CORS 与 cache。

[source-verified] 证据：E-AID-002、E-AID-003、E-AID-004、E-AID-005、E-AID-006。

## 核心数据流

1. 人工 review 的 manifest 启用合格 source 和 discovery group。
2. feed/discovery 产生 candidate lead 与 durable work item。
3. runner 使用 conditional request 抓取原页并执行 evidence policy。
4. freshness、canonical identity、dedupe、clustering 和 ranking 选择 evidence-ready item。
5. generation runner 取得 lease，按五阶段推进 checkpoint 与 immutable revision。
6. validation 把 revision 分类为 `VALID`、`NEEDS_EDITOR_REVIEW` 或 `REJECTED`。
7. 只有 `VALID` 可以创建第一个 hidden、review-needed draft；已有人工 draft 不被自动覆盖。
8. editor 在 Studio 中 correct、revalidate、apply、discard、approve、hold、release、withdraw 或 export。
9. public API 与 static Edition 只投影 approved 字段。

[source-verified] 证据：E-AID-002、E-AID-003、E-AID-004。

## 可靠性与故障处理

### Durable work、lease 与 checkpoint

ingestion 和 generation 都不依赖单个 HTTP/Cron 进程寿命。lease 提供有期限执行所有权，checkpoint 标记可安全继续的阶段，提交时使用 owner/version fencing，不能声称绝对 exactly-once。[source-verified] 证据：E-AID-002、E-AID-003。

### Evidence cohort 与 finalization

同一 Edition/config 的有界 run cohort 可以合并候选后重新排序，避免 discovery 与 due feed 因不同 tick 被割裂。空 work run 也必须终止，latest run 按 immutable `createdAt` 排序，不能被旧记录后续 `updatedAt` 改写运营时间线。

### Fail-closed generation

production gate 在 queue、worker startup 和 execution 三层复检。缺少 flag、server-only runtime、approved bundle、hash 或匹配 candidate 时不调用 provider。rollback 先停 schedule，再关 generation/public-feed flag，最后处理代码和投影。[source-verified] 证据：E-AID-005、E-AID-007。

### 低敏失败

provider failure 只保存 request invalid、auth、rate limit、unsupported endpoint、upstream、timeout、network、empty response、invalid JSON、payload too large 或 generic provider failure 等固定类别，不保存 endpoint、credential、prompt、raw body、raw exception 或 model output。[source-verified] 证据：E-AID-005。

## 关键取舍

| 决策 | 选择原因 | 代价或失败信号 | 恢复/回滚 |
| --- | --- | --- | --- |
| lead 与 evidence 分层 | 防止摘要和旧链接直接成为事实 | 抓取、日期和安全门禁增加延迟 | 保留 lead，等待或重新取证，不降 evidence floor |
| durable work + lease | 跨部署、Cron、人工阶段恢复 | schema、租约、fencing 更复杂 | 过期接管，旧 owner 不得覆盖新状态 |
| immutable revision | 审计模型、校验与人工修改 | 数据量和查询复杂度增加 | 创建新 revision，显式 apply/discard |
| human approval | 保留公共内容责任所有者 | lead time 增加 | 修正后 revalidate，旧 approval 不沿用 |
| Flash + static Edition | 同时支持及时更新和稳定归档 | 两套投影与撤回语义 | Flash withdraw；Edition 用 Git commit 回滚 |
| fail-closed bundle | 防止未批准模型或陈旧配置调用 | 流水线可能有意 idle | 修复配置后重新批准，不猜 endpoint 或候选 |

[source-verified] 证据：E-AID-001、E-AID-002、E-AID-004、E-AID-005、E-AID-006；[documented-design] 证据：E-AID-007。

## 安全与隐私

- 只有 server-side production runtime 可以执行真实 generation。
- feature flag、Secret File、approved bundle、hash 与 runtime mapping 全部 fail closed。
- public Feed 使用 approved projection、CORS、cursor、rate-limit、ETag 和 cache contract。
- operations/incident 只使用 bounded category 和 count，不投影 evidence body、source URL、provider identity、credential、prompt 或 raw error。
- fixture 与文档检查默认零模型、零搜索、零数据库和零生产调用。
- acceptance manifest 只保存低敏 hash、状态、日期和仓库路径，不替代数据库、Studio audit 或人工决策。

[source-verified] 证据：E-AID-004、E-AID-005、E-AID-006、E-AID-010。

## 验证矩阵

| 层级 | 代表性门禁 | 能证明什么 | 不能证明什么 |
| --- | --- | --- | --- |
| Manifest/Discovery | schema、query budget、URL/domain、provider fixture | 来源和 discovery contract | 当前原页一定有新内容 |
| Evidence/Ranking | freshness、dedupe、cluster、selection floor | evidence-ready 的确定性选择 | 模型生成或编辑通过 |
| Generation | provider adapter、stage、quality、runner recovery | 五阶段和 fail-closed 状态机 | 真实 provider 请求兼容 |
| Studio/Public | revision、review action、Feed、ETag、UI | 内部审核和 public projection contract | 真实 Edition 已批准发布 |
| Operations | readiness、retention、rollback、observability、acceptance schema | 低敏运维与离线门禁 | Render/Cloudflare 手工动作已发生 |
| Live acceptance | 明确批准的真实版次、人工审核、export、deploy | 指定版本完整业务闭环 | 持续 SLA |

[source-verified] 证据：E-AID-010。

## 交付状态

生产 ingestion 已选出 evidence-ready 内容。relay token 漂移修复后，site-owner 明确批准了一次受控真实版次 `cmsqdx5bp000045j2q7rh3mxj`；它完成 `EXTRACT_FACTS`、`VALIDATE`、`DRAFT` checkpoint，最终为 `COMPLETED_WITH_GAPS`，最新 revision 4 以低敏 `extractor-schema-or-provider-failure` 被 `REJECTED` / `DISCARDED`，保留 8 个 citation snapshot，但没有创建 draft 或 public content。generation flag 已在终态后恢复关闭。[production-observed] 证据：E-AID-008、E-AID-009。

这次真实版次证明了批准、runtime、Secret File/hash、Studio queue、lease worker 和 revision 持久化链路已执行；它没有证明共享 Responses relay/provider 已可完成结构化 extraction。下一步必须先取得新的实质性生产修复和新的 owner 批准，不能把这次失败 Run 当作发布验收。[production-observed] 证据：E-AID-009、E-AID-010。

## 代码入口

- Durable ingestion：`server/src/aiDailyIngestionRunner.ts`
- Durable generation：`server/src/aiDailyGenerationRunner.ts`、`server/src/aiDailyGeneration.ts`
- Production readiness/execution gate：`server/src/aiDailyStudioProduction.ts`、`server/src/aiDailyGenerationExecution.ts`
- Public Feed/detail API：`server/src/aiDailyPublicRoutes.ts`
- Pipeline/operator contract：`docs/ai-daily-pipeline.md`、`.trellis/spec/backend/ai-daily-workflow.md`
- Focused validation：`package.json` 中的 AI Daily scripts

[source-verified] 证据：E-AID-001、E-AID-002、E-AID-003、E-AID-005、E-AID-006、E-AID-010。

## 证据索引

主要证据为 E-AID-001 至 E-AID-010。事故描述故意省略 run ID、service ID、source URL、provider identity、prompt、raw error 和 model output。

## 面试重点

重点准备 lead-to-evidence promotion、durable work/lease/checkpoint、freshness 与 cohort、五阶段 generation、immutable revision、三态 validation、human approval、Flash 与静态 Edition、fail-closed bundle、低敏失败分类、rollback 顺序，以及如何诚实表达“基础设施正常但真实生成仍失败”。
