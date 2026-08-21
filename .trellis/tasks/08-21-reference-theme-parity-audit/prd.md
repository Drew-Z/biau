# 参考站主题实现差距审计与补齐

## Goal

以本地参考站 `D:/workspace4Cursor/resourses/沐星埠.html` 及其运行时资源为证据，审计主站首页三套场景主题在首帧、背景、星场、Stellar 光效、标题动效、轮播交互和性能降级上的差距，并补齐高价值差异，使同一主题、视口和交互状态下的视觉语义、运动参数与生命周期尽量一致。

## Background

- 主站已具备 Dusk、Garden、Stellar 三套 typed visual profile、Flow、Starfield、StellarEffects、Hero cinema、轮播惯性和降级路径；现有检查证明内部契约稳定，但尚未证明与参考站运行时逐项一致。
- 参考站三主题内部键为 `"" | "nature" | "stellar"`，首帧会在主 CSS 之前恢复保存主题并注入对应渐变；其 Flow、Starfield、carousel、border flow 共用 `static | balanced | full` 渲染预算。
- 审计已确认的主要差异包括：主站 Starfield 位移/twinkle 公式、panel perimeter flow 算法、部分 carousel 释放常量、Hero cinema 时序，以及性能预算粒度。

## Requirements

### R1. 差距矩阵与证据

- 对主题首帧、Flow、Starfield、Stellar edge glow、panel perimeter flow、Hero cinema、carousel 和运行时降级分别记录参考行为、主站现状、差距、实现决策与验证方式。
- 参考站结论必须来自本地 HTML/JS/CSS 证据；主站结论必须来自当前源码或运行时采集，不把视觉猜测当成事实。

### R2. 三主题与首帧连续性

- 保持主站 Dusk、Garden、Stellar 命名、品牌、内容、路由和 light/dark 外观协议，不把参考站的品牌键名直接暴露给主站用户。
- 首帧背景、React 场景、CSS token、Flow、Starfield 与 Stellar owner 在主题恢复和场景切换时保持连续，不出现旧场景闪烁或 profile 版本撕裂。

### R3. 高价值视觉和运动一致性

- Starfield 对齐参考站的面积密度、深度平方视差、`52/42px` 最大位移、双正弦 twinkle、主题 opacity 与 reduced/static 冻结语义。
- Stellar edge glow 对齐目标范围、坐标换算、边缘范围与 opacity；品牌光源应绑定真实可见元素，而不是固定屏幕坐标。
- Panel perimeter flow 应沿真实圆角矩形周界移动，具备 `7600ms` 周期、`88×52` 基准光斑、垂直边 surge、panel reveal 和预算帧率控制，而非仅依赖 SVG dash 偏移近似。
- Hero cinema 和 carousel 应校准参考站公开运行时中的关键时长、stagger、wheel/drag/flick/inertia/tilt 常量；移动端、reduced-motion、low-power 下保持静态或简化路径。

### R4. 统一降级与生命周期

- 保留并完善 hidden/resume、reduced-motion、low-power、no-WebGL、no-Worker 与卸载 cleanup。
- 动画 owner 不因场景 prop 变化无意义重建；恢复时不得因累计时钟导致视觉跳变。
- 不为像素一致性牺牲可访问性、可操作性或合理性能预算。

### R5. 项目边界

- 复用参考站的视觉语义和可观察参数，不复制其私有脚本、Logo、站名、第三方字体、音效或外部网络资源。
- 不改变主站信息架构、路由、CTA、项目数据和既有主题切换入口；不引入第二套 UI 框架。
- 必须保留用户独立修改 `public/status/blog-semi-synthetic.json`，不得暂存、覆盖或提交。

## Acceptance Criteria

- [x] 任务目录内存在完整差距矩阵，每项含参考证据、主站证据、实现状态和验证结果。
- [x] 1440×1000 与 390×900 下，Dusk、Garden、Stellar 的 light/dark 组合可切换，首帧及场景转换无明显闪烁或 owner/profile 不同步。
- [x] Starfield 公式、主题 opacity、静态冻结和恢复语义与参考运行时一致，且对应自动化断言可观测。
- [x] Stellar header/hero/panel edge glow 与 panel perimeter flow 的几何、周期、reveal、预算和 cleanup 行为得到实现与验证。
- [x] Hero cinema 与 carousel 的关键常量和动态/静态分支完成校准，不破坏键盘、触控和 reduced-motion 行为。
- [x] hidden/resume、low-power、no-WebGL/no-Worker 降级路径通过检查；Canvas/RAF/listener/worker 无明显生命周期泄漏。
- [x] `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run performance:check`、`npm.cmd run check:ui:smoke` 与 `npm.cmd run check:ui` 通过。
- [x] `public/status/blog-semi-synthetic.json` 与本任务开始时相比保持原样且不进入提交。

## Out of Scope

- 复制参考站品牌资产、文字内容、字体文件、音效、私有源码或部署结构。
- 改造站点路由、数据模型、CMS、业务内容或非首页页面的信息架构。
- 在没有视觉收益或验证证据的情况下重写已经稳定的 Flow renderer 或引入新组件框架。
