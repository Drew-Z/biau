# 潮讯 TideBrief 产品验收矩阵

更新时间：2026-08-18

## 当前结论

潮讯 TideBrief 当前为 **工程就绪、产品仍待验收**。离线合同覆盖来源清单、发现适配器、证据、时效、去重、排序、三角色模型选择、生成 runner、编辑生命周期、Publish Export、公开 payload/feed、回滚与保留策略；离线检查期间 `networkCalls=0`、`providerCalls=0`。最新 v7 真实 Edition 只完成 1 次 extractor 调用，随后被渠道限流（`provider_rate_limited`）阻断，composer/verifier 未执行；Revision 15 已自动拒绝并丢弃，没有 draft、人工审核或公开发布。生产窗口已关闭，下一次真实 Edition 前必须先完成渠道容量/限流处理并重新取得单独批准。

## 验收矩阵

| 环节 | 确定性证据 | 当前状态 | 产品级证据 |
| --- | --- | --- | --- |
| 来源发现 | 33 个来源、10 个查询组、启用/暂缓/拒绝状态与零网络 fixture | 已通过 | 真实 Edition 保留标题、URL、发布时间/抓取时间与来源等级 |
| 证据、时效与去重 | evidence、freshness、dedupe、ranking 与负向案例 | 已通过 | 编辑者核对候选相关性、重复项、过期项和 Tier 1 证据 |
| 三角色生成 | approval bundle、runtime drift、runner resume/deadline、确定性质量 repair 与 30 个 golden case | v7 真实调用在 extractor 阶段被 `provider_rate_limited` 阻断；未进入 composer/verifier | 先解决渠道容量/限流，再由新批准的 v7 runtime 生成一份通过确定性验证的真实 Edition |
| 人工审核 | needs-changes、checklist、revision、review policy 与 optimistic token | 已通过 | Studio 人工修订并批准最终内容与引用 |
| Publish Export | draft/review/version 绑定、公开 payload schema 与回滚契约 | 已通过 | 对同一 Edition 创建 Export，审查静态内容 diff 并部署 |
| 公开 Feed 与详情 | CORS、ETag、分页、fresh/stale/empty/404/410/network 状态 | 已通过合同与 UI fixture；待生产观察 | 桌面和手机验收 Feed、详情、引用、`304` 与撤回语义 |
| 自动化边界 | Cron 默认关闭，retention 仅 dry-run | 已通过 | 首期通过后仍保持 Cron 关闭，另行批准自动化 |

## 已通过命令

```bash
npm run ai-daily:contracts-check
npm run ai-daily:production-readiness-check
npm run ai-daily:source-check
npm run ai-daily:evidence-check
npm run ai-daily:freshness-check
npm run ai-daily:dedupe-check
npm run ai-daily:ranking-check
npm run ai-daily:quality-check
npm run ai-daily:public-payload-check
npm run ai-daily:public-feed-check
npm run studio:review-policy-check
npm run check:ui
```

`ai-daily:production-readiness-check` 在本地进程看不到 Render 私有环境变量，因此报告的 `0/12 production keys` 只代表本地 shell 未配置，不能据此判断线上 Render 缺失。生产值仍需在真实 Edition 前由平台配置和运行结果验证，且不得复制到仓库。

## 2026-08-12 首个真实 Edition 尝试

| 环节 | 低敏结果 |
| --- | --- |
| 真实来源刷新 | 一次手动刷新完成；80 个候选、75 条证据 ready、40 个聚类、8 条入选，22 个 work item 全部成功 |
| 生产配置 | Render runtime 与静态批准 bundle 绑定校验通过；production generation 仅在执行窗口临时开启，business evaluation、Cron 和 public feed 保持关闭 |
| 真实生成 | 同一 Edition 仅执行一次获批重跑；Issue `cmspekr1d000044bmbbnjin5u` 的最新 Run 为 `cmspkl33d000045c7w21irnvy`，HTTP 入口返回 `202`，终态为 `COMPLETED_WITH_GAPS`，`attemptNumber=3` |
| 生成结果 | `EXTRACT_FACTS`、`VALIDATE`、`DRAFT` checkpoint 已记录；Revision 2 使用 `promptVersion=ai-daily-prompt-v3`，`validationStatus=REJECTED`、`applyState=DISCARDED`，保留 8 条 citation snapshot；唯一 critical finding 为 `extractor-schema-or-provider-failure` |
| 审核与发布 | 未创建可审核 draft，未执行 Studio review、Publish Export、部署或公开 Feed 验收 |
| 回滚边界 | rollback evidence `tidebrief-rollback-2026-08-12` 已封存；custom-format 数据库 dump 已完成独立恢复验证，上一 Render revision 与 19 条 migration 已记录，`npm.cmd run ai-daily:rollback -- check --require-sealed` 通过。该 manifest 保留既有 acceptance binding，不冒充对最新 Run 的最终 acceptance seal。`AI_DAILY_PRODUCTION_GENERATION_ENABLED`、`AI_DAILY_PUBLIC_FEED_ENABLED`、`AI_DAILY_BUSINESS_EVALUATION_ENABLED` 均为 `false`，Cron 未创建 |
| 结论 | 真实来源闭环通过，`2566ac15` 已部署实质性 Structured Outputs/provider 边界修复并将 prompt 升级为 `ai-daily-prompt-v4`；修复后的离线质量门和线上 `/health=200` 已通过，但真实生成、人工审核与产品级发布仍未通过。潮讯继续保持“待验收”，不得宣称已发布或每日自动运行。新的 approval bundle/Secret File/hash 与明确业务批准完成前不得继续真实调用 |

## 2026-08-17 CPA 真实 Edition

| 环节 | 低敏结果 |
| --- | --- |
| Studio 连接 | `CORS_ORIGIN` 与当前 `https://biau.pages.dev` Studio origin 对齐；预检 `204`，authenticated workspace `200` |
| 生产配置 | CPA bundle hash `4fa08db8374bef1e8bdc485ad626a69b3765da6efdbda6a8f7253aaa24a70248`；开启部署 `dep-da157vflk1mc73983h0g` live，启动检查 `networkCalls=0`、1 channel、3 candidates、1 failure domain |
| 唯一提交 | 受保护入口只提交一次并返回 `202`；Run `cmswhrctl000049hzeb6mvay4`、work item `cmswhrcw0000149hz0mhjihmi`、attempt 9 |
| 生成结果 | 两次 extractor 与一次 composer 调用成功；唯一 verifier 调用失败为 `provider_invalid_json` / `verifier-schema-or-provider-failure`；Run 终态 `COMPLETED_WITH_GAPS` |
| Revision | Revision 8 `cmswhuytl000c49hziau5us19` 使用 `ai-daily-prompt-v5` / `ai-daily-generation-v2`，保留 8 条 citation，`REJECTED` / `DISCARDED`，0 个内容块且无 projection draft |
| 审核与发布 | 未自动重试，未创建 ContentDraft，未执行 Studio review、Publish Export、内容部署或公开 Feed |
| 关闭窗口 | production generation 立即恢复为 `false`；关闭部署 `dep-da15avou01pc739gokkg` live，workspace=`disabled`，关闭启动检查仍为 `networkCalls=0` |
| 结论 | 当前证据不能区分模型自身输出非法 JSON 与 CPA 丢失 Structured Outputs/SSE 响应形状；先完成 verifier 实质修复，再重新交付和批准一次真实 Edition |

## 2026-08-17 CPA 真实 Edition（attempt 10）

| 环节 | 低敏结果 |
| --- | --- |
| 生产配置 | 继续使用同一获批 CPA bundle；开启部署 `dep-da15rsm7bikc738e0b4g` live，启动检查 `networkCalls=0`、1 channel、3 candidates、1 failure domain |
| 唯一提交 | 受保护入口只提交一次、客户端不重试并返回 `202`；Run `cmswjo7dx00004aiv12tusgck`、work item `cmswjo7gn00014aiv2uzki1dk`、attempt 10 |
| 生成结果 | 两次 extractor 与一次 composer 调用成功；唯一 verifier 调用再次失败为 `provider_invalid_json` / `verifier-schema-or-provider-failure`；Run 终态 `COMPLETED_WITH_GAPS` |
| Revision | Revision 9 `cmswjravo000c4aivuw4me2ad` 使用 `ai-daily-prompt-v5` / `ai-daily-generation-v2`，保留 8 条 citation，`REJECTED` / `DISCARDED`，0 个内容块且无 projection draft |
| 审核与发布 | 未自动重试，未创建 ContentDraft，未执行 Studio review、Publish Export、内容部署或公开 Feed |
| 关闭窗口 | production generation 立即恢复为 `false`；关闭部署 `dep-da163spt0dsc73b3j8v0` live，workspace=`disabled`，全局队列和活动阶段清空，Feed=`404`，error-level 日志为 0 |
| 结论 | 与 attempt 9 相同的 verifier 失败被再次复现；下一步必须先增加低敏 Responses/SSE 响应形状诊断并完成实质修复，不再对未改变 bundle 直接重试 |

## 2026-08-17 CPA 真实 Edition（attempt 14）

| 环节 | 低敏结果 |
| --- | --- |
| 唯一提交 | 受保护入口只提交一次并返回 `202`；Run `cmsx35fz200004ajbvxgxy6dv`、work item `cmsx35g2100014ajbly5xtuyf`、attempt 14 |
| 生成结果 | 两次 extractor、一次 composer 和一次 verifier 全部成功；Responses/SSE/schema 边界通过，Run 仍为 `COMPLETED_WITH_GAPS` |
| Revision | Revision 13 `cmsx37zmr000c4ajb8j327zfb` 为 `REJECTED` / `DISCARDED`，8 条 citation、0 个内容块且无 draft；固定 finding 为 composition 支持不足/矛盾、official evidence 缺失、claim contradiction 与 trend 独立来源不足 |
| 审核与发布 | 未重试，未执行 Studio review、Publish Export、内容部署或公开 Feed |
| 关闭窗口 | production generation 已恢复为 `false`；关闭部署 `dep-da1e4j7lk1mc739r5bjg` live，队列与活动阶段为 0，Feed=`404`，error-level 日志为 0 |
| 零外呼修复 | `ai-daily-prompt-v6` 增加受限 evidence 上下文和一次 verifier 驱动的 composer 修复/复核；第二次仍不通过或出现结构 finding 时保持拒绝。26 项合同及构建/性能/文档门禁通过，`externalProviderCalls=0`；当前 v5 bundle 因 prompt 漂移失效，修复尚未部署或调用模型 |

## 2026-08-17 CPA v6 真实 Edition（Revision 14）

| 环节 | 低敏结果 |
| --- | --- |
| 已交付合同 | 手动静态 bundle hash `8481cd3b66f91054625290034340a49ddddb5063c5e2e87a2477a6c2d60d1a3a`，绑定 `ai-daily-prompt-v6` / `ai-daily-generation-v2`；proposal/bundle 创建与交付校验均为零模型调用 |
| 唯一提交 | 获得单独明确批准后只提交一次；Run `cmsxar81600004bal6qbas8wr` 终态为 `COMPLETED_WITH_GAPS` |
| 生成结果 | 两次 extractor、两次 composer 和两次 verifier 全部成功，证明初稿、首轮验证、单次质量 repair 与 reverify 均执行完成 |
| Revision | Revision 14 `cmsxauh6s000c4bal87hkuhip` 为 `REJECTED` / `DISCARDED`；`composition:subtitle`、`composition:introduction`、`event:evt-openai-bedrock:why-it-matters` 为 `scope_inflation`，claim `grok-bot-launch` 为 `official-evidence-required` |
| 审核与发布 | 未创建 draft，未执行 Studio review、Publish Export、内容部署或公开 Feed |
| 关闭窗口 | 恢复部署 `dep-da1h7mnqj5pc73d21le0` live；production generation 与 stage diagnostics 均 disabled，队列/backlog/活动阶段/expired lease 为 0，Feed=`404`，error-level 日志为 0 |
| v7 零外呼修复 | 后端派生允许/排除 claim、删除 event/event-claim/trend 与重写 block 指令，阻止改名恢复已删事件；每个最终编辑块必须包含简体中文，无可发布 claim 时跳过 repair 调用并 fail closed。27 项合同及构建/性能/文档门禁通过，`externalProviderCalls=0`；v6 bundle 因 prompt 漂移失效 |

## 2026-08-18 CPA v7 真实 Edition（attempt 16）

| 环节 | 低敏结果 |
| --- | --- |
| 生产配置 | v7 bundle hash `962243d6fe24a996d5b2994ba83edcac4fdb8f7f311c657d9194dc99d71aa464`；生成开启部署 `dep-da1ruibl550s73all83g` live，启动交付检查 `networkCalls=0`、1 channel、3 candidates、1 failure domain |
| 唯一提交 | 受保护入口仅提交一次并返回 `202`；Run `cmsy2ipki00003sfrvpopyrp2`、work item `cmsy2ippu00013sfrufqm4ixh`、attempt 16 |
| 生成结果 | 仅 extractor 发起 1 次调用并以 `provider_rate_limited` 失败；composer/verifier 未开始；Run 终态 `COMPLETED_WITH_GAPS` |
| Revision | Revision 15 `cmsy2isvd00083sfrt5s54ll8` 使用 `ai-daily-prompt-v7` / `ai-daily-generation-v2`，保留 8 条 citation，`REJECTED` / `DISCARDED`，0 个内容块且无 projection draft；finding 为 `extractor-schema-or-provider-failure` |
| 审核与发布 | 未自动重试，未创建 ContentDraft，未执行 Studio review、Publish Export、内容部署或公开 Feed |
| 关闭窗口 | production generation 立即恢复为 `false`；关闭部署 `dep-da1sihf40ujc738nkkq0` live，workspace 与 stage diagnostics 均为 `disabled`，待处理/租约/重试队列、backlog、活动阶段和 expired lease 均为 0，Public Feed=`404`，关闭启动检查 `networkCalls=0` 且 error-level 日志为 0 |
| 结论 | 结果把当前阻塞收敛到已批准渠道的限流/容量，而非内容质量或三角色 schema；在完成容量决策前保持产品“待验收”，不提交同一 bundle 的直接重试 |

## 最后人工 gate

1. `ai-daily-prompt-v7` proposal、bundle、Render Secret File/hash 与禁用态部署校验已经完成；bundle hash 为 `962243d6fe24a996d5b2994ba83edcac4fdb8f7f311c657d9194dc99d71aa464`，部署为 `dep-da1j8im417fc73ajorag`，全程零模型调用。
2. 该 bundle 的一次真实 Edition 批准已由 Run `cmsy2ipki00003sfrvpopyrp2` 消费；在渠道容量/限流问题完成处理前，不得直接重试。后续如继续运行，必须重新取得一次单独的真实 Edition 明确批准；不得把 proposal 批准复用为 Edition 批准，也不得用直接重试或无意义测活代替业务验收。
3. 创建 Publish Export，审查静态内容 diff，部署并验收公开 Feed/详情桌面与手机状态。
4. 绑定并封存同一 Edition 的 acceptance/rollback 低敏摘要；全部通过后才能标记产品可用。
