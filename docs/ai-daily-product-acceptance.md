# 潮讯 TideBrief 产品验收矩阵

更新时间：2026-08-12

## 当前结论

潮讯 TideBrief 当前为 **工程就绪，真实 Edition 生成已尝试但未通过，产品待验收**。离线合同覆盖来源清单、发现适配器、证据、时效、去重、排序、三角色模型选择、生成 runner、编辑生命周期、Publish Export、公开 payload/feed、回滚与保留策略；离线检查期间 `networkCalls=0`、`providerCalls=0`。真实来源刷新已完成，但最新生成 revision 仍被固定质量门禁拒绝，未进入人工审核或发布。

## 验收矩阵

| 环节 | 确定性证据 | 当前状态 | 产品级证据 |
| --- | --- | --- | --- |
| 来源发现 | 33 个来源、10 个查询组、启用/暂缓/拒绝状态与零网络 fixture | 已通过 | 真实 Edition 保留标题、URL、发布时间/抓取时间与来源等级 |
| 证据、时效与去重 | evidence、freshness、dedupe、ranking 与负向案例 | 已通过 | 编辑者核对候选相关性、重复项、过期项和 Tier 1 证据 |
| 三角色生成 | approval bundle、runtime drift、runner resume/deadline 与 30 个 golden case | 已通过离线合同 | 获批 runtime 完成一次真实 Edition 生成 |
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

## 最后人工 gate

1. 在 `2566ac15` 部署和离线/健康校验通过后，重新生成并明确批准 `prompt-v4` 对应的 approval bundle，再批准一次真实 Edition；当前不得以重试代替修复。
2. 完成真实来源采集、候选审核、生成、Studio 人工修订与批准。
3. 创建 Publish Export，审查静态内容 diff，部署并验收公开 Feed/详情桌面与手机状态。
4. 绑定并封存同一 Edition 的 acceptance/rollback 低敏摘要；全部通过后才能标记产品可用。
