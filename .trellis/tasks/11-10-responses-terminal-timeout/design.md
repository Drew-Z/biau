# 设计

共享 Responses SSE decoder 在解析到完整终止事件时停止消费后续帧、取消 reader 并释放锁；正常 EOF 的已有兼容行为保留。只结束文本片段的事件继续等待后续片段或整响应完成。上游失败、调用者取消和超时不得返回半截答案。

完成时取消 reader 是异步边界，返回成功前再次检查调用者 signal。单独 fixture 在 body.cancel 中触发用户 abort，证明取消不会被完成处理吞掉。

`requestEndpoint` 跟踪四个固定超时阶段：`awaiting_headers`、`awaiting_stream`、`streaming`、`reading_body`。阶段只在内部 idle/请求 timer 触发时进入 `ProviderDiagnostic.timeoutPhase`。普通 JSON 响应归类为 reading_body，不据此推断是否已收到部分正文。

既有单条 recovery 日志经白名单增加 `timeout_phase`，不增加常规逐请求日志或公开字段。保留现有 failure_class/origin 归因，不把阶段当成供应商故障的证明。

独立的 loopback fixture 覆盖完成后不关连接、终止后多余帧、分片、非终止片段、停顿、取消和大小边界，由既有 public-model-check 调用。质量矩阵同时检查新内部字段不能穿过公开 projection 或快照。
