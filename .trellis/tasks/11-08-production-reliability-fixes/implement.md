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
