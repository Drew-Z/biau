# 技术设计

## 1. 边界与目标

本任务分为 Figma 设计基线、动效生命周期修复、主题渲染等效、交互节奏对齐和质量验证五个边界。Figma 是可审阅的行为合同；代码仍由现有 `FlowBackground`/`FlowRenderer`、首页 scene hook、carousel 与 class-based CSS 负责，不把设计稿当成新的运行时。

## 2. Figma 组织

在文件 `unsaved-mt0594sy-m6x1cr9v` 中新增页面 `BIAU Port · Reference Motion Fidelity`，页面内按以下结构组织顶层 frame/section：

```text
00 Motion Overview
01 Dusk
  Dusk / Desktop 1440
  Dusk / Mobile 390
  Dusk / Motion Timeline
  Dusk / Interaction States
02 Garden
  Garden / Desktop 1440
  Garden / Mobile 390
  Garden / Motion Timeline
  Garden / Interaction States
03 Stellar
  Stellar / Desktop 1440
  Stellar / Mobile 390
  Stellar / Motion Timeline
  Stellar / Interaction States
90 Implementation Notes
```

静态 frame 用可编辑图层保留页面信息；重复 project card 使用组件/实例。motion frame 以状态列和时间刻度表达触发器、duration、easing、可见层和 fallback；支持时写入 Figma timeline/keyframe，导出 MP4 或截图供审阅。

## 3. 代码数据流

```text
theme/scene intent
  -> one atomic profile commit
  -> Flow profile + surface foundation + theme decoration
  -> renderer first-frame / CSS fallback parity
  -> interaction owners (parallax, title, carousel, stellar effects)
```

- 主题应用入口只允许一个原子更新点，广播完整 profile 版本；各装饰层通过 profile 版本重建，不能分别监听并先后切换。
- `FlowBackground` 保留 WebGL2 -> Worker -> main-thread -> static fallback 链路，但首帧策略改为“fallback 立即可见，canvas 首个有效帧确认后平滑接管”，不再由 React ready 属性控制初始可见性。
- 主题/媒体/visibility 变化只更新 renderer 的 profile/暂停状态；避免销毁并重建可见 canvas，除非上下文确实失效。
- Stellar 星场、edge glow、panel border flow 共享一个可清理的 scene-effects owner；Nature 的 spring 禁用和 Dusk 的 indicator 由同一 profile 驱动。
- 标题、carousel、reveal 和 portal 继续使用现有组件/工具，补齐参考站的时序参数和可测 data 属性；不引入 GSAP/Three.js。

## 4. 闪烁修复策略

1. 审计 `FlowBackground` 的 `ready/fallback/motionState` DOM 属性及所有 `opacity:0` 入口，建立首次加载时间线。
2. 让 `.flow-background` 的 fallback 在 hydration 前即可渲染；canvas 为透明叠层，只有在首个有效帧后切换接管标记。
3. 主题切换先计算完整 profile，再在同一个事件循环中提交 CSS variables、data attributes 和 renderer profile，随后启动 view transition。
4. 清理双 RAF、重复 resize/profile 调用与旧主题装饰层残留；切换失败时保持上一完整主题，不短暂显示空背景。
5. 对 reduced/hidden/low-power/no-WebGL 走确定性的静态或低帧路径，禁止等待异步 canvas 才显示内容。

## 5. 兼容与回滚

- 保留现有公开路由、DOM 语义、CSS token 名和测试选择器，新增属性只用于观测。
- 每一批改动保持可独立回滚：先首帧/生命周期，再主题效果，再交互节奏。
- 如像素检查显示参考行为下降，回退对应 profile/owner 改动，不回滚用户的 status JSON。

## 6. 风险

- Figma Motion API 可能无法表达 shader/粒子/指针 mask；用 storyboard + handoff notes 明确边界。
- 单 Canvas 约束限制真实多层 WebGL；优先复用 renderer 的 profile/装饰通道，避免重复渲染器。
- 过度追求参考站像素复制可能破坏 BIAU Port 内容层，因此以行为和空间层级等效为准。
