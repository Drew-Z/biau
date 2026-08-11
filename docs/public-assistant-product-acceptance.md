# 知航 BIAU Beacon 产品验收矩阵

更新时间：2026-08-12

## 当前结论

知航 BIAU Beacon 当前为 **工程就绪，生产检索已修复，生成链路仍降级，产品待验收**。确定性合同已覆盖公开 API、会话版本、分支、浏览器状态、持久化、恢复、安全、取消和降级语义；`65c8af15` 已完成 Cloudflare Pages、Public API 与 RAG Orchestrator 全链部署，生产检索稳定命中知航专属资料。第三次获批业务验收只产生一个站点 Request，检索返回 4 条证据和 3 条知航相关引用，但回答仍为 `degraded`。新低敏证据把失败收窄到 Cloudflare 自定义域的 relay edge/Pages 执行边界；Render relay base 已切换到稳定 `biau.pages.dev` 域，等待下一次独立批准完成最终业务验收。

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
| 结论 | 远端检索融合已经通过，生成故障收窄到 Cloudflare 自定义域 relay 边界；切换稳定 Pages 域后仍需新的独立批准验证完整回答、刷新恢复和手机引用布局 |

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
2. 下一条真实、公开安全的业务问题必须在执行前重新获得批准；不自动重试，也不用 ping、doctor、空 prompt、catalog probe 或逐模型测活替代业务验收。
3. 下次验收仍需完成有用模型回答、知航专属引用核对、桌面刷新持久化和手机视口观察；浏览器断网恢复动作已经完成。记录不保存问题全文、token、provider 或内部诊断。
4. 全部通过后才能把状态改为“产品可用”；再次失败则保持待验收或如实标记 degraded。
