# Research

参考站在阅读页使用底部目录抽屉，核心收益是目录不持续占据正文顶部。主站已有固定底部主导航和公开助手，照搬位置会增加底部表面冲突。

主站现有 `DetailReadingGuide` 已具备章节跟踪、进度、锚点、Escape、外部关闭和浮层互斥。最小且高价值的吸收方式是在手机端加入方向感知显隐，不替换成熟的目录结构。
## Verification Evidence

- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- `npm.cmd run check:ui` passed for 14 routes, including direction-aware guide checks on blog, project, and status detail routes at desktop and 320/390/430px.
- 390px viewport screenshots visually confirmed a clear reading viewport while hidden and a compact sticky guide after upward scrolling.