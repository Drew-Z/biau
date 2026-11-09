# 设计：巡检覆盖与默认只读

沿用现有 CLI、临时报告和 GitHub Actions。用户已确认本项范围；方案已审阅，用户回复“继续”批准实施。

## 1. 覆盖统计合同

`scripts/check-reliability-suite.mjs` 保留既有状态名和 summary 字段，增加：

```text
step.coverage: null | { total, online, degraded, offline, unchecked, planned }
step.coverageStatus: complete | partial | none | unknown
step.evidenceSource: current | previous | none
step.skipReason?: requested | missing-env | no-checks-run
summary.coverage: { complete, partial, none, unknown } // 步骤数，总和等于 summary.total
```

计数单位为步骤报告的检查记录，不是模型请求数或全站去重能力数。外链 synthetic 的汇总记录仍算一项，46 个 URL 明细保留在独立 diagnostics。

| 场景 | step.status | 覆盖与来源 | strict |
| --- | --- | --- | --- |
| 合法非空报告无失败且全部已检查 | passed | complete/current | 0；degraded 仍显示，不代表业务全通过 |
| 部分 online/degraded，其余 unchecked/planned | passed | partial/current | 0，展示未检查数量 |
| 合法报告全部 unchecked/planned | skipped，no-checks-run | none/current | 0，不计 passed |
| 缺环境配置或 `--skip`，有/无历史投影 | skipped，missing-env/requested | none；source=previous/none，coverage=null | 0，旧 online 不算本次覆盖 |
| 子进程失败/超时或报告 ok=false/offline | failed | 合法当前报告如实计数，否则 unknown | 1，失败判定优先 |
| 当前报告缺失、空检查数组、坏 JSON、未知状态、非法 boolean | failed | unknown，coverage=null | 1，不能变为 skipped |

synthetic 统计 `checks`；site-status 统计本次 `targets`，不统计合并的历史 reliabilityProjects；site-monitor 校验 boolean `checks[].ok` 后映射 online/offline。跳过步骤可保留明确标注 preserved 的旧摘要，但不从中获取当前覆盖数。

顶层 `ok` 继续表示没有 failed；全 skipped 时退出 0，同时覆盖为 none。当前报告失败不能用旧快照补成成功。默认操作不写 public/status，显式发布时仍遵守现有可读投影门禁。

## 2. Legal RAG 运行模式

原脚本新增两个互斥 CLI 选项：

- 默认或 `--read-only`：只 GET `/api/health`。不请求 auth status、不发送账号密码、不登录；在业务路径之前返回。
- `--business-checks`：独立 CLI 的明确业务 opt-in，保留原鉴权/seed/query/review/quality 流程。本轮只在 loopback 夹具验证。
- 同时指定两者在请求前失败；环境变量不得将 suite 的显式 readonly 升级为业务模式。

报告增加 `checkMode: read-only | business`。只读 health 成功时保留原健康检查 ID 为 online，其余 3 个保护检查 ID 为 unchecked；增加 `demoAccessStatus=not-checked` 表示业务未验收，不谎称需要凭据或 open-demo。健康失败继续使用原 offline/degraded 状态，保护检查仍 unchecked。

`scripts/check-status-contract.ts` 接受新状态并要求 readonly 的保护检查全部 unchecked、禁止 open-demo。无 checkMode 的历史公开报告仍按原合同读取，不回写历史 JSON；保护检查不能通过删字段提升覆盖。

健康请求沿用现有截止时间，响应头和完整 JSON 读取共用截止信号；正文上限 16 KiB，超体积/坏 JSON/超时使用固定低敏错误并取消正文。不输出 URL、原文、cookie、账号、密码。没有新增自动重试或延长截止时间。

## 3. 套件与 CI

Legal step 增加 `extraArgs: ['--read-only']`，保留缺 `LEGAL_RAG_API_BASE_URL` 时 skipped。工作流只给 suite step 绑定 `${{ vars.LEGAL_RAG_API_BASE_URL }}`，不绑定登录凭据或业务选项。

默认只读合同通过并发布后，设置 GitHub repository variable。值从项目现有公开 health URL 的 origin 推导，只在本地进程传给平台，不新增硬编码 API 地址。设置前重读变量；若已存在且与预期不同，保留并报告冲突。规划期只确认该 variable/secret 不存在，没有修改配置。

只触发一次现有 Reliability workflow：验证 readonly 参数、真实报告来源和覆盖统计；外链/health 仍超时或 5xx 时保留 failed，不循环重跑至绿色。禁止任何真实业务 POST 和模型调用。公开快照仍不自动更新。

## 4. 文件边界

| 文件 | 职责 |
| --- | --- |
| `scripts/check-reliability-suite.mjs` | 覆盖计数、skip 原因/来源、失败优先、Legal readonly 参数 |
| `scripts/check-reliability-report.mjs` | 扩展真实子进程 + loopback 合同，覆盖无配置/部分覆盖/损坏/旧证据 |
| `scripts/check-legal-rag-synthetic.mjs` | 默认只读、显式业务、健康响应边界 |
| `scripts/check-legal-rag-read-only.mjs`（新） | CLI 请求录制与 readonly/business 行为断言 |
| `scripts/check-status-contract.ts` | 新只读状态、旧快照兼容 |
| `src/data/statusTargets.ts` | 同步既有 Legal 业务验收操作提示，明确必须显式 `--business-checks`；公开快照保留历史原文 |
| `package.json`、`.github/workflows/reliability-check.yml` | 专项入口、CI 合同与变量绑定 |
| `docs/site-monitoring.md`、`docs/observability-strategy.md`、`.trellis/spec/backend/observability-guidelines.md` | 模式、覆盖、配置/发布与验证合同 |

不新增依赖/网关/监控服务。并行修改的 `docs/manual-gates.md` 和助手配置不在本次直接修改清单；独立 Legal 业务门禁继续有效，具体新命令写入 monitoring 文档。

## 5. 兼容与回滚

新字段加法扩展；原状态名、summary 字段和顶层 ok 含义保留。明确迁移点是直接运行 Legal 默认不再执行业务，维护者需显式 `--business-checks`。

实施前核对各文件的 Git 基线或集中实体备份，复用本任务恢复组。回滚先移除本次新增 CI variable/绑定，再恢复本任务代码；不能留下新配置触发旧脚本的业务默认路径。无数据库迁移。

修复不会消除 GitHub 504、Render 冷启动或取代人工功能验收；上述限制继续保留。
