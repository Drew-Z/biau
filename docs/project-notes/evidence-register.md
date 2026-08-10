# 项目证据登记册

## 标签定义

- [source-verified] 已由版本化代码、测试或仓库合同确认；证明实现/合同存在，不自动证明当前生产健康。
- [production-observed] 已由有范围的生产验收或事故记录确认；日期、版本和观察范围仍然是结论的一部分。
- [documented-design] 明确的设计或上线意图，可能仍未启用、未部署或未完成验收。
- [portfolio-claim] 面向公开项目介绍的摘要，仍等待更强证据升级。

每一行记录仓库标签、尽可能不可变的 commit、仓库相对路径、符号/章节，以及该证据可以支持和不能外推的边界。

## Chatus 证据

| ID | 标签 | 仓库 | 提交 | 路径 | 符号或章节 | 观察或边界 |
| --- | --- | --- | --- | --- | --- | --- |
| E-CHATUS-001 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | README.md | 产品边界 | 邀请制成员工作台与可选受限访客；不支持“公共 API proxy”表述。 |
| E-CHATUS-002 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | README.md | 架构概览 | Worker、KV、UserState、TeamAgent 与 ProviderCoordinator 的职责和状态所有权。 |
| E-CHATUS-003 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | src/worker.ts | 路由与响应投影 | 公开路由、Agent/API 路由、请求身份和安全响应行为。 |
| E-CHATUS-004 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | README.md | Provider routing 与 fallback | 优先路由、三种并发模式、畸形流处理和首个可见输出前的 fallback。 |
| E-CHATUS-005 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | README.md | 会话同步 | 编辑、重生成、分支、冲突保护、tombstone 与删除时间线。 |
| E-CHATUS-006 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | README.md | 能力策略 | 成员 Skills 与工具在投影和执行时重新检查，支持撤权作用于旧会话。 |
| E-CHATUS-007 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | README.md | 托管凭据与可观测性 | 加密、不回显明文、request ID、脱敏和真实任务遥测边界。 |
| E-CHATUS-008 | source-verified | chatus | 6b01ce00be169a479d5fd52add913a4a035aaa51 | package.json | 验证脚本 | 前端、测试、typecheck、browser 与 deployment validation 入口。 |
| E-CHATUS-009 | production-observed | blog-semi | 22dde3a68bba02a0f9aab5d8966db2f7cdd5c0a7 | .trellis/tasks/07-27-chatus-anchor-site-integration/implement.md | 生产验证记录 | 2026-07-27 公开入口跳转到 `/react-chat/` 并返回 HTTP 200；没有执行任何 credentialed feature acceptance。 |

## Anchor 证据

| ID | 标签 | 仓库 | 提交 | 路径 | 符号或章节 | 观察或边界 |
| --- | --- | --- | --- | --- | --- | --- |
| E-ANCHOR-001 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | README.md | 产品与工作流 | 可追溯学习目标、import-to-review 流程和 local-first 定位。 |
| E-ANCHOR-002 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | pubspec.yaml | 依赖 | Flutter、Riverpod、sqflite、Dio、secure storage、file 与 sharing 依赖。 |
| E-ANCHOR-003 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | docs/architecture/SYSTEM_OVERVIEW.md | 可追溯流水线 | Semantic chunk、locator、content hash、citation verification 与 question validation。 |
| E-ANCHOR-004 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | lib/services | Agent 与 Task service | Generation task、checkpoint、hybrid search、interview、evaluation 与 privacy service 边界。 |
| E-ANCHOR-005 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | test | 测试清单 | service、database、Agent、privacy、evaluation、UI 与 Private Alpha 测试存在；不能单凭清单宣称当前全绿。 |
| E-ANCHOR-006 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | web/landing/app/scripts/data.js | Demo 数据集 | 三套双语数据、十二道题、citation、explanation 与 scripted tutor content。 |
| E-ANCHOR-007 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | web/landing/app/scripts/app.js | Demo 状态合同 | locale、versioned progress、normalization、answer flow、source display 与 reset。 |
| E-ANCHOR-008 | production-observed | blog-semi | 22dde3a68bba02a0f9aab5d8966db2f7cdd5c0a7 | .trellis/tasks/07-27-chatus-anchor-site-integration/implement.md | 生产验证记录 | 2026-07-27 十二项生产 Playwright 在桌面、平板和移动端通过；HTTP 与 deployed-asset hash 记录了 canonical route 和当次 Web parity。 |
| E-ANCHOR-009 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | docs/private-alpha-release-checklist.md | 发布边界 | Android 是 Private Alpha 目标；其他平台没有等价 release support。 |
| E-ANCHOR-010 | documented-design | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | docs/architecture/SYSTEM_OVERVIEW.md | 未来平台方向 | 跨平台与同步属于设计上下文，不是当前发布证据。 |
| E-ANCHOR-011 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | .github/workflows/ci.yml | Android Private Alpha 与 Web CI | 同一兼容 Flutter toolchain 运行 format、analyze、test 和 Android release build；独立 Web job 运行 unit 与十二项 browser case，不宣称 unsupported iOS build。 |
| E-ANCHOR-012 | source-verified | anchor | 3df49e00fac37bef169631b4c2f986f26df8ab4d | web/tests/demo.spec.js | 完整浏览器回归 | 十二项 case 覆盖全部内置题、recovery/reset、locale metadata、keyboard/ARIA、三视口与 off-origin request。 |

## 公开助手证据

| ID | 标签 | 仓库 | 提交 | 路径 | 符号或章节 | 观察或边界 |
| --- | --- | --- | --- | --- | --- | --- |
| E-PA-001 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | .trellis/spec/backend/public-research-assistant.md | 产品边界 | 匿名、只读、public-only 的回答与 citation contract。 |
| E-PA-002 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | server/src/publicAssistantAgent.ts | runPublicAssistantAgent | LangGraph node、routing、parallel research、bounded retry、verification 与 finalization。 |
| E-PA-003 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | .trellis/spec/backend/public-research-assistant.md | Retrieval 与 Web evidence | public-only hybrid retrieval 以及 lead 到 original-page evidence 的提升。 |
| E-PA-004 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | functions/_shared/assistant.ts | 同源 proxy | request、response、stream、timeout 与 cancellation 上限。 |
| E-PA-005 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | src/utils/publicAssistantApi.ts | Browser API decoder | JSON/SSE 统一 validation、citation filter 与 terminal stream 语义。 |
| E-PA-006 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | server/src/publicAssistantPersistence.ts | 匿名持久化 | optional database、30 天记录、feedback 与长期低敏 counter。 |
| E-PA-007 | production-observed | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | docs/manual-gates.md | 公开助手验收 | 历史 deployed chat、citation、persistence、feedback 与 public-sync acceptance。 |
| E-PA-008 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | package.json | Assistant checks | graph、model、API、persistence、rate-limit、web、sync、hybrid、service-mode 与 UI 命令。 |
| E-PA-009 | documented-design | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | render.yaml | 服务投影 | public、Studio 与 RAG service 的分离及 production flag/binding；不公开真实内部配置。 |

## AI 日报证据

| ID | 标签 | 仓库 | 提交 | 路径 | 符号或章节 | 观察或边界 |
| --- | --- | --- | --- | --- | --- | --- |
| E-AID-001 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | docs/ai-daily-pipeline.md | 端到端流水线 | manifest、ingestion、evidence、ranking、generation、review、Flash 与 static export。 |
| E-AID-002 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | server/src/aiDailyIngestionRunner.ts | Durable ingestion | work item、lease、checkpoint、conditional fetch 与 recovery。 |
| E-AID-003 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | server/src/aiDailyGenerationRunner.ts | Generation stage | extract、compose、verify、validate、draft、checkpoint 与 lease transition。 |
| E-AID-004 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | server/src/aiDailyGeneration.ts | Validation projection | valid、editor-review、rejected 三态与 hidden-draft rule。 |
| E-AID-005 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | .trellis/spec/backend/ai-daily-workflow.md | Fail-closed 与脱敏 | feature flag、approved bundle、server-only runtime 与低敏 provider failure。 |
| E-AID-006 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | server/src/aiDailyPublicRoutes.ts | Public Feed | approved projection、CORS、cursor、rate-limit、ETag 与 cache。 |
| E-AID-007 | documented-design | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | docs/ai-daily-pipeline.md | 调度与回滚 | 预期 Cron cadence 以及“先停 schedule，再关 flag，最后回滚 code”的顺序。 |
| E-AID-008 | production-observed | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | .trellis/tasks/07-17-ai-daily-production-operations/implement.md | Extractor 事故 | 两次获批真实尝试都在共享 Responses request boundary 失败；没有 draft 或 public item。 |
| E-AID-009 | production-observed | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | .trellis/tasks/07-17-ai-daily-production-operations/implement.md | 诊断部署 | production generation disabled 时 service check 通过；部署验证没有 provider call。 |
| E-AID-010 | source-verified | blog-semi | c8c5dcbc39bae97b9f8a6bb8759d4fbcadb7f514 | package.json | AI 日报检查 | focused command 覆盖 pipeline stage、readiness、acceptance、rollback、operations 与 retention。 |

## 跨项目证据

| ID | 标签 | 仓库 | 提交 | 路径 | 符号或章节 | 观察或边界 |
| --- | --- | --- | --- | --- | --- | --- |
| E-CROSS-001 | source-verified | blog-semi | 22dde3a68bba02a0f9aab5d8966db2f7cdd5c0a7 | docs/project-notes/cross-project-patterns.md | 共同边界 | 从 E-CHATUS-002、E-ANCHOR-003、E-PA-002、E-AID-003 推导；比较 public projection，不声称共享实现。 |
| E-CROSS-002 | source-verified | blog-semi | 22dde3a68bba02a0f9aab5d8966db2f7cdd5c0a7 | docs/project-notes/cross-project-patterns.md | 证据约束设计 | 从 E-CHATUS-004、E-ANCHOR-003、E-PA-003、E-AID-004 推导；比较 session、chunk、claim 与 editorial boundary。 |
| E-CROSS-003 | source-verified | blog-semi | 22dde3a68bba02a0f9aab5d8966db2f7cdd5c0a7 | docs/project-notes/cross-project-patterns.md | 确定性检查 | 从 E-CHATUS-008、E-ANCHOR-005、E-PA-008、E-AID-010 推导；区分 fixture check 与获批 live call。 |
| E-CROSS-004 | source-verified | blog-semi | 22dde3a68bba02a0f9aab5d8966db2f7cdd5c0a7 | docs/project-notes/cross-project-patterns.md | 故障与恢复 | 从 E-CHATUS-004、E-ANCHOR-007、E-PA-002、E-AID-002 推导；比较四套独立验证的 recovery contract。 |

## 生产观察边界

[production-observed] 只表示记录了一次有范围事件：入口响应、生产浏览器套件通过、某项 acceptance 完成，或某个失败确实发生。它不表示持续可用。

AI 日报的 production observation 特意记录了生成失败且 generation flag 关闭；不得改写成“真实日报已生成”或“生产闭环完成”。Anchor 的 Web 回归不得外推到 Android 安装、SQLite migration 或模型质量；Chatus 入口 HTTP 200 也不得外推到 credentialed member capability。
