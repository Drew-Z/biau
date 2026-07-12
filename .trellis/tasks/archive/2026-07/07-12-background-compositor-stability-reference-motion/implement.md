# Implementation Plan

- [x] 提取三场景与明暗主题调色板，建立 renderer 单一类型契约。
- [x] 实现共享 WebGL renderer 和 fragment shader。
- [x] 实现 OffscreenCanvas worker、主线程 fallback 与生命周期控制。
- [x] 新增 FlowBackground 组件并替换旧背景 DOM。
- [x] 移除自动 static 性能推断、旧背景持续合成层和失效测试。
- [x] 添加 canvas 首帧、帧间变化、reduced-motion、暂停恢复、resize、场景切换检查。
- [x] 添加项目/博客长滚动连续截图与矩形瓦片异常检测。
- [x] 验证首页、目录、详情、桌面、320/390/430px、明暗主题与三场景。
- [x] 运行 lint、build、performance:check、专用 flow 检查和 check:ui。
- [x] 更新规范与任务记录，提交、归档并推送。

## Risk and Rollback Points

- Shader 编译失败必须回退 CSS，不得白屏。
- Worker 初始化超时必须转主线程 renderer，不得同时运行两个 renderer。
- 不一次性删除 UI surface tokens；只删除确认不再有消费者的背景选择器。
- 连续帧验证通过前不提交。