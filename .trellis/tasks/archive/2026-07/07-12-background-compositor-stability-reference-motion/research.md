# Research

## Reference Evidence

参考站 `styles.css` 定义 `muxingGradientFlow`、`muxingFluidField`、`muxingFlowRibbons` 作为 fallback，并在 `body.muxing-flow-canvas-ready` 后停止 body 与伪元素动画、隐藏它们。

参考站 `app.js.下载` 的 `createWorkerMuxingFlowCanvas()`：

- 创建 `.muxing-flow-canvas`；
- 优先 `transferControlToOffscreen()`；
- Worker 初始化失败时调用 main-thread canvas fallback；
- viewport DPR 在完整档也封顶约 1.25；
- 根据 visibility、reduced-motion、battery 与 idle 状态控制运行；
- canvas ready 后切换 CSS class，确保 fallback 与 canvas 不长期叠加。

## Root Cause in BIAU

主站目前把参考站 fallback 层当成最终运行时，又额外叠加 harbor environment：至少 2 个 app fixed pseudo、3 个 gradient 层、5 个 harbor 层以及 grain 同时存在。长文档中的大量 backdrop-filter 卡片使浏览器持续重建合成纹理，截图中的大矩形色块与瓦片边界一致。

## Decision

复用参考站的架构思想，不复制其压缩代码：CSS fallback → 单 canvas runtime → ready 后停 CSS。使用 BIAU 自有三场景调色板和原生 WebGL shader。
## Implementation Result (2026-07-12)

- Replaced the legacy multi-layer fixed CSS compositor background with one viewport-sized WebGL2 canvas.
- Production prefers OffscreenCanvas Worker; development uses the shared main-thread renderer so React StrictMode can verify lifecycle cleanup safely.
- Removed device/network-based static profiling. Only `prefers-reduced-motion` renders a stable frame.
- Verified production Worker first frame and scene updates at 390x844 with no console errors.
- Verified animated frames differ and reduced-motion canvas frames remain identical.
- Verified project long-scroll at 390x844 and 1440x900; no legacy background DOM remains.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
- `npm.cmd run performance:check`: passed (CSS 217032/240000, JS 393433/430000 bytes).
- `npm.cmd run check:ui`: passed for 14 routes across 2 viewports.
