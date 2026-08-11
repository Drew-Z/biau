# 知航 BIAU Beacon 产品验收矩阵

更新时间：2026-08-11

## 当前结论

知航 BIAU Beacon 当前为 **工程就绪，产品待验收**。确定性合同已覆盖公开 API、会话版本、分支、浏览器状态、持久化、恢复、安全、取消和降级语义；这些检查没有触发模型、搜索、embedding 或 provider。产品级可用仍需要一次临执行前获得批准的真实业务请求。

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

1. 在执行前单独批准一条真实、公开安全的业务问题；该请求不能是 ping、doctor、空 prompt 或模型测活。
2. 记录部署 revision、时间、桌面/手机视口、回答状态、引用数量、刷新恢复和人工结论，不保存问题全文、token、provider 或内部诊断。
3. 全部通过后才能把状态从“工程就绪，产品待验收”改为“产品可用”；失败则保持待验收或如实标记 degraded。
