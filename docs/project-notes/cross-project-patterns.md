# 跨项目工程模式与系统设计比较

## 共同边界

四套系统都把内部工作模型与对外投影分开：Chatus 投影经过 session/capability 检查的工作台响应；Anchor 投影带 locator 的学习证据；公开助手投影 verified claim 与 citation；AI 日报投影 approved Flash 或 Edition。[source-verified] 证据：E-CROSS-001。

| 系统 | 工作单元 | 权威/持久边界 | 对外输出 | 不可外推的能力 |
| --- | --- | --- | --- | --- |
| Chatus | conversation turn | 成员/会话 Durable Object 与 provider lease | 邀请制工作台响应 | 入口 200 不证明成员、模型、工具健康 |
| Anchor | source-to-practice lifecycle | local SQLite repository 与 checkpoint | 可定位题目、解释和引用 | Web Demo 不证明完整 Flutter 客户端 |
| 公开助手 | bounded anonymous request | graph state 与可选 30 天持久化 | verified claim 与 citation | 历史 acceptance 不等于当前在线 |
| AI 日报 | ingestion/editorial work item | database lease、checkpoint、revision、approval | approved Flash 或 static Edition | evidence-ready 不等于生成或发布成功 |

共同原则不是“统一技术栈”，而是先确定谁拥有权威状态、用户下一步需要什么证据、哪一步会产生不可逆或误导性效果，再选择存储与恢复模型。

## 证据约束设计

四个系统的 evidence 粒度不同：

- Chatus：session authority、stream origin、tool approval，重点是交互因果和能力边界。
- Anchor：chunk ID、locator、content hash、citation、validation state，重点是学习内容可回到原文。
- 公开助手：claim 与 citation 的逐条支持关系，重点是公开回答可以按结论复核。
- AI 日报：original-page evidence、immutable revision、human approval，重点是公共内容有编辑责任链。

共同规则是：discovery 不是 evidence，model output 不是 approval，public projection 不是 internal source of truth。[source-verified] 证据：E-CROSS-002。

## 确定性检查

四个项目都在高风险边界使用确定性检查：Chatus 覆盖协议、租约和 UI fixture；Anchor 覆盖切块、验证、进度与浏览器；公开助手覆盖 graph、API、retrieval、SSRF 与 SSE；AI 日报覆盖 state machine、readiness、rollback 与 projection。[source-verified] 证据：E-CROSS-003。

| 证据层 | 适合证明 | 不适合证明 |
| --- | --- | --- |
| Unit/contract fixture | 纯函数、状态转移、错误分类、输入输出边界 | 外部服务兼容与当前生产健康 |
| Integration/browser | 跨层数据流、真实 DOM、取消、视口与持久化夹具 | 真实成员/模型/生产数据 |
| Build/deploy contract | 当前提交可打包、配置形状、产物完整 | 业务流程已完成 |
| Production observation | 指定时间、版本、输入和范围的真实行为 | 持续 SLA 或未执行的相邻能力 |

真实 provider、网页和生产 mutation 必须是单独、明确批准的 live gate，不能混入普通文档、Lint、Build 或 UI 检查。

## 失败闭合对比

| 系统 | 最后可信边界 | fail-closed 行为 | 防止的误导或副作用 |
| --- | --- | --- | --- |
| Chatus | 首个可见输出前 | 可回退；可见后失败则终止 | 两个 provider 响应拼接、工具重复 |
| Anchor | citation/answer validation | 保留失败候选，不提升为可信题目 | 带引用但错误的学习内容 |
| 公开助手 | claim evidence grade | 返回 partial/uncertain | 用模型常识填补无证据结论 |
| AI 日报 | flag/runtime/bundle/approval 与每个 generation stage | 拒绝入队或执行，不创建 public content | 未批准调用和未经编辑的发布 |

“fail closed”不表示所有错误使用相同代码，而是每套系统都找到误导性或不可逆效果之前的最后边界，并拒绝在证据不足时越过它。[source-verified] 证据：E-CROSS-002、E-CROSS-004。

## 实时与异步执行

Chatus 与公开助手是 request-oriented：用户等待会话流或有界研究回答，因此 cancellation、首个可见输出、terminal result、latency 和 replay safety 更重要。Anchor 是本地交互与长会话混合模型，依赖客户端 repository 和 checkpoint，而不是服务端 lease。AI 日报是 asynchronous editorial pipeline，work 可跨 process、Cron 和人工等待，必须持久化 lease、checkpoint、revision 与 approval。

把实时流误建模为后台 job 可能重放已经显示的输出；把编辑流水线封装成单个 HTTP 请求会在部署或人工等待时丢失进度与责任状态。[source-verified] 证据：E-CHATUS-004、E-ANCHOR-004、E-PA-002、E-AID-002。

## 故障与恢复

| 系统 | 恢复单位 | 重复执行风险 | 关键保护 |
| --- | --- | --- | --- |
| Chatus | 单会话已确认流边界 | 重复消息、工具、审批 | actor 串行、origin、幂等恢复、可见输出边界 |
| Anchor | 来源/任务/checkpoint | 重复导入、旧来源引用、部分 seed | content hash、版本、repository、validation state |
| 公开助手 | 一次匿名研究 attempt | 重复研究、计费、持久化 | 一次 rewrite、SSE terminal、Abort、单 API base |
| AI 日报 | work/stage/revision | 重复抓取、模型调用、发布 | lease fencing、checkpoint、immutable revision、approval |

恢复不是捕获异常后从函数开头 retry，而是回答三个问题：哪些状态已经提交、哪些副作用可以重复、谁拥有当前版本。[source-verified] 证据：E-CROSS-004。

## 隐私与公开投影

四套系统需要排除的敏感数据不同：Chatus 是成员、对话、provider 和凭据；Anchor 是导入资料、学习记录和 credential；公开助手是匿名 turn、内部 graph/provider 字段和不安全 citation；AI 日报是 evidence body、source URL、run/review detail、prompt 与 raw error。

可复用的评审问题是：“哪些字段是用户完成下一步决策所必需的，哪些字段只满足内部调试或好奇？”Public DTO 应使用 allowlist，新增内部字段默认不进入公开输出。

## 关键取舍

| 设计选择 | 主要收益 | 主要成本 | 适用判断 |
| --- | --- | --- | --- |
| Durable Object actor | 实时连接亲和与单 actor 串行 | ownership、migration、hotspot | 状态天然按成员/会话分区 |
| local-first SQLite | 隐私、离线、用户数据所有权 | schema、backup、multi-device | 客户端长期私有资产 |
| claim verification | 答案可逐条审计 | retrieval/grade latency、uncertain output | 公开研究与事实回答 |
| human editorial gate | 公共内容责任明确 | lead time、状态复杂度 | 需要持续发布和撤回的内容 |
| static Demo | 确定性、低成本、低风险 | 不能代表完整产品 | 只需展示一条核心交互和边界 |

不存在一套对所有项目都最优的“AI 架构”。正确选择应同时说明用户风险、状态所有权、替代方案、失败信号和验证证据。

## 证据索引

跨项目结论由 E-CROSS-001 至 E-CROSS-004 及其引用的项目级证据推导。它们用于比较，不表示四套系统共享代码框架、部署拓扑或生产成熟度。
