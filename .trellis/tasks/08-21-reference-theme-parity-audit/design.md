# 技术设计：参考站主题实现差距审计与补齐

## 边界与原则

本任务在现有首页视觉架构内增量校准，不创建第二套主题系统。`useHarborScene` 仍管理 Dusk/Garden/Stellar 场景，`useTheme` 仍管理 light/dark；typed visual profile 是 Flow、Starfield、Stellar 与 CSS token 的共同来源。参考站键名仅作为审计映射：晨光→Dusk、自然→Garden、星辰→Stellar。

## 数据流与 owner

1. prepaint 同步读取主站已存在的场景/外观存储，写入 `html` 的 data 属性和最小背景 token。
2. React 启动后由场景 profile 接管完整 token；profile version 只在真实场景/外观变化时递增。
3. `FlowBackground` 和 `StarfieldBackground` 保持稳定 owner，通过 `setVisualProfile` 更新运行时参数。
4. `StellarEffects` 统一管理全局 Stellar 光效状态；panel 自身暴露 live DOM 几何，周界 flow owner 根据真实圆角矩形和预算更新 CSS 变量。
5. `useHeroCinema` 与 `RightScrollCards` 使用明确常量与诊断 data 属性，静态模式不运行高频 RAF。

## 核心实现

### Starfield

- 使用参考密度 `clamp(round(area/4800), 150, 280)` 和固定种子。
- 四层深度映射到 profile opacity/颜色；视差使用 `depth²` 并缩放到 52/42px。
- twinkle 使用参考双正弦；reduced/static 路径固定为 1。
- 主题 opacity 在 typed profile 中表达，避免 renderer 内重复主题名。

### Stellar edge 与 perimeter

- edge glow 使用元素局部坐标，range 为 `clamp(min(width,height)*.14, 52, 96)`，离开目标后清零。
- 品牌高光通过 live `.nav-logo` / intro mark 的 bounding rect 更新 CSS 变量；resize/scroll/scene change 时重测。
- perimeter flow 读取 panel 尺寸和 computed border radius，计算圆角矩形周长和光点位置；周期 7600ms，基准 88×52，垂直边增加速度及 major 尺寸。
- panel 达到可见阈值后用 1400ms smoothstep reveal；balanced/full 分别限制 30/45fps；static/reduced/low-power 置零并停止 RAF。

### Hero 与 carousel

- 保持 React/GSAP 现有实现，不引入参考站 SplitText 私有运行时；只校准可观察时序：普通 outgoing 0.5s、incoming 1.05s、stagger 0.046；impulse incoming 0.82s，并保留方向投影。
- carousel 对齐 auto 0.3、friction 4、flick 1.2、wheel 2.5、max velocity 4200、min glide 16、max dt 0.02、5px click threshold、80ms stale release 与 ±2.5deg tilt。

### 性能与降级

- 优先复用现有 performance profile/low-power 信号，按组件映射参考预算；本任务不在无证据情况下重做全站硬件评分系统。
- hidden/resume 统一 rebase 动画时钟；WebGL/Worker 失败继续走 CSS 或主线程降级。
- 新增 `data-*` 属性用于 UI 检查读取模式、帧率预算、profile version 和活跃状态。

## 兼容与回滚

- 所有增强均保持 CSS fallback 和静态 DOM 内容；脚本失败不阻塞首屏内容。
- 每个模块独立提交前验证，可通过恢复旧常量/owner 分支回滚，不修改数据和路由。
- 不触碰用户修改文件 `public/status/blog-semi-synthetic.json`。

## 取舍

- 目标是可观察行为与视觉参数一致，不复制参考站代码结构。React owner、typed profile 与现有 GSAP 依赖优先于逐字同构。
- 统一性能评分只补足对视觉一致性有直接作用的预算；CPU/内存/网络启发式若现有架构没有承载点，则记录为非阻塞剩余差异。
