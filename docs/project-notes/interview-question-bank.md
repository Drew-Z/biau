# Engineering Interview Question Bank

Each answer is intentionally concise enough for interview review while retaining the decision, failure boundary, and evidence pointer. Every entry also includes an explicit follow-up prompt that asks for an alternative, a failure signal, and a verification strategy.

## Chatus

### QA-CHATUS-001
- Scope: chatus
- Question: Chatus 的产品边界是什么，为什么不是公开聊天 SaaS？
- Follow-up: For "Chatus 的产品边界是什么，为什么不是公开聊天 SaaS？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Chatus 面向受信任成员提供邀请制网页工作台，可选访客也必须能力收窄；它不分发公开 API proxy，因此入口可达与账号、工具、记忆或上传可用是两件事。
- Evidence: E-CHATUS-001

### QA-CHATUS-002
- Scope: chatus
- Question: 为什么把成员状态、会话状态和 provider 协调拆开？
- Follow-up: For "为什么把成员状态、会话状态和 provider 协调拆开？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 三类状态的所有权和并发粒度不同：成员根状态管理索引与记忆，会话状态管理消息和流，协调器管理共享容量；拆开后授权、恢复和限流都能独立推理。
- Evidence: E-CHATUS-002

### QA-CHATUS-003
- Scope: chatus
- Question: `UserState` 的主要职责是什么？
- Follow-up: For "`UserState` 的主要职责是什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: `UserState` 是每位成员的根 Agent，负责会话索引、显式长期记忆和清理状态，而不是承载所有会话消息；这样成员级操作不必扫描或锁住每个对话对象。
- Evidence: E-CHATUS-002

### QA-CHATUS-004
- Scope: chatus
- Question: `TeamAgent` 为什么按会话划分？
- Follow-up: For "`TeamAgent` 为什么按会话划分？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 消息、可恢复流、审批、编辑、重发和分支都是单会话一致性问题，按会话划分 Durable Object 能让串行化边界贴近冲突边界，并减少不同对话之间的相互阻塞。
- Evidence: E-CHATUS-002, E-CHATUS-005

### QA-CHATUS-005
- Scope: chatus
- Question: `ProviderCoordinator` 解决了什么问题？
- Follow-up: For "`ProviderCoordinator` 解决了什么问题？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 它把同一 provider offering 的并发租约从单个请求中抽离，统一处理 exclusive、bounded 和 unlimited 模式，使候选跳过、等待和释放容量具有可审计的一致语义。
- Evidence: E-CHATUS-004

### QA-CHATUS-006
- Scope: chatus
- Question: 为什么 fallback 只能发生在首个可见输出之前？
- Follow-up: For "为什么 fallback 只能发生在首个可见输出之前？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 一旦用户已经看到文本、推理或工具结果，再切换 provider 会把两个不同执行上下文拼成一个回答，破坏因果关系和可恢复性；首输出前回退保留了单一响应来源。
- Evidence: E-CHATUS-004

### QA-CHATUS-007
- Scope: chatus
- Question: 空流或只有终止标记为什么算协议失败？
- Follow-up: For "空流或只有终止标记为什么算协议失败？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: HTTP 成功不代表产生了可用回答；空流、畸形事件或只有终止标记都没有满足消息协议，必须在尚未输出时进入明确失败或安全回退，而不能记作成功。
- Evidence: E-CHATUS-004

### QA-CHATUS-008
- Scope: chatus
- Question: 三种 provider 并发模式如何选择？
- Follow-up: For "三种 provider 并发模式如何选择？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 独占资源使用 exclusive，已知并发上限使用 bounded，无需客户端协调的资源使用 unlimited；选择依据是供应方容量合同，而不是为了提高吞吐随意放宽限制。
- Evidence: E-CHATUS-004

### QA-CHATUS-009
- Scope: chatus
- Question: 为什么长期记忆设计为显式文本而不是隐形向量画像？
- Follow-up: For "为什么长期记忆设计为显式文本而不是隐形向量画像？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 显式记忆允许成员查看、修改和清空影响后续回答的稳定偏好，便于解释和纠错；滚动摘要处理上下文压缩，而不是把不可见的相似度结果冒充用户事实。
- Evidence: E-CHATUS-002

### QA-CHATUS-010
- Scope: chatus
- Question: 能力撤销如何影响已经存在的旧会话？
- Follow-up: For "能力撤销如何影响已经存在的旧会话？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Skills 和工具不只在页面投影时检查，还在实际执行时再次校验，因此管理员撤销成员能力后，旧会话即使保留历史 UI 状态也不能继续调用已撤销能力。
- Evidence: E-CHATUS-006

### QA-CHATUS-011
- Scope: chatus
- Question: 受限访客为什么不能直接复用成员能力集合？
- Follow-up: For "受限访客为什么不能直接复用成员能力集合？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 访客缺少成员的信任和数据边界，必须使用固定、收窄的逻辑模型，并排除 BYOK、Skills、MCP、长期记忆、反馈、导出和上传，避免公开入口成为权限旁路。
- Evidence: E-CHATUS-001, E-CHATUS-006

### QA-CHATUS-012
- Scope: chatus
- Question: 登录 session 与 Agent 身份为什么要分层？
- Follow-up: For "登录 session 与 Agent 身份为什么要分层？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: session 证明当前请求属于谁，Agent 状态决定该身份拥有哪些持久会话和能力；把二者分层能在不迁移全部会话数据的情况下轮换 session 或调整访问策略。
- Evidence: E-CHATUS-003, E-CHATUS-006

### QA-CHATUS-013
- Scope: chatus
- Question: 多设备同时编辑会话时如何避免覆盖？
- Follow-up: For "多设备同时编辑会话时如何避免覆盖？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 系统需要携带版本或条件写入信息检测冲突，把编辑和删除作为有来源的状态变化，而不是最后写入者无条件覆盖；冲突结果应显式返回给客户端处理。
- Evidence: E-CHATUS-005

### QA-CHATUS-014
- Scope: chatus
- Question: tombstone 为什么比直接删除记录更可靠？
- Follow-up: For "tombstone 为什么比直接删除记录更可靠？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 离线或延迟设备可能仍持有旧副本，直接删除会让旧副本在下一次同步时被当成新数据写回；tombstone 保留删除事实，使重放能够拒绝复活。
- Evidence: E-CHATUS-005

### QA-CHATUS-015
- Scope: chatus
- Question: 请求 ID 在用户体验和运维中各有什么作用？
- Follow-up: For "请求 ID 在用户体验和运维中各有什么作用？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 用户只需看到短关联号就能反馈一次失败，服务端则用完整请求 ID 串联路由和协议日志；这比把原始错误或消息正文暴露到页面更安全也更可检索。
- Evidence: E-CHATUS-007

### QA-CHATUS-016
- Scope: chatus
- Question: 日志为什么不能记录对话正文来方便调试？
- Follow-up: For "日志为什么不能记录对话正文来方便调试？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 私人工作台的消息可能包含敏感业务内容，完整正文会扩大泄漏和保留范围；应记录低敏阶段、错误类别、耗时和请求 ID，并通过受控重现或夹具定位问题。
- Evidence: E-CHATUS-007

### QA-CHATUS-017
- Scope: chatus
- Question: 托管 provider key 的安全边界是什么？
- Follow-up: For "托管 provider key 的安全边界是什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: key 由管理面写入后加密存入 KV，页面和读取 API 不回显明文；运行时只在需要调用时解密，公开项目页也不能暴露 secret reference、endpoint 或 provider 身份。
- Evidence: E-CHATUS-007

### QA-CHATUS-018
- Scope: chatus
- Question: PWA 更新为什么需要用户确认而不是立即接管？
- Follow-up: For "PWA 更新为什么需要用户确认而不是立即接管？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 生成中的页面包含活跃流和未提交交互，强制刷新可能丢失状态或让用户误判任务失败；提示更新并在安全点切换能保留工作连续性和版本可解释性。
- Evidence: E-CHATUS-001

### QA-CHATUS-019
- Scope: chatus
- Question: 为什么不使用主动 completion 作为 provider 健康检查？
- Follow-up: For "为什么不使用主动 completion 作为 provider 健康检查？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 主动请求会产生费用、配额和可能含敏感配置的额外流量，而且与真实任务分布不一致；Chatus 更适合依据真实任务的脱敏遥测形成可靠性视图。
- Evidence: E-CHATUS-007

### QA-CHATUS-020
- Scope: chatus
- Question: 为什么不开放 OpenAI-compatible API？
- Follow-up: For "为什么不开放 OpenAI-compatible API？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 产品价值集中在成员会话、工具授权、记忆、审批和多设备状态，而公开代理 API 会绕开这些边界并扩大凭据与滥用风险，因此公开面坚持网页工作台。
- Evidence: E-CHATUS-001

### QA-CHATUS-021
- Scope: chatus
- Question: Chatus 的测试为什么同时需要协议测试和视觉测试？
- Follow-up: For "Chatus 的测试为什么同时需要协议测试和视觉测试？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 协议测试验证路由、租约、流和工具状态的语义，视觉测试验证长文本、表格、代码、附件和抽屉在多视口下可用；任一单独通过都不足以证明工作台可用。
- Evidence: E-CHATUS-008

### QA-CHATUS-022
- Scope: chatus
- Question: 为什么生产部署只允许通过 CI？
- Follow-up: For "为什么生产部署只允许通过 CI？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: CI 能固定依赖、类型检查、测试、前端构建、部署 dry-run、真实发布和精确提交 smoke 的顺序，并用 concurrency 约束生产突变，避免本地环境绕过证据链。
- Evidence: E-CHATUS-008

### QA-CHATUS-023
- Scope: chatus
- Question: WebSocket 断线后恢复需要哪些持久状态？
- Follow-up: For "WebSocket 断线后恢复需要哪些持久状态？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 服务端需要知道会话消息、进行中流的标识和已确认边界，客户端需要携带可关联的会话与恢复信息；恢复必须幂等，不能再次提交已经执行的工具动作。
- Evidence: E-CHATUS-002, E-CHATUS-005

### QA-CHATUS-024
- Scope: chatus
- Question: Durable Objects 架构的主要代价是什么？
- Follow-up: For "Durable Objects 架构的主要代价是什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 它简化单 actor 的串行一致性和 WebSocket 亲和，但需要明确对象所有权、迁移、热点、跨对象调用和故障恢复；错误的粒度会把所有成员状态集中成瓶颈。
- Evidence: E-CHATUS-002

### QA-CHATUS-025
- Scope: chatus
- Question: 公开入口返回 200 能证明什么，不能证明什么？
- Follow-up: For "公开入口返回 200 能证明什么，不能证明什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 它只能证明 DNS、TLS、路由和登录工作区在该次观察中可达，不能证明成员凭据、模型回答、工具、记忆、provider 容量或生产数据链路可用。
- Evidence: E-CHATUS-009

## Anchor

### QA-ANCHOR-001
- Scope: anchor
- Question: Anchor 的核心产品价值为什么不是“自动出题”？
- Follow-up: For "Anchor 的核心产品价值为什么不是“自动出题”？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 自动出题容易生成流畅但无依据的内容，Anchor 把 chunk、locator、引用和验证结果建模为一等数据，让学习者能回到原文检查答案，而不是只信任模型措辞。
- Evidence: E-ANCHOR-001, E-ANCHOR-003

### QA-ANCHOR-002
- Scope: anchor
- Question: `SemanticChunker` 为什么要感知 Markdown 和代码结构？
- Follow-up: For "`SemanticChunker` 为什么要感知 Markdown 和代码结构？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 固定字符切分可能截断标题语义、代码符号或解释上下文，结构感知切分能保留段落和符号边界，使 locator 稳定、引用可读并提高后续验证质量。
- Evidence: E-ANCHOR-003

### QA-ANCHOR-003
- Scope: anchor
- Question: 一个好的 locator 需要满足哪些性质？
- Follow-up: For "一个好的 locator 需要满足哪些性质？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: locator 应能被人理解、在同一内容版本内稳定、指向足够精确的章节或行范围，并与 chunk ID 和 content hash 配合，避免仅存不可解释的向量位置。
- Evidence: E-ANCHOR-003

### QA-ANCHOR-004
- Scope: anchor
- Question: content hash 在增量导入中有什么作用？
- Follow-up: For "content hash 在增量导入中有什么作用？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: hash 用于识别内容是否变化，从而跳过未变化来源、重建变化 chunk 并使旧引用失效或进入复核；它减少重复计算，但不能代替路径和版本迁移策略。
- Evidence: E-ANCHOR-003

### QA-ANCHOR-005
- Scope: anchor
- Question: Citation Verification 与 Question Validator 有什么区别？
- Follow-up: For "Citation Verification 与 Question Validator 有什么区别？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Citation Verification 检查引用 chunk 是否真实存在并包含相关材料；Question Validator 检查这些材料是否支持题目答案，两者分别处理引用完整性和语义一致性。
- Evidence: E-ANCHOR-003

### QA-ANCHOR-006
- Scope: anchor
- Question: 为什么不能宣称三层防线“彻底消除幻觉”？
- Follow-up: For "为什么不能宣称三层防线“彻底消除幻觉”？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 切分、引用核验和答案校验都会受解析、检索和模型判断误差影响，它们能降低并暴露风险，却不能给出绝对正确保证；准确表述应是可验证、可拒绝和可复核。
- Evidence: E-ANCHOR-003

### QA-ANCHOR-007
- Scope: anchor
- Question: AI 服务采用 Task 模式有什么好处？
- Follow-up: For "AI 服务采用 Task 模式有什么好处？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 抽取、先修关系、出题、引用核验和答案校验具有不同输入输出与失败语义，拆成 Task 后可以独立测试、重试、替换和记录证据，避免一个巨大 prompt 隐藏所有阶段。
- Evidence: E-ANCHOR-004

### QA-ANCHOR-008
- Scope: anchor
- Question: 为什么选择 local-first？
- Follow-up: For "为什么选择 local-first？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 学习资料和代码可能敏感，本地数据库让导入、练习和进度不依赖持续联网并降低默认上传范围；代价是客户端迁移、备份、恢复和多设备冲突必须更认真设计。
- Evidence: E-ANCHOR-001, E-ANCHOR-002

### QA-ANCHOR-009
- Scope: anchor
- Question: 当前实现为什么应写 sqflite 而不是 Drift？
- Follow-up: For "当前实现为什么应写 sqflite 而不是 Drift？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 技术文档必须以实际依赖和 repository 实现为准，当前包清单使用 sqflite；沿用旧 portfolio 的 Drift 描述会把设计设想误写成源代码事实。
- Evidence: E-ANCHOR-002

### QA-ANCHOR-010
- Scope: anchor
- Question: `AgentCheckpoint` 应保存什么而不应保存什么？
- Follow-up: For "`AgentCheckpoint` 应保存什么而不应保存什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 它应保存可恢复阶段、必要输入引用和进度标识，不应复制全部源文档或不受控的模型上下文；恢复逻辑还必须校验版本，避免用旧 schema 重放新流程。
- Evidence: E-ANCHOR-004

### QA-ANCHOR-011
- Scope: anchor
- Question: BM25 与语义检索为什么组合使用？
- Follow-up: For "BM25 与语义检索为什么组合使用？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: BM25 擅长精确术语、标识符和代码 token，语义检索擅长表达不同但含义相近的内容；混合检索能降低单一路径漏召回，但仍需统一排序与证据阈值。
- Evidence: E-ANCHOR-003, E-ANCHOR-004

### QA-ANCHOR-012
- Scope: anchor
- Question: 苏格拉底式 Interviewer 与普通问答有什么不同？
- Follow-up: For "苏格拉底式 Interviewer 与普通问答有什么不同？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Interviewer 通过逐步追问暴露理解缺口并关联来源，而不是一次输出完整答案；它需要会话状态、难度调节和停止条件，不能只靠一条固定系统提示实现。
- Evidence: E-ANCHOR-004

### QA-ANCHOR-013
- Scope: anchor
- Question: 为什么网页端选择静态 Demo 而不是立即移植 Flutter Web？
- Follow-up: For "为什么网页端选择静态 Demo 而不是立即移植 Flutter Web？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 静态 Demo 能先兑现答题、反馈、引用和进度的核心体验，部署和测试成本低且无 provider 风险；同时明确不代表导入、模型和完整客户端，避免虚假 parity。
- Evidence: E-ANCHOR-006, E-ANCHOR-007

### QA-ANCHOR-014
- Scope: anchor
- Question: 中英文切换如何跨官网和 Demo 保持一致？
- Follow-up: For "中英文切换如何跨官网和 Demo 保持一致？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 两个页面共享 `anchor.locale`，首次使用浏览器语言回退，显式切换后持久化；渲染时同时更新文本、`html.lang`、标题、描述和 ARIA，避免只翻译可见正文。
- Evidence: E-ANCHOR-007

### QA-ANCHOR-015
- Scope: anchor
- Question: 为什么 Demo 进度 key 要带版本号？
- Follow-up: For "为什么 Demo 进度 key 要带版本号？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 数据集和状态结构会演进，版本化 key 让新代码能识别不兼容旧数据并安全重置，而不是把旧字段强行解释成新状态导致题目索引或答案集合损坏。
- Evidence: E-ANCHOR-007

### QA-ANCHOR-016
- Scope: anchor
- Question: localStorage 状态损坏时应该怎么处理？
- Follow-up: For "localStorage 状态损坏时应该怎么处理？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 解析必须捕获异常并校验数据集、题号、选项和提交状态；未知值删除、索引钳制或整体重置，页面仍回到可操作初始态，不能因缓存让 Demo 白屏。
- Evidence: E-ANCHOR-007

### QA-ANCHOR-017
- Scope: anchor
- Question: 如何证明 Demo 没有后台或 AI 调用？
- Follow-up: For "如何证明 Demo 没有后台或 AI 调用？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 除代码审计外，Playwright 在真实生产 origin 上捕获每个请求并断言没有 off-origin 访问，响应 CSP 禁止连接，托管响应也使用 no-transform 阻止边缘注入分析脚本。
- Evidence: E-ANCHOR-007, E-ANCHOR-008

### QA-ANCHOR-018
- Scope: anchor
- Question: 响应式测试为什么同时覆盖 1440、768 和 390 宽度？
- Follow-up: For "响应式测试为什么同时覆盖 1440、768 和 390 宽度？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 三个宽度分别暴露桌面信息密度、平板侧栏压缩和手机长标题与触控问题；仅用 CSS 断点推断无法发现真实内容导致的溢出、遮挡或菜单不可操作。
- Evidence: E-ANCHOR-008

### QA-ANCHOR-019
- Scope: anchor
- Question: 答题反馈为什么必须展示来源摘录而不只显示 locator？
- Follow-up: For "答题反馈为什么必须展示来源摘录而不只显示 locator？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: locator 告诉用户去哪里找，摘录让用户立即判断证据是否真的支持答案；两者结合降低盲信，且能暴露“引用存在但语义不支持”的验证缺口。
- Evidence: E-ANCHOR-006

### QA-ANCHOR-020
- Scope: anchor
- Question: Demo 与完整 Flutter 产品最大的差异是什么？
- Follow-up: For "Demo 与完整 Flutter 产品最大的差异是什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Demo 只有打包数据、浏览器状态和脚本化导师提示；完整产品还涉及文件导入、SQLite 领域数据、AI 任务、检索、检查点、隐私工具和移动端发布，因此不能互相替代验收。
- Evidence: E-ANCHOR-004, E-ANCHOR-006

### QA-ANCHOR-021
- Scope: anchor
- Question: 为什么当前发布状态应称 Android Private Alpha？
- Follow-up: For "为什么当前发布状态应称 Android Private Alpha？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 发布清单只把 Android 列为受支持目标，其他平台缺少等价构建和验收证据；README 的跨平台愿景不能自动升级为当前可发布能力。
- Evidence: E-ANCHOR-009, E-ANCHOR-010

### QA-ANCHOR-022
- Scope: anchor
- Question: 文件夹改名后为什么保留旧 package ID 和数据库名？
- Follow-up: For "文件夹改名后为什么保留旧 package ID 和数据库名？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 本地目录和品牌可以直接变更，但 package ID、数据库文件和 secure-storage key 属于持久兼容合同，直接替换可能造成升级安装、凭据和用户数据丢失，必须单独迁移。
- Evidence: E-ANCHOR-009

### QA-ANCHOR-023
- Scope: anchor
- Question: 两套 Flutter CI 版本漂移说明什么？
- Follow-up: For "两套 Flutter CI 版本漂移说明什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 测试文件数量多不等于当前流水线必然绿色；不同 Flutter 版本可能与 Dart 约束和格式命令不兼容，应统一 toolchain、删除重复路径并用当前提交重新验证。
- Evidence: E-ANCHOR-005

### QA-ANCHOR-024
- Scope: anchor
- Question: 大型项目导入失败时应如何恢复？
- Follow-up: For "大型项目导入失败时应如何恢复？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 导入应按来源和阶段记录进度，利用 content hash 跳过已确认内容，对失败 chunk 可重试并保留错误类别；取消不能留下被误认为完整知识库的半成品状态。
- Evidence: E-ANCHOR-003, E-ANCHOR-004

### QA-ANCHOR-025
- Scope: anchor
- Question: Anchor 下一次发布最重要的验证是什么？
- Follow-up: For "Anchor 下一次发布最重要的验证是什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Web 侧继续守住三路由、双语、12 题和零外部请求；Flutter 侧则优先验证 Android 安装升级、数据库迁移、备份恢复和正式构建，不能用 Demo 通过替代客户端门禁。
- Evidence: E-ANCHOR-008, E-ANCHOR-009

## Public Assistant

### QA-PUBLIC-ASSISTANT-001
- Scope: public-assistant
- Question: 公开助手的信任边界是什么？
- Follow-up: For "公开助手的信任边界是什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 它只处理匿名、只读、公开知识和公开网页，输出经过 allowlist 投影；provider、model、endpoint、prompt、graph 内部状态、原始错误和私有 citation 都不能进入浏览器。
- Evidence: E-PA-001

### QA-PUBLIC-ASSISTANT-002
- Scope: public-assistant
- Question: 为什么采用 LangGraph 而不是一个串行函数？
- Follow-up: For "为什么采用 LangGraph 而不是一个串行函数？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 规划、研究、证据评分、重写、生成和 claim 验证都有条件分支与重试边界，图结构能显式表达状态转移并为每个节点建立独立测试和可观测阶段。
- Evidence: E-PA-002

### QA-PUBLIC-ASSISTANT-003
- Scope: public-assistant
- Question: `plan` 节点需要决定哪些事情？
- Follow-up: For "`plan` 节点需要决定哪些事情？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 它根据问题与模式选择站内、网页或组合研究，并约束研究意图；它不直接生成答案，避免模型在没有证据路径时过早形成结论。
- Evidence: E-PA-002

### QA-PUBLIC-ASSISTANT-004
- Scope: public-assistant
- Question: 站内与网页研究为什么可以并行？
- Follow-up: For "站内与网页研究为什么可以并行？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 两条证据源相互独立，组合问题若串行执行会增加尾延迟；并行后再统一限量和评分，既缩短等待又保留同一 claim 验证边界。
- Evidence: E-PA-002, E-PA-003

### QA-PUBLIC-ASSISTANT-005
- Scope: public-assistant
- Question: 为什么搜索结果只能算 lead？
- Follow-up: For "为什么搜索结果只能算 lead？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 搜索摘要可能截断、过期或错误归因，不能证明原网页真的支持结论；系统必须安全抓取原始 HTTPS 页面后，才把内容提升为可引用 evidence。
- Evidence: E-PA-003

### QA-PUBLIC-ASSISTANT-006
- Scope: public-assistant
- Question: 网页抓取的 SSRF 防护应覆盖什么？
- Follow-up: For "网页抓取的 SSRF 防护应覆盖什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 需要限制协议、解析后的主机和 IP、重定向链、凭据 URL、响应大小与内容类型，并在每次重定向后重新校验，不能只对用户最初输入做字符串检查。
- Evidence: E-PA-003

### QA-PUBLIC-ASSISTANT-007
- Scope: public-assistant
- Question: dense、sparse 和 RRF 各自解决什么？
- Follow-up: For "dense、sparse 和 RRF 各自解决什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: dense 捕获语义近似，sparse 保留精确术语，RRF 用排名而非不可比的原始分数融合两路结果；这对项目名、技术标识和自然语言问题同时存在的站点知识很重要。
- Evidence: E-PA-003

### QA-PUBLIC-ASSISTANT-008
- Scope: public-assistant
- Question: rerank 服务不可用时系统应怎样降级？
- Follow-up: For "rerank 服务不可用时系统应怎样降级？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 应保留已经完成的 dense+sparse 融合结果并标记降级，而不是丢弃全部站内证据或伪造 rerank 分数；最终 claim 验证仍决定回答确定性。
- Evidence: E-PA-003

### QA-PUBLIC-ASSISTANT-009
- Scope: public-assistant
- Question: claim-level citation 验证比答案级引用好在哪里？
- Follow-up: For "claim-level citation 验证比答案级引用好在哪里？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 一个答案可能包含多个事实，尾部放几个链接无法说明哪个来源支持哪句话；claim 级映射能单独降级无支持陈述，并让用户按结论检查证据。
- Evidence: E-PA-002, E-PA-005

### QA-PUBLIC-ASSISTANT-010
- Scope: public-assistant
- Question: 为什么研究重试最多一次？
- Follow-up: For "为什么研究重试最多一次？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 无限重写和搜索会放大延迟、成本与网页风险，而且不能保证补足证据；一次有针对性的恢复后仍不足，就应返回 uncertain 或 partial，而不是继续隐藏失败。
- Evidence: E-PA-002

### QA-PUBLIC-ASSISTANT-011
- Scope: public-assistant
- Question: 什么情况下应返回 uncertain？
- Follow-up: For "什么情况下应返回 uncertain？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 当证据数量、相关性或 claim 支持不足，且一次恢复仍未补齐时，应保留可支持部分并明确不确定性；这比用模型常识填空更符合公开研究助手边界。
- Evidence: E-PA-002

### QA-PUBLIC-ASSISTANT-012
- Scope: public-assistant
- Question: SSE 在这里为什么不是简单 raw token stream？
- Follow-up: For "SSE 在这里为什么不是简单 raw token stream？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 浏览器需要阶段进度、心跳、错误和最终经过 claim 验证的结构化结果，raw token 只表示生成过程；最终结果事件才是可渲染的权威回答合同。
- Evidence: E-PA-004, E-PA-005

### QA-PUBLIC-ASSISTANT-013
- Scope: public-assistant
- Question: SSE 何时允许退回 JSON？
- Follow-up: For "SSE 何时允许退回 JSON？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 只有端点明确不存在、不允许或不支持 SSE 等 legacy 情形才重试 JSON；超时、损坏、不完整、限流或服务失败都应终止该次尝试，避免重复执行研究和计费。
- Evidence: E-PA-005

### QA-PUBLIC-ASSISTANT-014
- Scope: public-assistant
- Question: 为什么 malformed stream 不能静默切换 API base？
- Follow-up: For "为什么 malformed stream 不能静默切换 API base？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 流可能已经执行了研究、写入 turn 或产生部分副作用，换 base 会重复请求并破坏 session 因果；错误必须保持单次尝试和单一 API base 的边界。
- Evidence: E-PA-005

### QA-PUBLIC-ASSISTANT-015
- Scope: public-assistant
- Question: Pages Functions 薄代理为什么也要限制大小？
- Follow-up: For "Pages Functions 薄代理为什么也要限制大小？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 同源代理处在公网入口，若不限制请求、JSON 和流大小，攻击者可占用内存和连接；代理还要设置超时与取消，使上游不会在浏览器离开后无界运行。
- Evidence: E-PA-004

### QA-PUBLIC-ASSISTANT-016
- Scope: public-assistant
- Question: 浏览器取消请求后后端应发生什么？
- Follow-up: For "浏览器取消请求后后端应发生什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Abort 信号应穿过 Pages 代理传给上游，图节点和 fetch 尽可能停止，流 writer 结束且不再推送；取消不能被误记为成功回答或继续消耗网页抓取资源。
- Evidence: E-PA-004

### QA-PUBLIC-ASSISTANT-017
- Scope: public-assistant
- Question: citation 投影为什么要再次过滤 URL？
- Follow-up: For "citation 投影为什么要再次过滤 URL？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 即使服务端研究已验证，浏览器边界仍应只接受无凭据 HTTPS 网页和允许的站内相对路径；防御性投影可阻止内部 citation 或意外 scheme 泄漏。
- Evidence: E-PA-005

### QA-PUBLIC-ASSISTANT-018
- Scope: public-assistant
- Question: 当前页面上下文有什么价值和风险？
- Follow-up: For "当前页面上下文有什么价值和风险？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 页面路径和公开标题能帮助理解“这个项目”之类指代，但不能包含 query、hash、token 或私有编辑状态；它只是规划提示，不能替代检索证据。
- Evidence: E-PA-001, E-PA-005

### QA-PUBLIC-ASSISTANT-019
- Scope: public-assistant
- Question: 为什么只发送最近有限轮历史？
- Follow-up: For "为什么只发送最近有限轮历史？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 有界历史控制请求大小、成本和隐私暴露，也降低早期错误上下文持续污染当前问题的风险；长期产品知识应来自公开索引，而不是无限聊天记录。
- Evidence: E-PA-001

### QA-PUBLIC-ASSISTANT-020
- Scope: public-assistant
- Question: 数据库未配置时为什么仍能回答？
- Follow-up: For "数据库未配置时为什么仍能回答？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 回答主链路依赖公开研究和模型，不应让可选匿名分析数据库成为单点故障；数据库缺失只关闭 turn、feedback 和聚合持久化，并保持响应合同可用。
- Evidence: E-PA-006

### QA-PUBLIC-ASSISTANT-021
- Scope: public-assistant
- Question: 30 天保留策略解决了什么？
- Follow-up: For "30 天保留策略解决了什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 它为反馈、故障复盘和短期多轮体验保留足够窗口，同时避免匿名交互无限累积；长期只保存低敏 topic fingerprint 与计数，不保留可重建对话的正文。
- Evidence: E-PA-006

### QA-PUBLIC-ASSISTANT-022
- Scope: public-assistant
- Question: IP 为什么用于限流却不持久化？
- Follow-up: For "IP 为什么用于限流却不持久化？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: IP 能在进程内提供基本滥用控制，但长期保存会扩大个人数据风险；短期内存限流与匿名 session 分离，数据库只记录不含 IP 的低敏 turn。
- Evidence: E-PA-006

### QA-PUBLIC-ASSISTANT-023
- Scope: public-assistant
- Question: 429 为什么不能自动换另一个 API 地址重试？
- Follow-up: For "429 为什么不能自动换另一个 API 地址重试？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 429 是该次请求的明确容量或策略结果，换地址可能绕过限流并重复执行；客户端应把它作为 terminal，向用户说明稍后重试而不是隐藏配额边界。
- Evidence: E-PA-005

### QA-PUBLIC-ASSISTANT-024
- Scope: public-assistant
- Question: 历史生产验收与当前在线健康有什么区别？
- Follow-up: For "历史生产验收与当前在线健康有什么区别？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 历史验收证明某个版本和环境曾完成 chat、citation、persistence、feedback 与 sync 闭环，当前健康仍需新的时间戳检查；文档不能把过去通过写成持续 SLA。
- Evidence: E-PA-007

### QA-PUBLIC-ASSISTANT-025
- Scope: public-assistant
- Question: 如何设计公开助手的验证矩阵？
- Follow-up: For "如何设计公开助手的验证矩阵？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 分层覆盖图路由、检索、网页安全、claim 验证、API/SSE、持久化、限流、同源代理、知识同步和 UI；fixture 默认无真实模型，live 验收需显式批准。
- Evidence: E-PA-008

## AI Daily

### QA-AI-DAILY-001
- Scope: ai-daily
- Question: source manifest 为什么不是文章数据库？
- Follow-up: For "source manifest 为什么不是文章数据库？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: manifest 只登记候选来源、策略和人工启用状态，不包含已抓取正文、审核结果或生产 secret；把它当文章数据库会跳过 freshness、evidence 和审批边界。
- Evidence: E-AID-001, E-AID-005

### QA-AI-DAILY-002
- Scope: ai-daily
- Question: 搜索发现如何升级为 evidence？
- Follow-up: For "搜索发现如何升级为 evidence？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 搜索或社区结果先成为 lead，随后抓取原始页面并校验状态、内容、时间和安全策略，只有 evidence-ready 记录才能参与聚类、排序和生成。
- Evidence: E-AID-001, E-AID-002

### QA-AI-DAILY-003
- Scope: ai-daily
- Question: 为什么 ingestion 要使用 durable work item？
- Follow-up: For "为什么 ingestion 要使用 durable work item？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 抓取、重试、去重和证据处理可能跨越进程重启与定时 tick，durable work item 保存阶段和结果，使失败可恢复、重复执行可识别且运营状态可查询。
- Evidence: E-AID-002

### QA-AI-DAILY-004
- Scope: ai-daily
- Question: lease 在 runner 中解决什么并发问题？
- Follow-up: For "lease 在 runner 中解决什么并发问题？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 多个 worker 或重叠 Cron 可能同时取得同一工作，lease 赋予有期限的执行所有权；续租、过期接管和条件提交能避免重复生成或覆盖新进度。
- Evidence: E-AID-002, E-AID-003

### QA-AI-DAILY-005
- Scope: ai-daily
- Question: checkpoint 与最终状态有什么区别？
- Follow-up: For "checkpoint 与最终状态有什么区别？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: checkpoint 记录可继续的中间阶段和输入版本，最终状态表达该次 work 或 revision 的业务结论；恢复只能从兼容 checkpoint 开始，不能把中间成功冒充发布成功。
- Evidence: E-AID-003

### QA-AI-DAILY-006
- Scope: ai-daily
- Question: 五阶段 generation pipeline 为什么要拆分？
- Follow-up: For "五阶段 generation pipeline 为什么要拆分？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: EXTRACT_FACTS、COMPOSE、VERIFY、VALIDATE 和 DRAFT 的失败原因、输入输出与重试价值不同，分阶段可以定位证据、写作或校验问题，并保留不可变修订证据。
- Evidence: E-AID-003

### QA-AI-DAILY-007
- Scope: ai-daily
- Question: immutable revision 有什么价值？
- Follow-up: For "immutable revision 有什么价值？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 它保留每次生成、校验和编辑前后的事实，不允许后台悄悄改写历史；人工可以比较、纠正、重验证、应用或丢弃，同时审计哪一版进入公开投影。
- Evidence: E-AID-003, E-AID-004

### QA-AI-DAILY-008
- Scope: ai-daily
- Question: `VALID`、`NEEDS_EDITOR_REVIEW` 和 `REJECTED` 如何影响草稿？
- Follow-up: For "`VALID`、`NEEDS_EDITOR_REVIEW` 和 `REJECTED` 如何影响草稿？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: `VALID` 才能创建首个隐藏且待审草稿，`NEEDS_EDITOR_REVIEW` 只保留 revision 供人工处理，`REJECTED` 不创建草稿；三者不能只用一个 success 布尔值替代。
- Evidence: E-AID-004

### QA-AI-DAILY-009
- Scope: ai-daily
- Question: 为什么生成器不能覆盖已有人工草稿？
- Follow-up: For "为什么生成器不能覆盖已有人工草稿？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 人工草稿包含编辑决策和责任边界，自动覆盖会丢失审阅成果并破坏审计；新模型结果应作为独立 revision，由编辑明确选择是否应用。
- Evidence: E-AID-004

### QA-AI-DAILY-010
- Scope: ai-daily
- Question: human approval 在系统里不是一个按钮而是什么？
- Follow-up: For "human approval 在系统里不是一个按钮而是什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 它是带角色、对象版本、动作、时间和后续投影的状态转换，必须处理 approve、reject、hold、release、withdraw、correct 等不同语义，并保留不可变记录。
- Evidence: E-AID-001, E-AID-004

### QA-AI-DAILY-011
- Scope: ai-daily
- Question: Flash 与 Daily Edition 的主要差异是什么？
- Follow-up: For "Flash 与 Daily Edition 的主要差异是什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Flash 从数据库中投影当前 active 且 approved 的短内容，适合快速更新；Daily Edition 经过人工审核和导出进入 Git 跟踪静态内容，强调稳定版本与可回滚发布。
- Evidence: E-AID-001

### QA-AI-DAILY-012
- Scope: ai-daily
- Question: 公开 feed 为什么不直接返回内部 issue？
- Follow-up: For "公开 feed 为什么不直接返回内部 issue？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 内部 issue 含工作状态、证据正文和审核元数据，公开 API 只应投影稳定 publicId、批准事实、重要性、不确定性与安全 citation，减少信息泄漏和合同耦合。
- Evidence: E-AID-006

### QA-AI-DAILY-013
- Scope: ai-daily
- Question: ETag 对 AI Daily Feed 有什么帮助？
- Follow-up: For "ETag 对 AI Daily Feed 有什么帮助？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Feed 轮询频繁但内容变化较慢，ETag 让浏览器用条件请求得到 304，保留上次成功数据而不重复传输；它还避免刷新时清空页面造成闪烁。
- Evidence: E-AID-006

### QA-AI-DAILY-014
- Scope: ai-daily
- Question: production generation 为什么要多处检查 feature flag？
- Follow-up: For "production generation 为什么要多处检查 feature flag？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 只在 UI 或队列入口检查会被后台 worker、恢复路径或直接命令绕过；queue、worker 和 execution 都 fail closed，才能保证关闭状态不会意外产生真实调用。
- Evidence: E-AID-005

### QA-AI-DAILY-015
- Scope: ai-daily
- Question: approved model bundle 为什么需要版本和审批？
- Follow-up: For "approved model bundle 为什么需要版本和审批？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 模型、参数和 prompt 共同影响输出与成本，运行时必须确认 bundle 完整、已批准且未漂移；仅设置一个模型名不足以证明生产配置经过验收。
- Evidence: E-AID-005

### QA-AI-DAILY-016
- Scope: ai-daily
- Question: provider error 为什么只保存固定分类？
- Follow-up: For "provider error 为什么只保存固定分类？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 原始错误可能含 endpoint、credential、请求正文、prompt 或输出，持久化会扩大泄漏；固定分类足以支持统计、重试和 incident 判断，详细诊断留在受控短期边界。
- Evidence: E-AID-005

### QA-AI-DAILY-017
- Scope: ai-daily
- Question: 低敏 operations snapshot 应包含什么？
- Follow-up: For "低敏 operations snapshot 应包含什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 它适合保存 work 数量、阶段、成功失败分类、延迟桶和 feature 状态，不应包含记录 ID、来源 URL、正文、provider 身份或原始异常，以便公开或跨团队查看。
- Evidence: E-AID-001, E-AID-005

### QA-AI-DAILY-018
- Scope: ai-daily
- Question: 为什么首版不在 Blueprint 中直接创建 Cron？
- Follow-up: For "为什么首版不在 Blueprint 中直接创建 Cron？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 在真实版次、人工审核、导出和回滚尚未验收前自动调度会放大错误和成本；先用受控手工 tick 完成闭环，再启用 Cron 更容易停止和审计。
- Evidence: E-AID-007

### QA-AI-DAILY-019
- Scope: ai-daily
- Question: AI Daily 的 rollback 为什么先停 Cron 和关 flag？
- Follow-up: For "AI Daily 的 rollback 为什么先停 Cron 和关 flag？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 如果先回滚代码，旧调度仍可能启动新 work 或真实调用；先停止输入和执行开关，再处理版本与数据投影，才能冻结系统并保留可诊断状态。
- Evidence: E-AID-007

### QA-AI-DAILY-020
- Scope: ai-daily
- Question: 两次真实 extraction 失败说明了什么？
- Follow-up: For "两次真实 extraction 失败说明了什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 两次获批尝试都在首个 extractor provider request boundary 返回同类低敏错误，证明当时生产生成链路没有越过提取阶段，也没有形成草稿或公开内容。
- Evidence: E-AID-008

### QA-AI-DAILY-021
- Scope: ai-daily
- Question: 更换模型后仍失败能得出什么结论？
- Follow-up: For "更换模型后仍失败能得出什么结论？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 它削弱“单一模型选择导致失败”的假设，支持共享 Responses 请求边界才是当前阻塞点；但仍不能断言具体网络或供应方根因，需新的受控诊断。
- Evidence: E-AID-008

### QA-AI-DAILY-022
- Scope: ai-daily
- Question: 为什么没有 draft 是一个重要事实？
- Follow-up: For "为什么没有 draft 是一个重要事实？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 这证明 fail-closed 状态转换生效：extractor 失败没有被误当成部分成功，也没有把空或未经验证内容投影给编辑或公众；产品状态必须如实写成未完成。
- Evidence: E-AID-008

### QA-AI-DAILY-023
- Scope: ai-daily
- Question: 诊断部署健康能否证明 generation 健康？
- Follow-up: For "诊断部署健康能否证明 generation 健康？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 不能，它只证明服务启动、health 和 workspace 路径在 generation disabled 时可用；部署验证没有调用 provider，因此不能替代一次获批真实 generation acceptance。
- Evidence: E-AID-009

### QA-AI-DAILY-024
- Scope: ai-daily
- Question: 下一次真实模型调用为什么仍需 owner approval？
- Follow-up: For "下一次真实模型调用为什么仍需 owner approval？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 当前 feature flag 已关闭，真实调用会产生外部成本并改变生产状态；在修复请求边界和明确观察项之前，自动重试会违反 fail-closed 与人工发布合同。
- Evidence: E-AID-008, E-AID-009

### QA-AI-DAILY-025
- Scope: ai-daily
- Question: 大量 fixture tests 为什么不能证明生产闭环？
- Follow-up: For "大量 fixture tests 为什么不能证明生产闭环？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: fixture 能验证状态机、校验和投影的确定性，但不覆盖真实凭据、网络、provider 协议、生产数据和人工流程；它们是必要门禁，不是 live acceptance 的替代品。
- Evidence: E-AID-010

## Cross-Project

### QA-CROSS-001
- Scope: cross-project
- Question: 四个项目的 evidence 粒度有什么不同？
- Follow-up: For "四个项目的 evidence 粒度有什么不同？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Chatus 关注 session 与 stream 来源，Anchor 关注 chunk 与 locator，公开助手关注 claim 与 citation，AI Daily 关注 evidence item、revision 和 approval；粒度由用户决策决定。
- Evidence: E-CROSS-002

### QA-CROSS-002
- Scope: cross-project
- Question: 会话 Agent 与 durable work item 的本质区别是什么？
- Follow-up: For "会话 Agent 与 durable work item 的本质区别是什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 会话 Agent 面向交互式、低延迟、按 actor 串行的持续状态；durable work item 面向可排队、可租约接管、跨进程和人工阶段的后台任务，两者失败恢复单位不同。
- Evidence: E-CROSS-004

### QA-CROSS-003
- Scope: cross-project
- Question: Durable Objects、SQLite 和 PostgreSQL 如何按场景选择？
- Follow-up: For "Durable Objects、SQLite 和 PostgreSQL 如何按场景选择？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Durable Objects 适合边缘 actor 与实时连接，客户端 SQLite 适合本地离线私有数据，PostgreSQL 适合服务端关系、队列和审核查询；选择应跟所有权与一致性边界一致。
- Evidence: E-CROSS-001

### QA-CROSS-004
- Scope: cross-project
- Question: 四个系统的恢复策略如何比较？
- Follow-up: For "四个系统的恢复策略如何比较？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Chatus 恢复会话流，Anchor 恢复本地学习检查点，助手最多重做一次研究，AI Daily 用 lease 与 checkpoint 跨 tick 恢复；恢复复杂度随任务持续时间和副作用增长。
- Evidence: E-CROSS-004

### QA-CROSS-005
- Scope: cross-project
- Question: 哪些系统需要 human gate，为什么？
- Follow-up: For "哪些系统需要 human gate，为什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: AI Daily 的发布必须人工批准，因为它形成面向公众的持续内容；Anchor 的导入题目适合人工复核，Chatus 和助手则在即时回答中通过授权或证据校验控制风险。
- Evidence: E-CROSS-002

### QA-CROSS-006
- Scope: cross-project
- Question: 什么是 public projection，为什么四个项目都需要？
- Follow-up: For "什么是 public projection，为什么四个项目都需要？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: public projection 是从内部状态挑选用户完成下一步所需的安全字段；它避免把凭据、内部错误、证据正文、成员数据或审核过程直接等同于公开 API 和页面。
- Evidence: E-CROSS-001

### QA-CROSS-007
- Scope: cross-project
- Question: 为什么普通验证默认不应调用真实模型？
- Follow-up: For "为什么普通验证默认不应调用真实模型？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 真实调用有费用、配额、外部状态和敏感配置，难以确定性复现；协议、状态机和 UI 应先用 fixture 覆盖，只有明确的 live gate 才携带批准与观察目标。
- Evidence: E-CROSS-003

### QA-CROSS-008
- Scope: cross-project
- Question: 如何避免“测试很多但产品不可用”？
- Follow-up: For "如何避免“测试很多但产品不可用”？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 测试矩阵必须同时覆盖领域契约、跨层数据流、真实视口、部署产物和受控生产验收，并明确每个检查能证明什么；不能用单元测试数量代替端到端证据。
- Evidence: E-CROSS-003

### QA-CROSS-009
- Scope: cross-project
- Question: 为什么健康页或 HTTP 200 不能作为完整验收？
- Follow-up: For "为什么健康页或 HTTP 200 不能作为完整验收？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 它们通常只证明入口和进程存活，无法证明凭据、检索、模型、持久化、审核或用户流程；状态页应把 entry、synthetic、metrics 和 observability 分层展示。
- Evidence: E-CROSS-001, E-CROSS-003

### QA-CROSS-010
- Scope: cross-project
- Question: 如何在项目文档中诚实表达失败？
- Follow-up: For "如何在项目文档中诚实表达失败？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 记录发生阶段、已排除假设、未产生的下游状态、当前开关和下一次授权条件，避免贴原始敏感错误，也不把基础设施成功偷换成业务闭环成功。
- Evidence: E-AID-008, E-AID-009

### QA-CROSS-011
- Scope: cross-project
- Question: 四个项目的主要隐私风险分别是什么？
- Follow-up: For "四个项目的主要隐私风险分别是什么？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Chatus 是成员和 provider 数据，Anchor 是导入资料与学习记录，助手是匿名 turn 与内部研究字段，AI Daily 是证据正文、审核和运行细节；因此脱敏策略不能一套通吃。
- Evidence: E-CROSS-001

### QA-CROSS-012
- Scope: cross-project
- Question: 静态 Demo 在产品工程中什么时候是合理选择？
- Follow-up: For "静态 Demo 在产品工程中什么时候是合理选择？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 当目标是验证一条可见交互和证据模型、而完整后端成本或风险过高时合理；前提是使用真实主题数据、完成状态与错误体验，并清楚标注不包含的能力。
- Evidence: E-ANCHOR-006, E-ANCHOR-008

### QA-CROSS-013
- Scope: cross-project
- Question: SSE 请求与 AI Daily 后台 job 的状态模型为何不同？
- Follow-up: For "SSE 请求与 AI Daily 后台 job 的状态模型为何不同？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: SSE 以一次浏览器连接和终端结果为中心，断开通常终止该尝试；后台 job 要跨进程、Cron 和人工等待，必须持久化 lease、checkpoint、revision 和审批状态。
- Evidence: E-PA-004, E-AID-003

### QA-CROSS-014
- Scope: cross-project
- Question: local-first 长期数据与匿名 30 天数据如何取舍？
- Follow-up: For "local-first 长期数据与匿名 30 天数据如何取舍？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: Anchor 的学习记录属于用户长期资产，适合本地持久与迁移；助手 turn 只服务短期反馈和连续性，服务端应最小化并到期删除，数据寿命由产品职责决定。
- Evidence: E-ANCHOR-002, E-PA-006

### QA-CROSS-015
- Scope: cross-project
- Question: live gate 应包含哪些最小信息？
- Follow-up: For "live gate 应包含哪些最小信息？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 应记录目标环境、精确版本、批准人或批准条件、输入类别、预期观察、外部调用边界、低敏结果和回滚动作；缺少这些就难以区分验收与随手测活。
- Evidence: E-CROSS-003

### QA-CROSS-016
- Scope: cross-project
- Question: 跨仓技术文档如何保持可追溯又不泄露本机信息？
- Follow-up: For "跨仓技术文档如何保持可追溯又不泄露本机信息？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 使用仓库标签、commit SHA、repository-relative path、symbol 或 section 和证据标签，禁止开发机绝对路径、credential URL 与私有 source URL；证据登记册集中维护引用。
- Evidence: E-CROSS-001

### QA-CROSS-017
- Scope: cross-project
- Question: 证据验证对延迟和成本有什么影响？
- Follow-up: For "证据验证对延迟和成本有什么影响？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 多一次 fetch、检索、校验或人工审核会增加延迟和资源，但能减少错误公开和返工；可通过并行独立研究、候选限量、缓存和风险分级控制成本。
- Evidence: E-CROSS-002

### QA-CROSS-018
- Scope: cross-project
- Question: 四个系统如何做低敏 observability？
- Follow-up: For "四个系统如何做低敏 observability？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 共同原则是记录阶段、计数、耗时、固定失败类别和请求关联，不记录正文、凭据或 provider 身份；具体 label 还要避免成员、来源 URL、题目和审核对象高基数字段。
- Evidence: E-CHATUS-007, E-AID-005

### QA-CROSS-019
- Scope: cross-project
- Question: 撤销、删除和发布状态为什么都需要单一事实源？
- Follow-up: For "撤销、删除和发布状态为什么都需要单一事实源？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 多个客户端或 worker 若各自推导最终状态，会造成权限复活、进度回退或重复发布；应由 Durable Object、local repository、graph result 或数据库 revision 负责权威转换。
- Evidence: E-CROSS-004

### QA-CROSS-020
- Scope: cross-project
- Question: 面试中如何避免把项目讲成技术名词清单？
- Follow-up: For "面试中如何避免把项目讲成技术名词清单？", which alternative would you compare, what failure signal would change the decision, and which deterministic or production check would prove the boundary?
- Answer: 从用户风险和边界出发，说明为何选择该状态模型、证据粒度和失败策略，再用一次真实或 fixture 观察验证；最后主动讲代价、未完成项和下一道 gate。
- Evidence: E-CROSS-001, E-CROSS-003
