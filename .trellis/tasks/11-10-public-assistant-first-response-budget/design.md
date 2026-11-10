# 设计

HTTP 接收层创建 `deadlineAt`，通过执行协调器的私有 options 传入 Agent，绝不从访客 payload 接受该值。协调器构建权威请求时覆盖此字段，避免数据库或调用方带入更晚截止时间。未提供 options 的本地/兼容调用由 Agent 自己建立总预算。

Agent 的生成截止点为 HTTP/Agent 配置截止点较早者，减去 `min(5000, total * 20%)` 的收尾预留。既有独立备用尝试和 backoff 从生成预算中继续预留。每次回答传递三个私有值：流式 `timeoutMs`、首响应 `firstResponseTimeoutMs` 和该尝试的绝对 `deadlineAt`。

Responses adapter 默认不改变其他调用方行为。仅显式传入新选项时，响应头前使用首响应时限；响应头/流活动后继续使用已有 idle 时限。每次设置计时器都取对应等待时限与绝对剩余时间的较小者，保证 heartbeat 不延长总预算，404/405 的第二路径不能重新获得总预算。开始前/成功返回前再次检查绝对截止点和调用者取消。

公开 projection、持久化 hash 和日志结构不增加字段；现有 timeout_phase 只说明当时的传输阶段。实际耗尽的等待窗口只留在内部 diagnostic.timeoutMs。

验证分两层：本地 HTTP fixture 覆盖迟到响应头、idle 停顿、活跃流遇总截止、兼容路径共享截止和取消；实际执行协调器 + Agent + 模型适配器的注入 fixture 验证认领延迟、预算传递、零过期调用、备用预算及公开字段剔除。
