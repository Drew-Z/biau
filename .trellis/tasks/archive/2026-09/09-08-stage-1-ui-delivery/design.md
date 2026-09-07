# Stage 1 交付设计

该子任务只有交付工作，不引入新的产品行为。原有差异经主会话直接审查后，以一个可恢复提交保存；UI 代码、配套检查和规范属于同一交付边界。

| 文件 | 已有行为 | 对应验证 |
| --- | --- | --- |
| navigation.css | 全站桌面字体与选中态一致；769–1023 导航容纳；移动四轨布局 | navigation-typography 的路由/语言/主题/交互/几何矩阵 |
| RightScrollCards.tsx、hero-split.css | 嵌套焦点暂停轮播；边缘渐隐缩窄 | 真实轨道位移、键盘操作、computed mask |
| catalog-pages.css | 博客阅读入口 44px 触控高度 | mobile blog columns |
| route-pages.css | 详情返回和 AI Daily 刷新触控高度 | mobile detail 与隔离 Feed fixture |
| check-ui.mjs、quality-guidelines.md | 上述行为的长期回归和规范 | UI-012 完整工作区 41 组通过 |

源文件在本子任务开始之前已由同一会话运行 lint/build/full UI/smoke/status/performance，之后未改源码。重复提交整理不改变被测内容，因此复用该验证并再次核对日志、语法、Git 内容和文件哈希；不能声称本子任务又运行了一次完整 UI。

回滚点为 `253b2213` 中的原版本和本次独立代码提交。实际回滚需根据后续状态做逆向补丁，不用 reset/clean，不覆盖其他任务。父任务协议单独提交，本子任务只提交上述 7 文件及自身资料。归档用 `task.py archive --no-commit`，审核后提交精确移动路径。
