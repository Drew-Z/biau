# 剩余事项盘点

以 `98ea0b48` 为代码基线；本轮读取真实云端运行、低敏诊断，并完成一次无公网输入的 ERP/Xunqiu 复现。实施优先级以用户已选择的巡检修复为准。

| 优先级 | 事项与证据 | 判断与下一步 | 历史任务关系 |
| --- | --- | --- | --- |
| P1，本次 | 全 unchecked 被计入 passed；suite `:342`、`:439`，本地 0/6 仍 2 passed | 增加覆盖统计并修正 skipped；缺配置不是产品故障 | 外链诊断的后续报告修复，见 PRD R3.1 |
| P1，本次 | Legal RAG `:340`–`:456` 无显式业务运行 gate；CI 未绑定 base | 先完成默认只读/显式业务模式，再绑定只读配置 | 独立业务验收仍属于原人工门禁 |
| P2，运营观察 | 两条 GitHub 链接连续 504 后 HEAD/GET 均 200；Legal health 云端重试恢复、本地 GET 超时 | 保留每次带时间的观测，未知根因不写成结论；暂不改重试/地址/服务套餐 | 已归档外链任务成功捕获一次真实云端失败，不能把新外部 504 当作诊断功能失效 |
| P2，记录核对 | 旧 relay PRD `:27` 未勾选，`docs/manual-gates.md:64` 有 11 月 5 日真实回答和恢复验收 | 材料范围/版本不同，不能推断当前助手失败；模型文件正在并行修改，之后核对部署与任务状态 | 保留 `08-04-public-assistant-cloudflare-model-relay`；不重用已消费的单次模型授权 |
| P2，独立业务验收 | Legal demo 缺凭据和真实业务证据，`src/data/statusTargets.ts:311`、`docs/manual-gates.md:268` | 准备可回收低权限账号及具体任务后再验收；只读通过不代表问答/审查通过 | `07-14-manual-gates-closure` |
| P2，旧方案记录 | 旧 pipeline PRD `:3` 已声明 Horizon 接续，operations 仍含旧方案门禁 | 后续核对是否标注 superseded；不恢复旧 Feed/Cron/generation | `07-17-ai-daily-production-pipeline`、`07-17-ai-daily-production-operations` |
| P2，内容处理 | manual-gates 任务 implement `:19` 的 needs-changes 草稿/首次 Publish Export 未完成 | 需要单独编辑和审阅，不能靠巡检计数完成 | 原 Studio 人工队列保留 |
| P3，后续规划 | 网站 roadmap 40/40 子项完成，UI loop 仍开放；统计/监控平台属可选 | 不凭活动任务数推断业务故障，不在本次顺手归档或部署平台 | 保留原任务各自范围 |

最新 Horizon 实际定时 `42574794545` 于 2026-11-09 14:43（上海）触发，结果为 `2026-11-09-morning / no-input / modelCalls=0`，发布跳过。这是正常空结果，不能写成新刊生成成功；来源覆盖与调度延迟继续运营观察。

## 并行工作保护

已观察到 `.env.example`、`.trellis/spec/backend/public-research-assistant.md`、`render.yaml`、`scripts/check-deployment-contract.mjs`、`docs/deployment.md`、`docs/manual-gates.md` 和 workspace index 的已有/并行修改。未知 ` .trellis/`、`undefined/`、UI/青珑资料、图标和 vendor 产物保留。实施前重读 Git 状态，不能以此清单代替并发核对。

## 证据索引

- [evidence.json](evidence.json)：云端报告、46 目标诊断、映射、后续 HEAD/GET、单次 health GET、无配置复现、公开快照哈希。
- [外链归档记录](../archive/2026-11/11-08-public-link-reliability/implement.md)。
- [Horizon 定时验收](../archive/2026-11/11-06-ai-daily-replanning/schedule-validation.md)。
- [现行人工门禁](../../../docs/manual-gates.md) 与 [可观测性规范](../../spec/backend/observability-guidelines.md)。
