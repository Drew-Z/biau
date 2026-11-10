# 执行

1. 已读取线上 awaiting_headers 证据、HTTP/执行协调器/Agent/共享 Responses 的预算实现。
2. 先保存 Git 恢复点；另一会话正修改的部署文档使用集中实体快照保留，不改实例档位或覆盖其工作。
3. 先增加失败回归，再实现从 HTTP 截止时间到模型请求的预算传递及首响应/idle 分离。
4. 验证截止、取消、备用保留窗口、幂等/持久化、JSON/SSE、既有共享消费者兼容；运行相关模型/Agent/质量、server/前端构建、lint 与文档检查。
5. 保存可审查补丁、恢复与清理记录；用户随后明确批准发布及一条新的真实文章比较，该单次授权现已消费。

状态：修复已发布，获批单次业务验收已执行；首响应等待扩大，但完整回答仍因响应头到达前超时而未通过。原有模型、渠道、20 秒 idle、45 秒总预算和一次最终生成配置保持。

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

## 已批准发布与单次验收

只提交本任务 16 个文件，保留另一会话的免费实例决策及其他未提交修改。源码提交 `26b0eea889b370ca9bf18ea37be71e0057e00cf5` 使用 `[skip render]`，手动触发 Public 一次：`dep-dbpbklrbc2fs739oh19g` 已 live；Pages `47f67894-5856-4bcf-aa86-f064b8ac3d28` success。Site Quality `42769104855` 与 RAG sync `42769105010` 均成功。RAG 同步临时使用只读模式，结果 skipped，变量随后恢复原先不存在状态。

部署后 health=200、database/modelConfigured=true，全部 29 项环境变量指纹与发布前一致；默认仍为用户指定的精确模型，fallback/vision 未启用。先完成以上检查，再仅提交一次获批问题：“请比较本站《合同审查 RAG 项目复盘：引用、诊断、评测与受控演示》和《Legal RAG 生产化路线：项目空间、pgvector、评测与受控演示》两篇文章，区分已实现能力与规划，并引用来源。”

UTC `2026-11-10T06:38:39.761Z` 提交，`06:39:20.301912473Z` 出现 `awaiting_headers` recovery 日志，约 40.5 秒；公开 Agent duration 为 35,479 ms，HTTP 窗口包含其开始前的认领时间。最终 HTTP 200、完整 ready/progress/result/done，degraded/fallback/timeout，生成尝试 1、自动重试 0。route=site，4 条站内证据、0 条网页证据，两篇指定文章引用均保留。

扩大等待窗口已生效，本次仍没有观察到上游 HTTP 响应头；不能据此断言供应商是否收到/处理请求，或密钥、模型、协议错误。没有继续延长总预算，也没有额外探测或真实重试。完整模型比较仍未验收。

四条站内引用读取 200、390px 无横向溢出、刷新恢复回答、临时会话 DELETE 200/再读 404 均通过；桌面及手机截图已目视，浏览器已关闭。青珑实际观察到 thinking/working/review/idle，其余真实状态仍未覆盖。证据为集中目录下 `first-response-approved-business.json`、两张截图和 `first-response-release-verification.json`；旧失败记录保留。

集中恢复组增加三份发布记录前快照，用于保留另一会话更新后的免费实例决策及原离线交接状态；不覆盖首次基线。本轮不创建工作区临时目录，不删除历史资产或其他会话文件。依据 `docs/deployment.md` 的真实业务门禁，本次单次授权已经消费。
