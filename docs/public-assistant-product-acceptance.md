# 知航 BIAU Beacon 产品验收矩阵

更新时间：2026-08-12

## 当前结论

知航 BIAU Beacon 当前为 **工程就绪，生产检索已修复，生成链路仍降级，产品待验收**。确定性合同已覆盖公开 API、会话版本、分支、浏览器状态、持久化、恢复、安全、取消和降级语义；`d1ec7adb` 已完成 Cloudflare Pages、Public API 与 RAG Orchestrator 全链部署，生产纯检索也已稳定把 `site:public-assistant` 排在首位。第二次获批业务验收完成了浏览器断网后的显式恢复动作，但最终生成仍返回 `degraded`；低敏证据只定位到 `public_api + 5xx`，不能据此猜测 provider 或协议根因，也不能标记为产品可用。

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
| 部署版本 | 首次真实请求运行于 `207a5fe6`；当前验收版本 `d1ec7adb` 已部署到 Cloudflare Pages、Public API 与 RAG Orchestrator |
| 健康边界 | Public API `/health` 为 `ok=true`、`serviceMode=public`、`database=true`、`mode=model`、`modelConfigured=true`；RAG `/health` 为 Supabase pgvector，vector/keyword/reranker 全部 ready，实际 reranker 模式为 `deterministic` |
| 首次真实业务请求 | HTTP `200`，约 9.3 秒完成；终态为 `degraded`、生成模式为 fallback、恢复状态为 degraded、三次有界尝试的公开失败类别为 `upstream` |
| 首次检索与引用 | 站内检索错误偏向 Legal RAG，未命中知航专属资料；返回引用可以访问，但不满足该问题的事实覆盖要求，因此引用验收不通过 |
| 持久化 | API 重新加载后会话、分支、turn、revision 与引用保持一致；验收完成后已删除临时会话 |
| 已定位根因 | Render Public API 缺少模型 base 环境配置，服务回退到与当前 relay token/model 不兼容的默认 upstream，导致生成失败 |
| 配置复核 | Cloudflare production relay Secret 名称完整；Render 的固定 base、key、model 与 Responses protocol 配置存在，已认证非法请求返回 `400`，该检查未触达模型上游 |
| 检索修复 | 生产纯 `/v1/retrieve` 返回 `site:public-assistant` 为第一引用，`candidateCount=60`、`citationCount=8`、`expandedEntityCount=47`、`rerankerMode=deterministic`；知识规模为 31 docs / 61 chunks / 166 entities / 231 relations |
| 浏览器恢复 | Playwright 在首次 stream 到达 API 前模拟断网，恢复后显式重试；同一问题只到达 API 一次，未发生自动重放或重复 turn |
| 第二次真实业务请求 | 服务端完成为 `degraded`；低敏恢复记录为 `failure_class=provider_unavailable`、`failure_origin=public_api`、`http_status_class=5xx`、`attempts=3`、`duration_bucket=5s_to_15s` |
| 未通过项 | 未得到完整模型回答，因此关键事实引用、移动端引用观察和桌面刷新持久化均未完成产品验收 |
| 会话清理 | 临时会话已按精确问题和时间窗定位并删除；删除后 turns 为 0、requests 为 0 |
| 结论 | 远端检索融合和浏览器恢复动作已通过；生产生成通道仍为 `public_api + 5xx` 降级，当前保持“产品待验收”，不得凭猜测改协议或自动重试 |

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

1. 继续诊断只使用低敏生产日志和不触达模型上游的合同检查；当前证据不足以支持修改 streaming/input 协议或更换渠道。
2. 下一条真实、公开安全的业务问题必须在执行前重新获得批准；不自动重试，也不用 ping、doctor、空 prompt、catalog probe 或逐模型测活替代业务验收。
3. 下次验收仍需完成有用模型回答、知航专属引用核对、桌面刷新持久化和手机视口观察；浏览器断网恢复动作本轮已经完成。记录不保存问题全文、token、provider 或内部诊断。
4. 全部通过后才能把状态改为“产品可用”；再次失败则保持待验收或如实标记 degraded。
