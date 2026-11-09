# 模型响应交付与开源网关选型

调研日期：2026-11-07（Asia/Shanghai）。状态：建议已形成，未迁移架构、未部署网关、未修改私有渠道配置。本轮仅抓取公开资料、检查现有代码和运行离线模拟；新增真实模型请求为 0。来源、摘要哈希及模拟结果见 [gateway-evidence.json](gateway-evidence.json)，此前业务试跑与额外短诊断记录继续保留在 [first-live-trial.md](first-live-trial.md)。

## 建议

当前日报继续使用固定版本 Horizon，优先复用已安装 OpenAI SDK 的流式接收与聚合能力，只补应用需要的预算、结束状态、错误诊断和新闻结果校验。暂不新增独立网关，不 fork 一套通用协议转换、SSE 解析、重试和渠道管理系统。

若下一阶段明确要求日报、博客和公开助手共用模型别名、权限、预算、渠道与日志，优先评估 **LiteLLM Proxy**；**Bifrost** 是偏好 Go 独立服务时的候选；**New API** 更适合把渠道管理、中文后台、用户额度和计费作为主要产品需求。先配置开源发行版，再考虑插件或小范围上游补丁。此推荐尚不等于用户批准迁移或真实业务验证通过。

## 这次问题发生在哪里

当前链路为：

```text
日报任务 → scripts/horizon/run.py → Horizon OpenAIClient
        → OpenAI-compatible Chat Completions → 用户配置的渠道 → 模型上游

本站另有：/api/model-relay/.../responses → modelRelay.ts → Responses 上游
```

两条链路需要分别判断。日报没有调用本站 `relayResponsesRequest`。本地依据是 [run.py](../../../../../scripts/horizon/run.py) 的 SDK 注入及直接配置、固定版本 [Horizon client][horizon] 的 `OpenAIClient._do_request`，以及 [modelRelay.ts](../../../../../functions/_shared/modelRelay.ts) 的 Responses 契约。

| 证据 | 可以确定 | 不能据此确定 |
| --- | --- | --- |
| 渠道模型目录返回 200 | 当时目录接口可读 | 所有模型、参数、长请求或流式都可用 |
| 两个真实新闻评分请求约 31.55 / 31.58 秒返回 524 | 客户端未得到成功的完整响应 | 模型没执行、未收费、密钥失效 |
| 用户消费记录显示 DeepSeek / GLM 的 token 与费用 | 后台记录了执行和计费；与模型和时间高度吻合 | 缺少 request ID，不能严格逐条关联；未证明正文送达本地 |
| 本站 relay 本地配置默认 50 秒、上限 55 秒，超时返回 504 | 其当前实现不是这次日报 31 秒 524 的调用来源 | 此限制是 Cloudflare 平台固定上限，或所有模型任务适合走它 |
| Horizon 评分使用非流式 `chat.completions.create` | 等待整份结果，未主动消费流式片段 | 改成流式就一定解决当前外部断连 |

最符合现有证据的解释是：长请求等待期间某一转发层终止了响应交付，而更上游的推理仍继续。客户端断开不保证远端取消成功；重试可能产生另一笔推理费用。具体是渠道应用、渠道的反向代理、CDN 还是更上游转发层，现有记录不足以定位。

[Cloudflare 524 文档][cf524]与[连接限制表][cflimits]当前列出默认 Proxy Read Timeout **125 秒**、Proxy Write Timeout **30 秒**。观察到约 31 秒，不足以归因为默认读超时，也不能只凭接近 30 秒就认定是写超时。此前未保留失败响应的关联 ID 和必要响应头，这一证据缺口需在下一次已授权的真实新闻请求中补齐。

本站 relay 的超时是项目代码策略。它可以继续承担自身已有的有限转发职责；不应把日报批处理强接入这个 55 秒以内的 Responses 入口，也无需为了当前故障先重写该模块。

## 常见 Agent 如何接入模型

本次核对的代表项目不要求使用自研网关：

- **Horizon** 直接通过 provider client/SDK 调用模型。本项目固定版本的 OpenAI 路径当前使用非流式 Chat Completions。本次抓取的 main 分支相应文件也未显示可直接启用的流式实现；只升级版本不足以证明问题解决。
- **LangChain** 使用独立 provider integration packages，统一应用接口，可直接调用模型，见[官方模型说明][langchain]。
- **CrewAI** 的主要 provider 采用原生 SDK，其他若干 provider 借助 LiteLLM 库，见[官方 LLM 说明][crewai]。
- **LiteLLM SDK** 是导入 Python 进程的兼容库；**LiteLLM Proxy** 是需要部署、运营的服务。二者不可混称。其[官方选择建议][litellm]也区分单个 Python 应用与多应用、虚拟密钥、集中日志/预算需求。

这些是代表性代码和文档证据，不是对全部开源 Agent 的使用比例统计。Agent 编排、SDK 协议适配、模型网关和网站业务 API 是不同职责；并不需要为了具备 Agent 能力同时自研四层。

## 候选方案比较

| 方案 | 复用什么 | 当前适合度 | 主要代价与边界 |
| --- | --- | --- | --- |
| Horizon + 现有 OpenAI SDK 薄适配 | 现有新闻流水线、SSE 解码和结果聚合 | **当前优先**：一次解决本链路的交付与完整性校验 | 不提供跨应用的密钥/预算后台；仍依赖渠道流式兼容 |
| LiteLLM Python SDK | 多 provider 协议和异常映射 | 未来要在单个 Python 任务调用多种原生协议时考虑 | 新依赖与适配成本；仅把相同 Chat Completions URL 包一层不能消除 524 |
| LiteLLM Proxy | 统一端点、模型别名、虚拟密钥、日志、预算、路由 | **项目统一模型入口的首选候选** | 需要服务运维；持久预算/日志涉及额外存储；重试、模型定价、协议兼容需配置和实测 |
| Bifrost | Go SDK/独立网关、协议适配、路由与治理 | Go 服务路线的候选 | 当前文档的流式 provider 超时默认 30 秒，不能照搬默认值；部分失败会在 retries=0 时继续换 key |
| New API | 多渠道管理、用户额度/计费和管理界面 | 当运营后台是主要需求时考虑 | 功能范围超过首版日报；部署者仍须配置超时、反向代理、流式与重试，无法替代上游故障修复 |
| 从零自研通用网关 / 大型 fork | 自己维护上述所有机制 | **当前不推荐** | 新增协议、流完整性、取消、计费、重试、可观测性及升级维护责任 |

许可核对：LiteLLM 的 enterprise 目录有独立许可，其余按 MIT；Bifrost 仓库为 Apache-2.0；New API 为 AGPLv3，其 README 另列 Section 7 的署名/原项目链接要求。实际采用时以固定发行版本的 LICENSE/NOTICE 为准。没有把企业功能或厂商宣传的性能数据当作开源版实测结果。

## 网关能解决什么，不能解决什么

[LiteLLM 超时文档][litellm-timeout]提供完整响应超时、首片段超时及 SSE `: ping` 保活，并描述等待上游响应头期间的提前保活。它有助于保护“网关到调用方”这段空闲连接。如果上游渠道自身已返回 524，增加一个下游网关无法恢复那条已丢失的响应。

保活还可能提前提交 HTTP 200，后续失败只能在流内体现。因此不能用“HTTP 200”作为内容生成成功或发布依据。首片段很慢、某层缓冲整个流、全程没有终止片段、达到本地总时限，都仍可能失败。

任何候选都必须明确 retry、fallback 和 key rotation 的合计上游尝试数。[Bifrost 当前文档][bifrost-retries]明确说明：部分永久性 key 错误不会消耗 `max_retries`，多 key 池在 `max_retries=0` 时也可能遍历其他 key。当前预算不能只统计应用到网关的一次 HTTP，就声称上游只调用一次。首期保持单渠道、单 key、无 fallback，并验证 524/断流不重试。

[New API 当前配置示例][newapi-env]包含 `RELAY_TIMEOUT=0`、`RELAY_RESPONSE_HEADER_TIMEOUT=1800` 和 `STREAMING_TIMEOUT=300`。这是源码示例，不是用户渠道实际部署参数。仅凭管理界面的品牌或默认配置，不能确定其线上版本、代理链路或具体 31 秒限制。

对于明显长于同步连接期限的任务，还可使用 provider 原生异步提交/轮询与结果持久化，但仅在渠道支持任务 ID、结果查询和相应计费语义时成立。普通 Chat Completions 请求失败后，不能自行假定可以按 request ID 取回结果；也不应为此另造一套通用任务平台。

## 建议实施顺序

1. **补可定位的诊断。** 记录经过筛选的请求关联 ID、状态码、首响应/首片段/结束耗时、结束原因和收到的 usage；私有 URL/key、正文和原始错误响应不进公开日志。无法拿到 usage 时记为未知，不记成零费用。复用现有预算和失败停止行为。
2. **在 Horizon 接口边界复用 SDK 流式聚合。** 使用已有 `AsyncOpenAI.chat.completions.stream()` 与 `get_final_completion()`，保持原有新闻评分/摘要的完整结果输入。优先利用上游扩展点或小范围可跟踪补丁，保留固定版本核验；不复制维护整个 Horizon，不新写 SSE parser。不能仅在 `extra_body` 填 `stream=true`，原先按完整 `choices[0]` 读取的代码也必须正确消费流。
3. **完整性与时间预算一起适配。** 整个流的打开、消费、最终聚合都置于总 deadline 内。当前 `BoundedSDK.request()` 的计时包围一次 SDK 请求；若改成流式，只包住取得流对象的阶段不足以限制后续读取。普通新闻评分应要求成功的 finish reason、完整且符合业务约束的 JSON；若工具调用场景启用，另核验相应终态。
4. **先离线验收，再续真实新闻任务。** 使用下表的 mock 情况验证停止和计数。随后只在原有业务授权/预算内续作真实新闻，不再发额外测活。当前每请求 60 秒和截图中 DeepSeek 92 秒有冲突：流式不改变原总时限；需要更长预算时先把新的范围具体化供用户决定，不能悄悄改成 120 秒。
5. **若仍失败，根据实际链路处理。** 用请求 ID 和耗时向渠道侧定位响应头超时、缓冲、取消与流式支持；由有控制权的一方修复代理配置或提供适合长请求的入口。用户不控制上游时，选择有明确长请求/流式合同的渠道更直接。不能声称本地延长超时就能改变远端 31 秒断连。
6. **统一入口需求确定后再部署开源网关。** 以 LiteLLM Proxy 为首个验证对象，固定版本、单一路由、关闭自动重试/回退，保留现有业务权限层。若网关内部允许多次尝试，必须把其尝试数接入原有预算。上游账单/自定义价格不能仅由目录模型名推算。批任务从任务运行侧访问可控入口；不通过网站短时交互 relay 转一圈。

二次开发只保留业务契约：期次、内容完整性、发布 gate、具体调用预算与脱敏日志。协议转换、SSE 解码、通用路由和通用管理台由成熟库/网关负责。只有配置或扩展机制无法覆盖的已证实缺口，才建立最小补丁，并优先回馈上游。

## 本轮离线核验

使用现有固定 Horizon 环境中的 OpenAI Python SDK **2.21.0**、`httpx.MockTransport` 和预制 SSE 字节运行 7 种情况；模型地址为不可用的 `.invalid` 域名，传输完全由 mock 接管，并禁止网络连接。每种情况仅一次 mock HTTP，退出均关闭流。

| 模拟情况 | 实际观察 | 对适配的要求 |
| --- | --- | --- |
| 中文 UTF-8 跨片段、心跳、终态与 usage | SDK 正确汇总正文，finish reason 为 stop | 复用 SDK 足够处理这些协议细节 |
| 正常终态但 usage 缺失 | SDK 可返回完整正文 | 用量标为未知，不能当作免费 |
| 正文 JSON 恰好完整，但连接无终态直接 EOF | SDK 仍返回对象，finish reason 为 null | 必须显式拒绝未证明完成的输出 |
| HTTP 524 | 抛出异常，1 次 mock 请求 | 保持立即停止，不自动重试 |
| HTTP 200 后收到 SSE error | 抛出 APIError | HTTP 200 不是成功证明 |
| 已有内容后再收到 SSE error | 抛出 APIError | 丢弃不完整生成，不把局部正文发布 |
| 读取过程超过包围整个消费过程的 deadline | 抛出 TimeoutError，关闭流 | 总时限必须覆盖流消费，而非仅覆盖响应头 |

首次 mock harness 将网络守卫装在 Windows 事件循环初始化之前，误拦截其本地 self-pipe；调整到循环初始化之后才执行上述检查。两次 harness 均未向模型发送请求。结果只证明 SDK 在这些 fixture 中的行为，不证明新渠道兼容，也不代表 Horizon 生产适配已经完成。

正式实施还需覆盖：首片段长延迟、片段间长静默、`finish_reason=length`、损坏 JSON、工具参数分片（若启用）、主动取消、流阶段错误如何转为 Horizon 的不可重试错误，以及中间网关内部是否隐式增加调用。暂未部署或压测三个候选网关，因此没有宣称实测可靠性或成本优劣。

## 证据与交付边界

本次仅新增研究报告/证据文件，并更新现有任务计划与状态描述；生产代码、模型配置和发布 gate 不变。任务目录在原恢复基线中记录为原本不存在，研究管理材料不递归备份；原有集中恢复组继续保留，见 [recovery.md](recovery.md)。

公开网页经 `smart-search fetch` 获取，Context7 仅用于定位 SDK 文档。抓取可能重复/转义代码块，因此代码行为以固定版本本地源码和离线执行为准。New API 环境变量文档旧 URL 抓取的是 404 页面，未用于结论，相关参数改用仓库配置示例核对。清理前保留来源 URL、抓取响应 SHA-256、短摘录和读取日期；研究交付物不收录私有渠道信息、整页第三方源码或用户截图。

收尾已删除本轮研究临时目录（42 个文件）和续作使用的 Horizon 临时源码/虚拟环境目录（9,550 个文件）；均核验为本任务创建、位于系统临时目录、无 reparse point 或目录内运行中的程序。正式试跑证据、用户原截图、集中恢复组，以及原有归属不明的 ` .trellis/`、`undefined/` 目录保留。文档/JSON、相对链接、任务上下文与差异空白检查通过；本轮不重复运行应用 build/lint。

可复现的只读资料命令（PowerShell；不执行模型测活）：

```powershell
smart-search context7-library "OpenAI Python SDK" "chat completions streaming get_final_completion" --format json
smart-search fetch "https://docs.litellm.ai/docs/proxy/timeout" --format json
smart-search fetch "https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/" --format json
```

### 主要来源

- [Cloudflare 524][cf524]、[连接限制][cflimits]
- [Horizon 固定版本模型 client][horizon]
- [LangChain 模型集成][langchain]、[CrewAI 模型集成][crewai]
- [OpenAI 流式响应说明][openai-stream]
- [LiteLLM Gateway][litellm]、[Python SDK][litellm-sdk]、[超时与保活][litellm-timeout]、[重试与回退][litellm-reliability]
- [Bifrost 仓库][bifrost]、[流式说明][bifrost-stream]、[重试与回退][bifrost-retries]
- [New API 仓库][newapi]、[环境变量示例][newapi-env]

[cf524]: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/
[cflimits]: https://developers.cloudflare.com/fundamentals/reference/connection-limits/
[horizon]: https://github.com/Thysrael/Horizon/blob/d7406f738c711df82b8f060fa1d5e9999d36cca0/src/ai/client.py
[langchain]: https://docs.langchain.com/oss/python/langchain/models
[crewai]: https://docs.crewai.com/en/concepts/llms
[openai-stream]: https://developers.openai.com/api/docs/guides/streaming-responses
[litellm]: https://docs.litellm.ai/docs/simple_proxy
[litellm-sdk]: https://docs.litellm.ai/docs/python_sdk
[litellm-timeout]: https://docs.litellm.ai/docs/proxy/timeout
[litellm-reliability]: https://docs.litellm.ai/docs/proxy/reliability
[bifrost]: https://github.com/maximhq/bifrost
[bifrost-stream]: https://docs.getbifrost.ai/quickstart/gateway/streaming
[bifrost-retries]: https://docs.getbifrost.ai/features/retries-and-fallbacks
[newapi]: https://github.com/QuantumNous/new-api
[newapi-env]: https://raw.githubusercontent.com/QuantumNous/new-api/main/.env.example
