# 执行

1. 已读取线上 awaiting_headers 证据、HTTP/执行协调器/Agent/共享 Responses 的预算实现。
2. 先保存 Git 恢复点；另一会话正修改的部署文档使用集中实体快照保留，不改实例档位或覆盖其工作。
3. 先增加失败回归，再实现从 HTTP 截止时间到模型请求的预算传递及首响应/idle 分离。
4. 验证截止、取消、备用保留窗口、幂等/持久化、JSON/SSE、既有共享消费者兼容；运行相关模型/Agent/质量、server/前端构建、lint 与文档检查。
5. 保存可审查补丁、恢复与清理记录，再申请具体发布及一条新的真实文章比较。当前真实模型调用额度为 0。

状态：离线实现与验证完成，等待本候选发布及一次新业务问题授权。未提交、未推送、未部署，原有模型、渠道、20 秒 idle、45 秒总预算和一次最终生成配置保持。

## 实现与边界

- JSON/SSE 将同一个服务端绝对截止时间传入执行协调器；数据库认领与无数据库两条分支均覆盖请求携带的值，Agent 不会重置前置耗时。
- 回答生成预留最多 5 秒（不超过配置总预算的 20%）用于校验和持久化，再预留独立备用尝试与 backoff。生产配置的生成时间最多为 40 秒，还需扣除认领、规划和检索耗时。
- 首响应等待使用剩余生成预算；收到响应头后使用原有 idle。每次计时、持续 heartbeat 和 404/405 兼容路径受同一绝对截止限制，预算耗尽零生成。
- 用户取消优先于过期快路径；成功返回前再检查截止与取消。没有添加公开字段、持久化字段、日志字段或环境变量。
- 这只能消除本地过早放弃的条件，不能保证供应商及时返回，也不能证明认证、模型或协议存在错误。收尾预留也不保证慢数据库一定在窗口内保存完成。

## 验证

先加入延迟 350 ms 响应头 / 原 idle 150 ms 的回归，旧实现按预期失败；修复后允许在 700 ms 首响应窗口内完成。另补“已取消且已过期”回归，先复现取消被转成 timeout，再修复并通过。测试数据的两处 TypeScript 推断问题已修正，没有类型断言绕过接口检查。

通过的离线检查：

- `assistant:public-model-check`：首响应、idle、绝对截止、活动流、兼容路径、取消、认领耗时和保存预留，既有 terminal/lifecycle/adapter/consultation 合同。
- `assistant:public-agent-check`、`assistant:public-quality-check`、`assistant:public-image-check`、`assistant:public-api-check`、`assistant:public-persistence-check`、`assistant:public-metrics-check`。
- `ai-daily:model-runtime-check`：共享适配器兼容，8 次 loopback、外部供应商请求 0。
- `server:smoke`、`assistant:service-modes-smoke`：本地 JSON/SSE 与服务边界。
- 新 fixture 的严格独立 TypeScript 检查、`server:build`、前端 app/node 类型检查与 Vite 生产构建、`lint`。
- `docs:deployment-check`、`docs:manual-gates-check`、`docs:observability-check`、`git diff --check`。

构建输出使用本任务独立系统临时目录。全部真实模型请求 0、子代理 0；没有执行已消费的旧真实验收脚本、测活、模型目录探测或重试。恢复与低敏证据集中在既有恢复组 `20261012T034101524Z-pet-studio-revision` 的 `firstResponseRepair` 和 `evidence/public-assistant-channel-20261109/first-response-*`。

## 待批准发布

只提交本任务候选，保留另一会话的常驻升级修改；源码发布使用 `[skip render]`，仅手动部署 Public，保持现有渠道、模型、配置及 RAG/Studio 边界。发布后先做不触发模型的健康与配置核对。

申请一次新问题：“请比较本站《合同审查 RAG 项目复盘：引用、诊断、评测与受控演示》和《Legal RAG 生产化路线：项目空间、pgvector、评测与受控演示》两篇文章，区分已实现能力与规划，并引用来源。”最多提交一次，失败不自动重试。验收完整 SSE、回答状态、两篇来源和低敏 timeout_phase；传输成功不能替代模型完整回答验收。

依据 `docs/deployment.md` 的真实业务门禁，上一轮单次授权已经消费；本次离线完成不增加真实请求额度。
