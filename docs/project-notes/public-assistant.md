# BIAU Port 公开助手工程技术档案

## 项目摘要

BIAU Port 公开助手是嵌入主站的匿名、只读、public-only 研究界面，以懒加载浮动组件提供 `auto`、`site`、`web` 三种模式。它可以从脱敏站内知识、经过安全抓取的公开网页或两者组合回答，并返回 claim-linked citation 和有界公共响应。[source-verified] 证据：E-PA-001、E-PA-002。

核心信任规则是 evidence promotion：搜索结果只能算 lead。只有 SSRF-safe 地抓取原始 HTTPS 页面成功后，该 URL 才能成为引用证据；站内检索也只使用 public-only projection。[source-verified] 证据：E-PA-003。

## 产品边界

- 匿名、只读，不公开私人账号、Studio 或任何管理动作。
- 输入、最近历史、页面上下文、响应大小、研究次数和 session 保留均有上限。
- provider、model、endpoint、prompt、graph internals、raw error 与 private citation 不属于公共 payload。
- browser-local fallback 必须明确标记 degraded，不能伪装成模型回答。
- 历史生产验收只证明当时指定版本闭环，不等于当前持续在线。

[source-verified] 证据：E-PA-001、E-PA-005。

## 架构与职责

浏览器发送当前问题、最近有界历史、模式、匿名 session ID 和当前公开页面上下文。同源 Cloudflare Pages Functions 为 JSON、SSE 和 feedback 提供薄代理，限制请求/响应/流大小、超时与取消。公共服务运行 LangGraph，并在数据库可用时保存低敏匿名 turn。[source-verified] 证据：E-PA-002、E-PA-004、E-PA-006。

| 层级 | 职责 | 关键边界 |
| --- | --- | --- |
| `PublicAssistantWidget` | 模式、历史、页面上下文、进度、citation、建议、copy/retry/feedback | 不渲染未知字段或内部错误 |
| `publicAssistantApi.ts` | JSON/SSE 统一 decoder、terminal 语义、citation URL 过滤 | 不自动重放失败流 |
| Pages Functions | 同源代理、资源上限、timeout、cancel、stream forward | 不执行业务图、不猜测 fallback endpoint |
| `publicAssistantAgent.ts` | LangGraph 节点、条件路由、并行研究、一次恢复、claim verification | 仅输出 public allowlist |
| `publicAssistantPersistence.ts` | 可选 session/turn/feedback、30 天清理、低敏聚合 | 数据库缺失不阻断回答 |

站内研究使用 public-only Qdrant 数据，dense 与 sparse 结果通过 RRF 融合，可选 rerank。Web 研究先 discovery，后 original-page fetch；plan 需要时两路可以并行。

## 核心实现

- `src/components/PublicAssistantWidget.tsx`：模式、有界历史、页面上下文、流式进度、fallback、citation、建议、copy/retry 与 feedback UI。
- `src/utils/publicAssistantApi.ts`：JSON/SSE event 校验、terminal contract 与 public citation URL 过滤。
- `functions/_shared/assistant.ts`：同源 Cloudflare proxy 的请求/响应大小、timeout、cancel 与 stream forwarding。
- `server/src/publicAssistantAgent.ts`：LangGraph node 与 conditional edge 编排。
- `server/src/publicAssistantModel.ts`：相互独立的简洁 direct profile 与 evidence-bound generation profile。
- `server/src/responsesApi.ts`：provider-neutral Responses JSON/SSE/chat-relay 解码、输出上限、计时、取消和可选 JSON Schema。
- `server/src/publicAssistantProjection.ts`：内部恢复与诊断状态投影到公共 payload 的唯一边界。
- `server/src/publicAssistantPersistence.ts`：可选匿名 session、turn、feedback、retention 与 aggregation。
- `server/src/metrics.ts`：默认关闭、低基数的 HTTP 与公开助手模型路径指标。

[source-verified] 证据：E-PA-002、E-PA-004、E-PA-005、E-PA-006。

## 核心数据流

1. `input_guard` 阻断或规范化不安全输入。
2. 确定性的 direct intent 使用简洁且不要求证据的请求 profile；其他请求进入 `plan`，选择 site、web 或 combined research。
3. `research` 并行或单路执行选定渠道并保留有界候选。
4. `grade_evidence` 判断支持度和缺口。
5. `rewrite` 最多针对缺口重做一次研究。
6. `generate` 在统一绝对截止时间内，通过一次初始模型尝试和最多两次受预算约束的恢复尝试生成 draft answer 与 claims。
7. `verify_claims` 把每条 claim 关联到允许的 citation。
8. final rewrite 删除或降级未支持语言。
9. `finalize` 输出固定 public result；浏览器 decoder 再次验证。

[source-verified] 证据：E-PA-002、E-PA-003、E-PA-005。

## 可靠性与故障处理

证据或查询改写最多执行一轮，并与生成恢复相互独立。生成层只重试瞬时或可修复故障，使用可取消的 200/400ms 退避，而且不会重置绝对请求截止时间。公共 metadata 只暴露 `none`、`recovered` 或 `degraded`、一至三次尝试计数和固定安全失败类别；不会暴露 provider 或内部错误。如果支持度仍然不足，图必须返回 partial/uncertain 表述，而不是伪造确定性。数据库缺失不阻断回答，只关闭可选持久化。[source-verified] 证据：E-PA-002、E-PA-006。

### 研究渠道

site 与 web 具有独立失败域。组合模式中，一路失败不会自动取消另一路已经获得的证据；合并后仍须经过统一 grade 和 claim verification。候选数量与重试次数均有上限。

### SSE terminal 语义

浏览器优先使用 SSE，但只有端点明确返回 404、405、501 或非 SSE legacy 响应时才允许 JSON fallback。malformed、incomplete、timeout、429 或普通失败对本次尝试都是 terminal，避免重复研究、重复持久化或绕过限流。Abort 通过同源代理传播。[source-verified] 证据：E-PA-004、E-PA-005。

### 证据不足

研究恢复最多一次。如果 support 仍不足，图返回 partial/uncertain，不能用模型常识补齐。数据库不可用只关闭可选 persistence，不阻断回答。[source-verified] 证据：E-PA-002、E-PA-006。

### 前端恢复

瞬时失败时保留上一次成功结果，非法 citation 被移除，错误文案只表达公共状态。浏览器不会在流失败后悄悄切换 API base。

## 关键取舍

| 决策 | 选择原因 | 代价或失败信号 | 恢复方式 |
| --- | --- | --- | --- |
| claim 级 citation | 能逐条降级无支持陈述 | retrieval、grade、verify 增加延迟 | 保留可支持 claim，其余标为 uncertain |
| dense + sparse + RRF | 同时覆盖语义和精确技术标识 | 融合与 rerank 需要稳定排序 | rerank 失败时保留 RRF 结果 |
| site/web 并行 | 降低组合问题 wall-clock latency | 需要取消、限量和独立失败处理 | 单路失败仍使用另一条可验证证据 |
| SSE 优先 | 提供进度、取消与结构化终态 | malformed/incomplete 不能自动重放 | 明确 terminal，仅 legacy 才走 JSON |
| 可选数据库 | 无数据库仍能回答 | 缺少历史 feedback 与长期产品洞察 | 跳过 persistence，保持 response contract |

[source-verified] 证据：E-PA-002、E-PA-003、E-PA-004、E-PA-005、E-PA-006。

## 安全与隐私

- Web fetch 只提升安全目的地的公开 HTTPS 原页；协议、解析地址、重定向链、响应大小和内容类型均需检查。
- citation projection 过滤 internal item、credential-bearing URL、unsafe scheme 和不允许的站内路径。
- IP 只用于进程内 rate limit，不持久化为用户身份。
- 匿名 session、turn、feedback 在 30 天后到期；长期聚合只保存低敏 topic fingerprint 和计数。
- Pages proxy 限制请求、JSON 响应和 stream 大小，客户端取消时终止上游。
- 页面上下文只包含公开路径/标题，不包含 query、hash、token 或 Studio state。

[source-verified] 证据：E-PA-003、E-PA-004、E-PA-006。

## 验证矩阵

检查矩阵覆盖 direct/site/web/combined 路由、follow-up、edit/resend、Graph 与公共 payload 契约、六类安全降级、有界恢复、取消、prompt injection、secret seeking、citation 完整性、Branch/Revision 连续性、旧快照 hydration、Responses JSON/SSE/chat-relay/schema 行为、指标、Web fetch 安全、混合检索、持久化、限流、Cloudflare proxy、知识生成、Qdrant 同步、服务模式和 UI 流程。Fixture 不解析真实 provider endpoint；live acceptance 必须在部署后使用一条明确批准的真实业务问题。[source-verified] 证据：E-PA-005、E-PA-008。

| 验证层 | 覆盖内容 | 能证明什么 | 明确限制 |
| --- | --- | --- | --- |
| Graph contract | node、edge、site/web/combined、一次 rewrite、uncertain | 状态机与停止条件 | 不证明真实 provider 或网页可用 |
| Retrieval/Web | dense、sparse、RRF、rerank 降级、SSRF、原页提升 | evidence contract 与安全抓取 | 不证明答案写作质量 |
| API/SSE | JSON/SSE 等价、terminal、cancel、limit、citation filter | 公共 transport contract | 不证明 UI 可读性 |
| Persistence | 无 DB、30 天保留、feedback、aggregation | graceful degradation 与 retention | 不证明持续数据库健康 |
| UI | 模式、进度、citation、fallback、移动布局、rate-limit | 浏览器 public experience | fixture 不等于 live acceptance |
| Live gate | chat、citation、persistence、feedback、public sync | 指定版本的生产闭环 | 历史通过不是当前 SLA |

[source-verified] 证据：E-PA-005、E-PA-008。

## 交付状态

仓库记录过 deployed public chat、citation、anonymous persistence、feedback 和 public knowledge sync 的成功验收。这是历史生产观察，不声明阅读本文时服务仍然健康。[production-observed] 证据：E-PA-007。

## 代码入口

- 浏览器 widget：`src/components/PublicAssistantWidget.tsx`
- 浏览器 payload/SSE decoder：`src/utils/publicAssistantApi.ts`
- Cloudflare proxy：`functions/_shared/assistant.ts`、`functions/api/chat/public*`
- LangGraph runtime：`server/src/publicAssistantAgent.ts`
- Public HTTP route：`server/src/app.ts`
- Anonymous persistence：`server/src/publicAssistantPersistence.ts`
- Deployment projection：`render.yaml`

[source-verified] 证据：E-PA-002、E-PA-004、E-PA-005、E-PA-006、E-PA-009。

## 证据索引

主要证据为 E-PA-001 至 E-PA-009。backend spec 是公开合同索引，源码与检查脚本验证单条执行路径；历史生产 acceptance 单独标记，不与当前健康混用。

## 面试重点

重点准备 lead 与 evidence 的区别、LangGraph 条件路由、site/web 并行、dense+sparse+RRF、claim-level verification、SSRF、SSE terminal 与 JSON fallback、同源薄代理资源上限、无数据库降级、30 天匿名 retention，以及为什么 browser-local fallback 必须与模型回答分开标记。
