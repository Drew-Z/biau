# Chatus 工程技术档案

## 项目摘要

Chatus 是部署在 Cloudflare 上的邀请制私人 AI 工作台。前端使用 React，边缘入口由 Worker 负责，成员级和会话级状态由不同 Agent/Durable Object 持有，供应方容量由独立协调器管理；长期记忆、能力授权、工具审批、流恢复和发布门禁都是显式合同。[source-verified] 证据：E-CHATUS-001、E-CHATUS-002、E-CHATUS-008。

它的核心工程目标不是提供一个无状态 completion endpoint，而是维护可恢复、可授权、可追溯的工作关系。成员拥有会话索引和显式记忆，会话拥有消息与流生命周期，共享 provider 容量则由第三个所有者协调。拆分后，授权、恢复、并发和 fallback 可以分别推理。

## 产品边界

- 产品面向受信任成员，可选访客入口也必须采用收窄能力，不是公开聊天 SaaS 或公共 API proxy。[source-verified] 证据：E-CHATUS-001。
- 登录页可达不表示账号、访问码、guest、BYOK、工具、MCP、长期记忆、上传、导出或反馈公开可用。
- 主站只公开邀请制入口和经过脱敏的架构说明，不公开私有仓库、访问材料、成员记录、provider 身份、加密值、真实容量和内部运营细节。
- 不带凭据的 HTTP 观察只能证明入口层，不能外推到成员会话、模型、工具或持久化链路。

## 架构与职责

React 客户端通过 Agent-aware hooks 和 WebSocket 使用会话状态。Worker 负责静态资源、路由选择、session 检查、public-safe API 投影、request ID 和错误脱敏。[source-verified] 证据：E-CHATUS-002、E-CHATUS-003。

三个 Durable Object/Agent 职责如下：

| 所有者 | 权威状态 | 主要并发边界 | 不应承担的职责 |
| --- | --- | --- | --- |
| `UserState` | 成员会话索引、显式长期记忆、账户清理状态 | 同一成员的成员级变更 | 保存所有会话消息或共享 provider 容量 |
| `TeamAgent` | 单会话消息、流、审批、编辑、重生成、继续和分支 | 同一会话的顺序与冲突 | 管理其他会话或成员级策略事实源 |
| `ProviderCoordinator` | offering 的 exclusive/bounded/unlimited 租约 | 跨会话共享容量 | 持有消息正文或成员凭据 |

访问策略和加密托管密钥保存在 KV。浏览器与读取 API 不获得托管凭据明文。[source-verified] 证据：E-CHATUS-002、E-CHATUS-007。

## 核心实现

- `src/index.ts` 导出 Worker 和三类 Durable Object。
- `src/worker.ts` 负责公开路由、session guard、API projection、request ID 与错误脱敏。
- `client/src/components/ChatWorkspace.tsx` 将 React 工作台连接到 Agent/WebSocket 状态和可恢复聊天合同。
- provider routing 与 stream adapter 负责优先级、并发租约、协议归一和“首个可见输出后禁止 fallback”。
- capability policy 在投影和执行两个时点检查 Skills 与工具，使撤权能够作用于旧会话。

[source-verified] 证据：E-CHATUS-002、E-CHATUS-003、E-CHATUS-004、E-CHATUS-006。

## 核心数据流

1. 浏览器建立成员 session 或受限 guest session。
2. Worker 在通过 session 边界后路由 HTTP/Agent/WebSocket 流量。
3. `UserState` 解析成员会话索引与显式长期记忆。
4. `TeamAgent` 重放会话权威状态，处理新 turn，并持久化消息、流、审批和分支状态。
5. logical-model router 选择有优先级的 offering，并从 `ProviderCoordinator` 取得并发租约。
6. adapter 将上游协议归一为工作台的稳定流事件。
7. 客户端接收文本、reasoning、工具状态、审批状态和短 request correlation，不接收托管凭据或 provider 私有配置。

[source-verified] 证据：E-CHATUS-003、E-CHATUS-004。

## 可靠性与故障处理

### 流与 fallback

provider fallback 只允许发生在首个可见输出之前。空流、畸形 SSE 或只有终止事件都属于协议失败；一旦文本、reasoning 或工具输出已经可见，再切换 provider 会把两个执行上下文拼接成一个无法追溯的回答，因此必须终止该次尝试。[source-verified] 证据：E-CHATUS-004。

### 多设备同步

编辑、重生成和分支保留 origin relationship。多设备 mutation 使用冲突保护、条件删除、tombstone 和账户级删除时间线，避免延迟客户端把已删除状态重新写回。[source-verified] 证据：E-CHATUS-005。

### 断线恢复

WebSocket 只是传输层，权威会话状态保存在 `TeamAgent`。恢复必须从已确认的消息/流边界重放，工具与审批动作需要幂等或显式冲突语义，不能让客户端简单重发最后一次动作。

### 故障可观察性

每个响应携带 request ID，用户只看到短关联值；日志使用阶段、固定失败类别、耗时和完整关联 ID，不记录对话正文与凭据。可靠性视图依据真实任务的脱敏遥测，而不是主动 completion 探针。[source-verified] 证据：E-CHATUS-007。

## 关键取舍

| 决策 | 选择原因 | 代价或失败信号 | 替代方案何时更合适 |
| --- | --- | --- | --- |
| 成员/会话/容量分开持有 | 串行化边界贴近真实冲突边界 | actor 迁移、热点和跨对象调用更复杂 | 以复杂关系查询为主、实时连接很少时可评估集中数据库 |
| 显式文本记忆 | 成员可查看、修改、清空，影响路径可解释 | 需要成员维护，自动化程度较低 | 用户明确接受不可见画像并有独立撤销/审计机制时 |
| 首输出后停止 fallback | 保留单一响应来源与工具因果 | 用户可能得到明确的部分失败 | 上游输出尚未投影且无副作用时可安全切候选 |
| CI-only 生产发布 | 固定检查顺序并绑定精确提交 | 发布速度受完整门禁约束 | 本地只用于 preview/dry-run，不直接突变生产 |

[source-verified] 证据：E-CHATUS-002、E-CHATUS-004、E-CHATUS-005、E-CHATUS-008。

## 安全与隐私

- session access 与 member capability 分层；登录成功不是能力授权。
- Skills 与工具在页面投影和实际执行时均复检，撤权立即影响旧会话。
- 托管 provider key 加密后写入 KV，UI、read API、日志和公开文档均不回显明文。
- 受限 guest 不继承成员的 BYOK、Skills、MCP、长期记忆、上传、导出或反馈能力。
- 公开截图使用确定性 fixture 与合成名称，不使用生产成员和真实内容。
- 监控维度不得包含成员、消息、provider、凭据或能反推出真实容量的高基数字段。

[source-verified] 证据：E-CHATUS-006、E-CHATUS-007。

## 验证矩阵

| 层级 | 验证重点 | 能证明什么 | 不能证明什么 |
| --- | --- | --- | --- |
| 单元/合同 | route、Agent、租约、stream、工具、审批、MCP、secret、quota | 代码合同与失败分支 | 当前生产配置和外部服务健康 |
| Type/Build | Worker、React、配置和 bundle | 当前提交可编译、可打包 | 成员实际工作流可用 |
| Browser | 桌面、边界、移动、触控、长文本、代码、附件、drawer | fixture UI 和交互在目标视口可用 | 真实成员、模型或 provider 能力 |
| Deployment | dry-run、精确提交发布、smoke | 指定版本的发布链路 | 持续 SLA |
| 入口观察 | 登录入口跳转和 HTTP 状态 | 当时 DNS/TLS/route 可达 | credentialed feature acceptance |

[source-verified] 证据：E-CHATUS-008。

## 交付状态

主站集成时，邀请制入口可以访问并跳转到 React workspace。这是范围很窄的入口观察，没有使用成员凭据，也没有验收模型、工具、记忆、上传或内部运营能力。[production-observed] 证据：E-CHATUS-009。

Chatus 的生产 mutation 继续归其自身发布流程所有。主站集成对 Chatus 始终只读，没有开启 guest、修改 provider policy 或重新部署服务。

## 代码入口

- Worker export：`src/index.ts`
- HTTP/session router：`src/worker.ts`
- React workspace：`client/src/components/ChatWorkspace.tsx`
- 前端、单元、类型、浏览器和发布命令：`package.json`
- 产品、provider、memory、access 与 release 合同：`README.md`

[source-verified] 证据：E-CHATUS-001、E-CHATUS-003、E-CHATUS-008。

## 证据索引

主要证据为 E-CHATUS-001 至 E-CHATUS-009。项目页架构图是这些合同的 public-safe projection，运行截图来自确定性视觉 fixture；两者都不能替代 credentialed production acceptance。

## 面试重点

重点准备以下问题：为什么状态要按成员、会话和容量拆分；为什么首输出后停止 fallback；撤权怎样影响旧会话；显式记忆如何支持纠错与删除；WebSocket 恢复怎样避免重复工具；tombstone 如何阻止状态复活；低敏 observability 如何兼顾可行动性；为什么登录入口 200 不能证明完整生产健康。
