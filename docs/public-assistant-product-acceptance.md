# 知航 BIAU Beacon 产品验收矩阵

更新时间：2026-08-12

## 当前结论

知航 BIAU Beacon 当前为 **工程就绪，生产生成降级，产品待验收**。确定性合同已覆盖公开 API、会话版本、分支、浏览器状态、持久化、恢复、安全、取消和降级语义；这些检查没有触发模型、搜索、embedding 或 provider。2026-08-12 的首次真实业务验收已完成一次请求，但生成链路在三次有界尝试后仍返回降级证据摘要，因此不得标记为产品可用。

## 验收矩阵

| 能力 | 确定性证据 | 当前状态 | 产品级证据 |
| --- | --- | --- | --- |
| 首次打开与免费实例预热 | `/health` warm-up 状态、一次有界重试、草稿保留和零 chat 自动请求 | 已通过合同与完整 UI 回归 | 观察生产首次打开、等待提示与恢复操作 |
| 提问与回答 | 请求/流式终态 decoder、回答状态与失败分类 | 已通过 | 一次真实业务问题得到有用模型回答 |
| 引用与证据 | citation/claim 正规化、证据边界与无效引用拒绝 | 已通过 | 人工打开至少一个引用，核对回答与来源一致 |
| 会话、版本与分支 | Turn/Revision/Branch、编辑重发、重试、历史恢复和刷新持久化 | 已通过 | 真实回答刷新后仍恢复到同一会话与版本 |
| 失败恢复 | timeout、network、not_configured、upstream、empty、invalid 与取消 fixture | 已通过 | 浏览器侧拦截请求后恢复网络，再完成同一获批业务任务；不诱发 provider 故障 |
| 桌面、手机与全屏 | 320/390/430、compact/fullscreen/history 的 UI 合同 | 已通过完整 UI gate | 手机视口人工观察输入、回答、引用、历史和退出全屏 |
| 信息安全 | 固定低敏错误文案、无 provider/endpoint/key/stack 泄漏 | 已通过 | 验收记录只保留版本、时间、状态、引用数与结论 |

## 2026-08-12 生产验收记录

| 证据 | 低敏结果 |
| --- | --- |
| 部署版本 | Cloudflare Pages、Public API 与 RAG 均已部署 `059b74a2` |
| 健康边界 | 同源 `/api/health`、Public API `/health` 与 RAG `/health` 均返回 `200`；健康检查未调用模型 |
| RAG 配置 | Supabase pgvector、向量/关键词/reranker readiness 均为 true；修正 Public API 中多余句点导致的 RAG base URL 错配 |
| 真实业务请求 | HTTP `200`，但终态为 `degraded`、生成模式为 fallback，运维失败类别为 `provider_unavailable` |
| 引用 | 返回 3 条合法站内引用；因模型回答未成功，不计为有用回答的引用验收 |
| 持久化 | API 重新加载后会话、分支、turn、revision 和 3 条引用均一致 |
| relay 边界 | 主、备固定 relay 的配置与共享鉴权均通过不触达上游的无效请求合同检查；当前失败发生在上游 `5xx` 边界 |
| 结论 | 生产链路、RAG 证据与持久化可用，模型回答不可用；保持“产品待验收” |

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

1. 先在供应商控制台处理当前上游 `5xx`，不用 ping、doctor、空 prompt、catalog probe 或逐模型测活替代业务验收。
2. 下一条真实、公开安全的业务问题必须在执行前重新获得批准；不对本次失败自动重试。
3. 下次验收需同时完成有用模型回答、引用核对、刷新恢复、浏览器侧失败恢复和手机视口观察；记录不保存问题全文、token、provider 或内部诊断。
4. 全部通过后才能把状态改为“产品可用”；再次失败则保持待验收或如实标记 degraded。
