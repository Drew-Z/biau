# 设计

App 用独立 pathname effect 调用 schedulePublicAssistantReadingWarmup；helper 在现有 warmup 模块内管理延迟和 visibility/online/offline/pagehide/pageshow 监听，返回幂等 cleanup。使用现有路由形状，不把文章内容或私有状态加入调度。

模块级一次性标记只在满足 5 秒等待后消费，不因 Strict Mode mount/cleanup 或过早导航而消耗。消费时只在 idle 状态调用 startPublicAssistantWarmup，因此不会把 open widget 的过期 ready 撤为 warming，也不额外自动重试 error。后续显式用户意图行为保持现有合同。

只预热 health，不提前挂载 Widget 或生成请求。仅隐藏/离线/pagehide 前尚未触发的计时器由调度器清理；现有 pagehide 中止仍由 warmup 统一负责，调度器不会中止其他用户意图共享的进行中请求。

本地浏览器采用虚拟时钟、health fixture 与外部网络拦截，覆盖 1440/320/390/430、三主题和两语言组合。新测试接入既有 availability 入口，使全量 UI 继续覆盖。

回退仅恢复记录基线中的 App、warmup 和测试/规范差异；无需云端配置或数据库变更。
