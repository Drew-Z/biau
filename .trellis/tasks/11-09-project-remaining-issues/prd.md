# 项目剩余问题收口：巡检覆盖与 Legal RAG 只读模式

## Goal

让可靠性报告清楚区分实际检查、未检查和历史证据；让 Legal RAG 定时健康检查在任何凭据配置下都不会触发登录、数据导入或模型业务。实现复用现有巡检脚本和报告体系。

用户已于 2026-11-09 选择“创建任务并进入规划”，随后选择“先修复巡检口径和只读模式”。用户审阅设计和实施计划后回复“继续”，已批准进入实施。

## 已知事实

- 外链诊断和 Horizon 首版已在 `98ea0b48` 完成归档；该提交的 Site Quality `42589835840` 成功。
- 后续定时 Reliability `42582679567` 在 `67b9d94a` 失败，报告合同和诊断上传成功；artifact `13657469192` 已解析为 7 passed / 1 failed / 1 skipped。46 个外链中 2 个连续 HTTP 504，分别是 Playlab 的 `ciallo-bill/blog` 与 Anchor 的 `Drew-Z/anchor` GitHub 源码链接；Pet 源码和 Legal RAG health 重试恢复。两仓库当前公开、未归档，后续各一次 HEAD/GET 均为 200。504 根因未知，不据此改地址或放宽失败标准。
- `scripts/check-reliability-suite.mjs:342` 把全 unchecked 的合法报告视为成功，`:439` 将其汇总为 passed。缺配置的 ERP/Xunqiu 各有 3 项 unchecked（`scripts/check-erp-synthetic.mjs:218`、`scripts/check-xunqiu-synthetic.mjs:359`）；本地严格模式复现为 **2 passed / 0 failed / 7 skipped，但实际 0/6 项已检查**，9 份公开快照哈希未变。
- Legal RAG step 要求 `LEGAL_RAG_API_BASE_URL`（suite `:37`），CI 当前未绑定。独立脚本仅凭鉴权/凭据就可继续业务路径（`scripts/check-legal-rag-synthetic.mjs:340`）：登录 `:361`、导入 `:393`、问答 `:405`、合同审查 `:432` 为 POST，质量报告 `:456` 为 GET，没有显式业务模式开关。
- 对已知 Legal RAG health 入口做单次只读 GET 复核时，20 秒内超时；这只证明当前观测窗口的可达性不足，不证明服务长期宕机，也不授权执行受保护业务请求。
- 最新 Horizon 实际 schedule `42574794545` 为 `no-input`、0 模型、发布跳过；旧 pipeline 已声明 Horizon 接续。公开助手在 `docs/manual-gates.md:64` 有 11 月 5 日真实回答与刷新恢复验收，旧 relay 最后 AC 未勾选不能单独证明当前助手故障。
- `render.yaml` 等助手模型文件出现其他工作窗口的未提交修改，本任务保留这些内容，不据此推断生产已切换。

## Requirements

- **R1 证据与分类**：保留失败/恢复与未知根因；本次统计不把历史快照算作当前检查。完整记录和 SHA-256 见 [evidence.json](evidence.json)。
- **R2 历史任务关系**：剩余事项分级见 [assessment.md](assessment.md)。本次只交付 R3，不归档其他任务、不重启旧日报。
- **R3.1 覆盖语义**：增加结构化检查计数和覆盖程度。全部合法 unchecked/planned 的步骤为 skipped；部分检查完成保留部分覆盖。失败、崩溃、缺失/空/损坏报告继续失败。顶层 ok 保持“没有失败”的兼容含义，不等同于所有业务已验收。
- **R3.2 默认只读**：Legal RAG 默认只读，套件显式锁定只读；即使已有凭据、未启用鉴权或已登录，也只请求公开 health，其余三个检查保持 unchecked。仅独立 CLI 明确业务选项允许原流程。
- **R3.3 CI 接入**：通过 GitHub repository variable 绑定已有公开 API base，源码只保存变量名；CI 不注入登录凭据或业务选项。缺变量继续跳过。只进行一次云端只读复验，外部超时如实保留。
- **R4 保护既有成果**：规划只改任务资料；实施保留并行助手配置、公开快照、日报来源/模型/预算和 APK 边界，复用本任务集中恢复组。

## Acceptance Criteria

- [x] **AC1 → R1**：最新失败已映射到目标，首次失败/恢复及未知根因已记录。
- [x] **AC2 → R2**：剩余事项有分级、证据、下一步和历史任务关系；不把旧任务状态当作当前故障。
- [x] **AC3 → R3**：完成并审阅 [design.md](design.md)、[implement.md](implement.md)，再激活实施。
- [x] **AC4 → R4**：任务 JSON、12 个本地链接、Trellis 检查和敏感扫描通过；12 个实体恢复文件哈希已校验、4 个临时 JSON 及其目录已清理，9 份公开快照未变。
- [x] **AC5 → R3.1**：缺配置复现变为 0 passed / 0 failed / 9 skipped；ERP/Xunqiu 各报告本次 0/3 覆盖。部分覆盖、全通过、失败、空/坏报告、历史快照、手动跳过均有行为验证。
- [x] **AC6 → R3.2**：真实 CLI + loopback 夹具证明默认/只读只有一次 GET health；凭据齐全、鉴权关闭、已登录条件不能触发 auth/login、seed、query、review 或 quality。失败/坏 JSON/超时不推进业务。
- [x] **AC7 → R3.2**：显式业务模式仅在夹具仍可完成原流程；冲突选项在请求前拒绝；只读报告不能成为 open-demo。
- [ ] **AC8 → R3.3**：一次实际 CI 报告验证只读参数、配置绑定和覆盖语义；外部 504/超时保留 failed，缺配置/未执行保留 skipped，不以强求绿灯替代验收。
- [ ] **AC9 → R4**：默认验证前后 9 份公开快照相同；零真实业务/模型调用，无原始响应/凭据泄漏，无关修改不进入本任务提交。
- [ ] **AC10 → R3/R4**：专项、状态/诊断/文档合同与 lint/build 通过，提交推送只含本任务成果。

## 已确认实施范围

- 本任务是一项可独立验证的巡检修复；assessment 中其他问题留作后续，不另建子任务。具体合同与顺序见设计和实施计划。

## 不在本轮规划执行范围

- 规划阶段仅修改任务资料。实施阶段的远端变更限于 R3.3 中的公开变量配置和一次只读运行，不配置业务凭据、不执行真实业务或模型调用。
- 重启旧 Studio 日报、网关迁移、历史 worktree/未知目录清理，不作为本任务的默认操作。
- 不扩充重试、不延长截止时间、不替换外链、不取消 TLS 检查、不自动发布状态快照。真实问答/合同审查验收不在本次范围内。
