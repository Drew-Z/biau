# Background Compositor Stability and Reference Motion

## Goal

修复项目页、博客页等长页面持续渲染时出现的矩形瓦片闪烁，并将背景升级为与参考站同类的稳定流体画布动效，而不是仅复刻颜色。

## Background

截图显示项目页产生大块矩形色块，符合固定超大滤镜层、混合模式和 backdrop-filter 同时重绘时的 GPU raster tile / compositor artifact。

当前主站同时运行：

- `.app::before/::after` 固定超大 blur/mix-blend 动画；
- `.gradient-bg` 及其两个伪元素动画；
- `.harbor-environment` 五个持续动画层；
- grain 与大量玻璃 backdrop-filter。

参考站使用 CSS gradient/pseudo-element 作为首帧 fallback，随后创建 `.muxing-flow-canvas`；canvas ready 后停止并隐藏 CSS 动画层。其新版本还使用 OffscreenCanvas Worker、DPR 上限和帧率控制。

## Requirements

- 用一个固定视口 canvas 作为正常运行时背景，流动效果必须明显可见，接近参考站的流体渐变、雾流与颜色迁移，而不是简单背景位置移动。
- CSS 只负责 canvas 首帧前的稳定 fallback，不得与 canvas 长期并行运行。
- 正常设备不再根据内存、CPU、网络、Save-Data 自动关闭动效。
- 仅当 `prefers-reduced-motion: reduce` 时保留静态帧，这是用户明确的无障碍偏好，不是设备性能降级。
- canvas 必须固定为 viewport 尺寸，不随项目页或博客页文档高度扩大。
- 首选 OffscreenCanvas Worker；不支持时使用同一 renderer 的主线程 WebGL fallback；WebGL 不可用时保留 CSS fallback。
- 明暗主题及 dusk/garden/stellar 三种场景继续生效，切换时平滑更新画布调色板。
- Logo 入场期间背景暂停或保持静态，结束后恢复，不与入场竞争合成资源。
- 不引入 Three.js、GSAP 或新 UI 框架。

## Acceptance Criteria

- 首页、项目页、博客页、项目详情和博客详情只存在一个活跃背景运行时。
- canvas 首帧完成后 CSS 流体伪元素与 harbor environment 不再持续动画或合成。
- 项目页和博客页执行长距离往返滚动及连续帧采样时无矩形瓦片闪烁、空白帧或整块颜色跳变。
- 连续两帧画布像素存在可测变化，证明真实动效运行；reduced-motion 连续帧保持稳定。
- 320/390/430px、桌面、明暗主题及三种场景均非空、无横向溢出、内容层级正常。
- DPR 有上限，页面隐藏时停止 RAF，恢复可见后继续。
- lint、build、性能预算、专用背景检查和全量 UI 回归通过。

## Out of Scope

- 不复制参考站背景音、调试面板、随机调色 UI 或 boot 控制器。
- 不通过隐藏主站卡片玻璃效果来规避问题。