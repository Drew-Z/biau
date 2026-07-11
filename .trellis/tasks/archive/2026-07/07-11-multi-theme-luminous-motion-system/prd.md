# Multi-theme Luminous Motion System

## Goal

恢复并完善 BIAU Port 已存在但被后续覆盖关闭的多层动态光效，使深色和浅色的 `dusk / garden / stellar` 场景都具有可辨识的流动色场、光束、雾层和边缘追光，同时保持当前品牌、内容结构、移动端可用性和性能预算。

## Evidence

- 本地参考站 `D:\workspace4Cursor\resourses\沐星埠_files\styles.css` 使用基础渐变、`body::before` fluid field、`body::after` flow ribbons 和主题专属 glow tokens 共同形成可见光场。
- 当前 `flow-pages.css` 已包含 `muxingFluidField`、`muxingFlowRibbons`、`harborDeepBeam`、`harborSpectrumSwim`、`harborLowMist` 和 `harborEdgeTrace`，但后续 stabilized override 将 app pseudo layers 和 `.harbor-environment` 设为 `display: none`。
- 当前线上深色截图因此只剩均匀蓝色渐变，参考站中的局部蓝光、青色光束、暖色高光和移动光团没有出现。

## Requirements

- 恢复基础色场之上的 fluid field 与 ribbon motion，不以单层背景渐变冒充完整动态光效。
- 恢复 `.harbor-environment` 的 edge、beam、spectrum 和 mist 层，但按桌面/移动端设置不同强度和复杂度。
- `dusk`、`garden`、`stellar` 在浅色与深色主题下均保持独立的光色、混合模式和动态层次。
- 深色 `stellar` 必须有明显但不遮挡内容的深蓝/钴蓝主光、青色窄光和少量暖金边缘高光。
- 浅色主题保留晨雾港湾可读性，动态光不能把卡片变成霓虹白板。
- 不复制参考站品牌、文案、Logo、音效或运行时性能控制 UI。
- 手机端保留可见光效，但减少 blur 半径、层面积和 opacity，页面滚动与横向项目轨道保持流畅。
- `prefers-reduced-motion: reduce` 停止所有新增动画并保留静态主题层次。
- Harbor Intro 运行期间继续隐藏主页背景层，避免入场动画与常驻光效叠加。

## Acceptance Criteria

- [x] app pseudo layers 的 computed animation 分别包含 `muxingFluidField` 和 `muxingFlowRibbons`，且不再是 `display:none`。
- [x] `.harbor-environment` 在正常动效偏好下可见，beam/spectrum/mist 和 edge trace 均有有效 animation name。
- [x] 六种主题组合（浅/深 × dusk/garden/stellar）的关键光效 token 不完全相同。
- [x] 深色 stellar 截图能清楚看见局部主光、流动光束和边缘高光，不再是均匀蓝底。
- [x] 浅色三场景仍保持文字和卡片对比度，背景不退化为纯灰或静态单色。
- [x] 390px 手机端无横向溢出、导航重叠和明显内容遮挡。
- [x] reduced-motion 下背景保持静态且没有无限动画。
- [x] `lint`、`build`、`performance:check`、`check:ui` 通过。
- [x] 桌面与手机截图、跨时间像素差异经过验证。

## Out Of Scope

- 不引入 GSAP、Three.js、Canvas 粒子或新的第三方动画依赖。
- 不重做首页布局、项目卡片内容、Logo 或 Harbor Intro 分镜。
- 不复制参考站的性能模式切换器、背景音和入口 spotlight。

