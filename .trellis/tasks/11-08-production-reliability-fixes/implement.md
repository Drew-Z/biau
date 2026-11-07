# 实施顺序

1. 已读取会话、任务及后端规范，确认 canonical repo/remote/worktrees，执行工作区只读审计；基线 `bfebfddd`。
2. 集中恢复组 `20261107T211553803Z-production-reliability-fixes` 记录已核验 Git 基线与拟改文件；新任务原不存在。
3. 修复 suite JSON 输出与 Actions artifact，增加成功/失败本地 HTTP 回归，执行 diagnostics、lint、build 和 diff 检查。
4. 独立提交巡检改动、推送并运行无模型 Reliability workflow，取得真实失败原因；有应用修复时追加对应回归。
5. 升级已核实兼容依赖，运行 audit、Prisma generate/validate、server build/smoke、public contracts、前端 build/UI smoke；审查并提交锁文件。
6. 修复知识同步与部署协调，验证未变、变化、过期/损坏、拒绝权限和有界等待。生产同步只在确实需要且授权范围内执行。
7. 按 trellis-check 复核完整交付，沉淀 spec/运维记录、提交推送并核对 CI/线上结果。
8. 清理仅本轮创建的临时资源；保留原有脏文件。P2/P3、日报 schedule 与桌宠按既有任务续作，不能提前标记完成。

## 检查与交付记录

真实模型调用预算为 0；只读健康检查不代表生成质量验收。

### 巡检报告修复

- JSON 输出与 CI 精确 artifact 路径已实现；失败继续保留 exit 1。
- 本地真实 CLI + loopback fixture 覆盖健康 200、503 和生成报告前崩溃；三个场景均验证公共快照字节不变，模型调用 0。
- verification diagnostics、lint、build、workflow YAML 解析、任务上下文校验与 diff 检查通过。公开助手、桌宠等产品代码未修改；没有把本机 build 视为远端验收。
- 已按 trellis-check 审查，并把运行报告/历史投影边界写入 observability spec；下一步提交并取得云端诊断。

### 云端证据与兼容依赖升级

- 巡检修复提交 `49d0747e` 已推送；Site Quality `42417704529` 成功。新 Reliability `42417713069` 的 artifact `13592133092` 正确记录本次检查时间与失败：主站助手健康在 12 秒窗口请求失败，其余 7 项通过、1 项因配置缺失明确跳过。
- 随后只读复检中 Public origin `/health` 返回 200 / `ok=true`，站点代理也恢复 200 JSON。证明服务不是持续不可用；短窗口失败与恢复事实需同时保留，不能据此确认模型失败或已证明冷启动根因。
- Prisma client/adapter/CLI 统一至 7.10.1，Express 至 5.3.0；按原依赖范围更新 body-parser、proxy-addr、qs、undici、zod、fast-uri 等受影响树，未使用 force/overrides，也未新增直接依赖。
- `npm ci --ignore-scripts` 重装成功；Prisma validate/generate、server build/smoke、公开助手 agent/image/model/metrics/quality/API/persistence/rate-limit/web、RAG sync/hybrid/service-modes/smoke、Cloudflare assistant/relay、部署合同、lint、build 通过。生产 npm audit 为 0 critical / 0 high / 0 moderate。
- UI smoke 首次因本地 preview 未启动而连接被拒绝；启动本轮 preview 后 21/21 通过。该环境失败已定位，不涉及产品修改。所有模型调用为 fixture，真实模型调用为 0。

### 助手健康有界复检

- 健康 GET 最多 5 次、间隔 15 秒；认证和路径 4xx 不重试。恢复时保留首次失败摘要，并标记 degraded，持续失败保持 offline / strict exit 1；未进行对话生成验收。
- suite 默认单步预算调整为 240 秒，以容纳七条页面检查和至多两分钟的健康窗口。没有通过付费升级或高频保活改变 Render 的休眠策略。
- 离线健康回归与真实 loopback suite 已覆盖立即成功、超时/503 后恢复、持续失败、HTML 误路由、401/403/404；fixture 延迟为 0，公开快照字节不变，诊断检查通过。

### RAG 部署与索引一致性

- 重新生成知识索引与 Git 无差异，仍是 32/75/176/253；未调用 embedding。
- 新增仅在 completed sync、四表计数、全部向量模型/维度完整时才提供的 indexedSourceChecksum；数据库错误、缺失或损坏证据返回 null。
- 同内容完整索引可直接跳过；差异内容与强制重建仍要求精确部署 commit / checksum。只读模式禁止 POST，实际需要同步会明确失败。
- Blueprint 与 workflow 的触发路径一致，并通过合同测试防止再次漂移；Render 现有手工服务通过官方 API 同步设置，仍使用 free 计划。禁止 checksPass 死锁，workflow 不取消进行中的同步。
- 同步、健康证据、RAG smoke/hybrid、服务模式、server build、部署/人工门禁文档、lint、build 检查通过；生产只读 SQL 复核 completed checksum、四表计数和 75 个完整向量仍与本地匹配。部署与云端只读验收尚待完成。

### 部署中发现的外部依赖

- Public 依赖升级部署 `dep-dbnq168u01pc73de6bh0` / `af391f20` 已 live。
- 健康修复后的 Reliability `42419035774` 中主站/助手已通过；本次仅 public-links 中一个外部入口超时，不能宣称整套巡检全绿。
- Studio 部署 `dep-dbnq18m7bikc73d7qpeg` 在启动迁移失败。平台日志与 Supabase 项目状态共同确认原 Studio 数据库 INACTIVE，错误为 tenant/user not found；不是新依赖的兼容失败。已确认所属组织为 free 并恢复现有项目，未创建资源或启用旧 AI 日报生成开关；恢复和重部署结果待验证。
- Studio 数据库现已 ACTIVE_HEALTHY；只读 SQL 确认可连接、19 个完成迁移、0 个失败迁移。恢复后部署 `dep-dbnqijrrjlhs739j79o0` 正在进行。

### 最终验收（2026-11-08）

- 四个工作提交已推送 main：`49d0747e`、`af391f20`、`f67975b2`、`f2bc34bc`。
- Site Quality `42422003737` 成功；Reliability `42422027905` 为 8 passed / 0 failed / 1 skipped，报告 checkedAt 为 `2026-11-07T22:45:08.131Z`。主站助手第 2 次健康请求恢复，仍按 degraded 保留首次超时；跳过的是缺少 LEGAL_RAG_API_BASE_URL 的专项检查，不能当作该后端业务已验收。
- RAG 由 push 自动触发 `dep-dbnqjgtg1s2s73fsc7g0` / `f2bc34bc`，已 live。Public RAG sync `42422003701` 成功且 skipped=true，checksum `746218d677fbad02a85be2deb2e29bf5cc277ffe4c190ac7877646af360f3cc3`、32 documents / 75 chunks；本次没有 POST 或 embedding。只读维护变量随后删除并确认，正常自动同步恢复。
- Studio 恢复后的部署 `dep-dbnqijrrjlhs739j79o0` 已 live；GET health 为 200 / database=true，未授权 drafts 为 401 missing-studio-token。generation、business evaluation、public Feed、stage diagnostics 四个开关均 false。
- 公开链接本地复检 46/46，云端最新 public-links 也通过。更早的外部链接超时保留为历史失败，不删除或改写。
- Render 仍为原免费实例。助手恢复说明存在暂时不可用窗口，未通过购买实例或持续保活消除此延迟；本机后续一次代理 GET 仍超时，云端实际复检能恢复。没有进行生成质量或对话模型测活。

### 后续独立范围

- 数据库防护：三个较新 PublicAssistant 表的 RLS 与两个 trigger function 的 search_path；当前 anon/authenticated 权限已撤销，未发现此次公开泄漏证据，仍需独立迁移与本地数据库回归。
- Horizon：保留既有自动早晚任务，等待修复后实际 schedule 运行验收；新旧日报 readiness/文档口径另在日报任务统一，本任务不触发真实模型。
- 青珑发布候选已有另一会话的 `11-08-qinglong-release-candidate` 正在推进；原桌宠代码、资产、未跟踪目录全部保留，不合并其交付或代为发布。
- Legal RAG 专项检查仍缺少仓库环境配置；公开链接可达不等于鉴权问答验收。APK 人工发布门禁继续保留。
