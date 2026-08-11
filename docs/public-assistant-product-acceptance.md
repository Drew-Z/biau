# 知航 BIAU Beacon 产品验收矩阵

更新时间：2026-08-12

## 当前结论

知航 BIAU Beacon 当前为 **工程就绪，生产配置已修复，产品待重新验收**。确定性合同已覆盖公开 API、会话版本、分支、浏览器状态、持久化、恢复、安全、取消和降级语义；这些检查没有触发模型、搜索、embedding 或 provider。2026-08-12 的首次真实业务验收因 Public API 缺少模型 base 配置而在三次有界尝试后返回降级证据摘要；配置已补齐，非模型健康与 relay 合同已通过，但在新的明确批准前不得自动重发真实问题，也不得标记为产品可用。

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
| 部署版本 | 首次真实请求运行于 `207a5fe6`；配置修复后，知航专属知识与 fail-closed 防复发修复已通过 `fdd733a8` 部署到 Cloudflare Pages、Public API 与 RAG Orchestrator |
| 健康边界 | Cloudflare 同源健康、Public API `/health` 与 RAG `/health` 均返回 `200`；Cloudflare relay 无认证请求和 RAG sync 无认证请求均返回稳定 `401`，这些检查未触达模型上游 |
| 首次真实业务请求 | HTTP `200`，约 9.3 秒完成；终态为 `degraded`、生成模式为 fallback、恢复状态为 degraded、三次有界尝试的公开失败类别为 `upstream` |
| 首次检索与引用 | 站内检索错误偏向 Legal RAG，未命中知航专属资料；返回引用可以访问，但不满足该问题的事实覆盖要求，因此引用验收不通过 |
| 持久化 | API 重新加载后会话、分支、turn、revision 与引用保持一致；验收完成后已删除临时会话 |
| 已定位根因 | Render Public API 缺少模型 base 环境配置，服务回退到与当前 relay token/model 不兼容的默认 upstream，导致生成失败 |
| 配置修复 | 已补齐模型 base 配置并重新部署；`/health` 与不触达上游的 relay 输入合同通过，尚未消耗新的真实模型验收请求 |
| 检索修复 | 知航专属公开知识、别名、实体关系和排序权重已上线；版本化 Public RAG sync 成功，生产 Supabase pgvector readiness 为 vector/keyword/reranker 全绿，规模为 31 docs / 61 chunks / 166 entities / 231 relations；离线 `assistant:eval` 通过 17/17 且 `modelCalls=0` |
| 结论 | 配置根因、错误检索与缺失部署均已修复；仍需新的明确批准完成同一真实业务闭环，当前保持“产品待重新验收” |

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

1. 下一条真实、公开安全的业务问题必须在执行前重新获得批准；不对首次失败自动重试，也不用 ping、doctor、空 prompt、catalog probe 或逐模型测活替代业务验收。
2. 下次验收需同时完成有用模型回答、知航专属引用核对、刷新恢复、浏览器侧失败恢复和手机视口观察；记录不保存问题全文、token、provider 或内部诊断。
3. 全部通过后才能把状态改为“产品可用”；再次失败则保持待验收或如实标记 degraded。
