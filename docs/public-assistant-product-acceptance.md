# 知航 BIAU Beacon 产品验收矩阵

更新时间：2026-08-16

## 当前结论

知航 BIAU Beacon 当前为 **工程就绪，生产检索已修复，CPA 生成配置已交付，产品待验收**。确定性合同已覆盖公开 API、会话版本、分支、浏览器状态、持久化、恢复、安全、取消和降级语义；生产侧已准备直接消费单租户 CPA Responses 网关，并将最终回答生成上限固定为一次。2026-08-16 的 Public API 部署 `dep-da0sctlbedkc73bgnra0` 已处于 `live`，健康边界确认 `modelConfigured=true`；本次配置与 AI Daily proposal 的校验均为零模型调用。仍需单独完成一次真实业务问题，得到非降级回答并完成引用、持久化、失败恢复与移动端观察，才能更新产品级结论。

## 验收矩阵

| 能力 | 确定性证据 | 当前状态 | 产品级证据 |
| --- | --- | --- | --- |
| 首次打开与免费实例预热 | `/health` warm-up 状态、一次有界重试、草稿保留和零 chat 自动请求 | 已通过合同与完整 UI 回归 | 观察生产首次打开、等待提示与恢复操作 |
| 提问与回答 | 请求/流式终态 decoder、回答状态与失败分类 | 已通过 | 一次真实业务问题得到有用模型回答 |
| 引用与证据 | citation/claim 正规化、证据边界与无效引用拒绝 | 已通过 | 人工打开至少一个引用，核对回答与来源一致 |
| 会话、版本与分支 | Turn/Revision/Branch、编辑重发、重试、历史恢复和刷新持久化 | 已通过 | 真实回答刷新后仍恢复到同一会话与版本 |
| 失败恢复 | timeout、network、not_configured、upstream、empty、invalid 与取消 fixture | 浏览器断网恢复动作已通过，最终业务闭环未通过 | 首次 stream 在到达 API 前被拦截；恢复后显式重试，同一问题只到达 API 一次 |
| 桌面、手机与全屏 | 320/390/430、compact/fullscreen/history 的 UI 合同 | 已通过完整 UI gate | 手机视口人工观察输入、回答、引用、历史和退出全屏 |
| 信息安全 | 固定低敏错误文案、无 provider/endpoint/key/stack 泄漏 | 已通过 | 验收记录只保留版本、时间、状态、引用数与结论 |

## 2026-08-12 生产验收记录

| 证据 | 低敏结果 |
| --- | --- |
| 部署版本 | 首次真实请求运行于 `207a5fe6`；当前验收版本 `65c8af15` 已部署到 Cloudflare Pages、Public API 与 RAG Orchestrator；稳定 Pages relay base 的 Render 配置部署已 live |
| 健康边界 | Public API `/health` 为 `ok=true`、`serviceMode=public`、`database=true`、`mode=model`、`modelConfigured=true`；RAG `/health` 为 Supabase pgvector，vector/keyword/reranker 全部 ready，实际 reranker 模式为 `deterministic` |
| 首次真实业务请求 | HTTP `200`，约 9.3 秒完成；终态为 `degraded`、生成模式为 fallback、恢复状态为 degraded、三次有界尝试的公开失败类别为 `upstream` |
| 首次检索与引用 | 站内检索错误偏向 Legal RAG，未命中知航专属资料；返回引用可以访问，但不满足该问题的事实覆盖要求，因此引用验收不通过 |
| 持久化 | API 重新加载后会话、分支、turn、revision 与引用保持一致；验收完成后已删除临时会话 |
| 已定位根因 | Render Public API 缺少模型 base 环境配置，服务回退到与当前 relay token/model 不兼容的默认 upstream，导致生成失败 |
| 配置复核 | Cloudflare production relay Secret 名称完整；Render 的固定 base、key、model 与 Responses protocol 配置存在，已认证非法请求返回 `400`，该检查未触达模型上游 |
| 检索修复 | 生产纯 `/v1/retrieve` 返回 `site:public-assistant` 为第一引用，`candidateCount=60`、`citationCount=8`、`expandedEntityCount=47`、`rerankerMode=deterministic`；知识规模为 31 docs / 61 chunks / 166 entities / 231 relations |
| 浏览器恢复 | Playwright 在首次 stream 到达 API 前模拟断网，恢复后显式重试；同一问题只到达 API 一次，未发生自动重放或重复 turn |
| 第二次真实业务请求 | 服务端完成为 `degraded`；低敏恢复记录为 `failure_class=provider_unavailable`、`failure_origin=public_api`、`http_status_class=5xx`、`attempts=3`、`duration_bucket=5s_to_15s` |
| Relay 归因修复 | `65c8af15` 为所有 Function 处理响应增加固定来源头，并将缺少来源头的已接收 relay HTTP 响应归类为 `relay_edge`，同时保留 `relay_function` 与 `relay_upstream` |
| 第三次真实业务请求 | 浏览器只发送 1 个 `site` 业务请求；数据库对应 1 个 Request、1 个 Turn、1 个 Revision，终态仍为 `degraded`、三次有界尝试、公开失败类别为 `upstream` |
| 第三次检索与引用 | 知航专属资料参与回答，研究快照为 4 条站内证据、3 条已核验引用；旧的 Legal RAG 偏航没有复现，但降级 fallback 不是符合“三点回答”的完整模型结果 |
| Cloudflare 低敏诊断 | Render recovery 为 `failure_class=provider_unavailable`、`failure_origin=relay_edge`、`http_status_class=5xx`、`attempts=3`、`duration_bucket=1s_to_5s`；Cloudflare zone 同时记录 3 个 `/api/model-relay/responses` 动态 `502`，同秒 Pages Functions 为 success、0 error、0 upstream subrequest |
| 配置修复 | Render `ASSISTANT_MODEL_BASE_URL` 已从访客自定义域切换到稳定 `https://biau.pages.dev/api/model-relay`；该路径的未认证请求可到达 Function 并返回固定来源头，检查未触达模型上游 |
| 未通过项 | 未得到完整模型回答；本地 Playwright 在读取已完成 SSE body 时发生协议错误，桌面刷新和手机引用观察未继续，以避免第二次模型请求 |
| 会话清理 | 临时会话已按精确问题和时间窗定位并删除；删除后 turns 为 0、requests 为 0 |
| 结论 | 远端检索融合已经通过；第三次验收将自定义域 edge 排除出后端 relay base，第四次验收进一步证明稳定 Pages Function 已发起上游请求，但 upstream transport 仍失败 |

## 2026-08-12 第四次生产验收记录

| 证据 | 低敏结果 |
| --- | --- |
| 部署与健康 | `a5c6db79` 的 Pages、Public API、RAG 与稳定 relay base 配置均已部署；稳定 Pages 域 `/api/health` 返回 `200`，`modelConfigured=true` |
| 真实业务请求 | 只发送 1 个 `site` 业务请求，数据库对应 1 个 Request、1 个 Turn、1 个 Revision；终态仍为 `degraded`，三次有界尝试，公开失败类别为 `upstream` |
| 检索与引用 | 返回 4 条站内证据、3 条已核验 HTTP `200` 引用；知航专属资料继续排在正确位置 |
| 会话与桌面恢复 | 桌面刷新后同一会话恢复成功，未再次发送模型请求；临时会话删除后读取返回 `404` |
| 手机观察 | 390px 视口文档宽度为 390，面板与 3 张引用卡均无横向溢出；恢复过程模型请求数为 0 |
| Cloudflare 精确窗口 | `polished-heart-b217` 在对应分钟出现 `scriptThrewException`，`errors=3`、`subrequests=3`；同窗口 subrequest 聚合出现 `502/responseDisconnect` |
| 归因 | Render recovery 为 `relay_upstream + 5xx`，说明 Function 已发起三次上游调用但连接/响应传输失败；不再归因于自定义域 edge、RAG、payload 或持久化 |
| 结论 | 引用、桌面刷新、手机布局和会话清理通过；非降级模型回答未通过，产品继续保持“待验收”，不得自动重试或改写协议 |

## 2026-08-16 第五次生产验收尝试

| 证据 | 低敏结果 |
| --- | --- |
| 健康边界 | Public API `/health` 返回 `200`，`database=true`、`mode=model`、`modelConfigured=true`、`webSearchConfigured=true` |
| 真实业务请求 | 执行一次站内产品比较问题；Render 网关返回 `504`，没有回答、引用或可验收的持久化结果 |
| 服务端证据 | 对应窗口没有匹配的 Render 应用/请求日志；临时会话删除返回 `404`，无法证明会话已创建或模型上游已完成调用 |
| 结论 | 本次归类为入口超时，不能记为产品成功或具体 provider 失败；不自动重试，产品仍为“待验收” |

## 已通过命令

```bash
npm run assistant:public-api-check
npm run assistant:public-conversation-check
npm run assistant:public-browser-state-check
npm run assistant:public-persistence-check
npm run assistant:public-quality-check
npm run check:ui
```

## 最后人工 gate

1. 稳定 Pages relay base 的 Render 部署与无模型健康/认证边界已通过；不修改 Responses payload、streaming 协议或模型名单。
2. 第四次真实请求已消耗本轮批准额度；不自动重试，也不用 ping、doctor、空 prompt、catalog probe 或逐模型测活替代业务验收。
3. 浏览器断网恢复动作、引用核对、桌面刷新、手机无溢出和会话清理已通过；剩余唯一产品门禁是非降级模型回答。
4. 全部通过后才能把状态改为“产品可用”；再次失败则保持待验收或如实标记 degraded。
