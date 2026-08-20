# 参考站三主题动效 Figma 还原与代码重构

## Goal

让 BIAU Port 首页的三个主题在视觉层级、动效语义、节奏和交互反馈上达到本地参考站的行为等效，而不是只切换色板；先在 Figma 建立可审阅的三主题关键帧与动效交接稿，再在现有 React/Vite/TypeScript 单 Canvas 架构中实现，并消除首次加载和主题切换闪烁。

## Background

- 参考站已确认存在三种不同的动态语言：晨光的暖冷潮线与清晰色带、自然的高噪声慢速柔焦流场、星辰的高扭曲深空间与多深度星场/边缘能量。
- 当前主站已经有三主题静态 surface token 与部分 Flow/卡片动效，但实际观感仍接近换色，且 `FlowBackground` 的 ready/fallback 时序、CSS 入场 opacity/blur、主题切换期间 profile 与 surface 不同步，可能导致闪烁。
- 当前连接的 Figma 文件为 `泊语 HarborTalk | Chatus · Member UX System`，已有页面 `BIAU Port · Theme System`（静态三主题场景）和 `Page 1`；本任务不继续污染 `Page 1`。

## Requirements

### R1. Figma 先行还原

- 在现有 Figma 文件中新建独立页面 `BIAU Port · Reference Motion Fidelity`，保留现有页面不动。
- 建立 `00 Motion Overview`、`01 Dusk`、`02 Garden`、`03 Stellar`、`90 Implementation Notes` 分区。
- 每个主题至少包含 desktop/mobile 静态关键帧，以及 `idle`、`intro`、`scene transition`、`pointer parallax`、`carousel drag/flick`、`reduced motion`、`fallback/no-WebGL` 状态。
- 用 Figma Motion API 能力表达可表达的 timeline/keyframe；无法导出的部分用明确的 storyboard、持续时间、缓动、触发器和代码映射注释表达，不伪装成可直接导出的 CSS/JS。
- 维持 BIAU Port 的品牌、内容、路由、CTA、项目状态和助手，不复制参考站品牌、Logo、文案、第三方字体或外部资源。

### R2. 动效行为等效

- 晨光：独立 shader 色场、暖冷纵深、清晰色带、轻量视差和铜金导航指示器。
- 自然：紫雾到青水/鲜绿的大尺度慢速高噪柔焦流场、绿色玻璃材质，并降低星场和强弹簧感。
- 星辰：深蓝靛紫高扭曲 Flow、多深度星场与温度/闪烁/视差、指针触发的实体边缘光、约 7.6 秒周界巡航光流；保留当前单 Canvas 约束并以现有渲染 owner 统一管理。
- 对照参考站的标题电影化入场、标题弹性拖拽换句、纵向无限 carousel 的拖拽/wheel/flick/inertia/tilt、卡片 reveal 和场景切换，采用现有架构实现行为等效，不引入 GSAP、Three.js 或新的动画框架。

### R3. 消除闪烁与生命周期统一

- 首帧必须由 CSS fallback 与 Canvas/Worker 首次可见帧保持一致；禁止通过 `opacity: 0 -> 1` 和交错双 RAF 造成用户可见闪现。
- 主题切换必须一次性提交完整的主题 profile、surface 和装饰层，再执行单次 view transition；不得出现半套主题状态。
- 统一处理首次加载、主题切换、场景切换、`hidden/resume`、reduced-motion、low-power、coarse pointer、无 WebGL/Worker 的启动与清理。
- 不使用常驻 React 帧状态驱动动画；所有 listener、RAF、worker、canvas、媒体查询和全局 cleanup 必须可追踪、可回收。

### R4. 可验证性

- 为每个主题和降级模式提供可测 DOM 状态或 data 属性，便于 smoke/performance/UI 检查。
- 至少覆盖 desktop 1440、mobile 390、reduced-motion、无 WebGL fallback 四类截图/像素检查；验证无首屏闪烁、无文本裁切/重叠、Flow 非空且主题切换稳定。
- 保留现有 `npm.cmd run lint`、`npm.cmd run build`、performance、UI smoke 和完整 `check:ui` 门禁。

## Constraints

- 只修改本任务范围内的 Figma 页面、`src/components`、`src/background`、相关首页样式/测试/spec；不覆盖用户已有的 `public/status/blog-semi-synthetic.json` 变更。
- 继续使用现有 class-based CSS、设计令牌和 `lucide-react`。
- 不复制参考站的品牌资产、外部字体、网络资源或调试面板。
- 所有源码编辑使用 `apply_patch`，改动小步可回退。

## Acceptance Criteria

- [ ] Figma 中有独立的 `BIAU Port · Reference Motion Fidelity` 页面，三主题 desktop/mobile 关键帧、motion storyboard/timeline、交互状态和实现映射完整可审阅；原有 `Page 1` 与 `BIAU Port · Theme System` 未被破坏。
- [ ] 三主题的动态语言在代码中可区分：Flow 参数/纹理/材质/装饰/交互节奏不再只是颜色切换；星辰边缘光与周界光流、自然柔焦流场、晨光暖冷潮线均有对应实现或明确降级。
- [ ] 首次加载、主题切换、场景切换和恢复过程不出现可见闪烁；CSS fallback、首个 Canvas 帧和主题 profile 同步。
- [ ] reduced-motion、hidden、low-power、coarse pointer、无 WebGL/Worker 均能稳定降级并完整清理资源。
- [ ] 1440/390/reduced-motion/no-WebGL 检查通过，无空白画布、布局重叠、文本裁切或不可达交互。
- [ ] `npm.cmd run lint`、`npm.cmd run build`、项目既有 performance/UI smoke/`check:ui` 全部通过。

## Out Of Scope

- 不重做主站信息架构、内容文案、项目数据、后端或部署配置。
- 不实现参考站中当前 CSS 可能关闭的空间门户，除非现有路由与验收测试明确要求；仅保留兼容扩展点。
- 不引入新的动画运行时或第二个 Canvas。
