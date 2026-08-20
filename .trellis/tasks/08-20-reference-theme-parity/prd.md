# 参考站三主题视觉保真重构

## Goal

审计本地参考站 `D:/workspace4Cursor/resourses/沐星埠.html` 及其运行时资源，并将 BIAU Port 主站的暮港（Dusk）、自然（Garden）、星辰（Stellar）三个主题重构为与参考站相同的视觉层级、动效语义、渲染时序和交互反馈。保留主站的信息架构、内容、路由、品牌和项目数据，不复制参考站品牌资产、文案、私有资源或外部站点代码。

## Confirmed findings

- 参考站首屏不是单一换色：它在 pre-paint 阶段写入主题渐变，并由独立 Flow WebGL、独立 2D 星场、主题材质层共同构成背景。
- 参考站的 `stellar` 主题包含多深度星场、星点温度/闪烁/指针视差、标题/面板边缘光、约 7.6 秒周界流光和 3D 品牌星标；`nature` 主题降低星场与弹性感，使用慢速高噪柔焦绿玻璃流场；默认暮港主题使用暖冷潮线、清晰色带和铜金指示器。
- 参考站使用 `app.js`、`home-runtime.js`、`tools-starfield.js`、`hero-accents.js` 以及 GSAP/SplitText 完成 Flow、星场、标题电影化入场、字符级弹性切换、面板周界光和交互音效。
- 当前主站 `src/background/FlowRenderer.ts` 只有一个 Flow WebGL Canvas；星点在同一个 shader 中以三层网格近似，未有参考站独立的 2D 星场、品牌 3D 星标和完整 Stellar edge/border owner。
- 当前主站 `src/components/FlowBackground.tsx` 通过 CSS wash/texture/landmark 加强主题差异，首帧、主题 profile version、reduced-motion、hidden/no-WebGL 已有稳定性修复，但这仍是行为近似，不是参考站的渲染结构。
- 当前主站 `src/components/HeroSplit.tsx`、`RightScrollCards.tsx` 和 `src/styles/animations.css` 已有标题弹性、carousel、指针视差和卡片交互，但与参考站的 GSAP/SplitText 时序和层级不一致。
- 工作树已有用户独立修改 `public/status/blog-semi-synthetic.json`，本任务不得暂存、覆盖、回滚或提交该文件。

## Requirements

### R0. Figma 设计基线与代码验收

- 继续使用已创建的 Figma 页面 `BIAU Port · Reference Motion Fidelity`，不污染 `Page 1` 或已有主题系统页面。
- 在该页面补充三主题的 desktop/mobile 静态关键帧、六种 light/dark 组合的 surface 对照、Flow/Starfield/Stellar Effects 图层映射、首屏/主题切换/标题/carousel 时间线和 reduced-motion/fallback 状态。
- Figma 作为视觉审阅和交接基线，不承担 shader、Canvas、RAF 或真实帧率验证；这些行为必须在代码和 UI/performance 检查中验收。
- 每一批代码实现前后，以 Figma 的 frame、token 和 timeline 标注对照截图/DOM 状态；如果运行时与静态稿冲突，以已确认的主站内容可达性和无障碍约束为准。

### R1. 三主题渲染结构对齐

- 暮港：暖冷纵深、清晰潮线/色带、低强度指针视差、铜金导航指示器和独立主题材质。
- 自然：紫雾到青水/鲜绿的大尺度慢速高噪柔焦流场、绿色玻璃表面、弱星场和更弱的弹性反馈。
- 星辰：深蓝靛紫高扭曲 Flow、独立多深度 2D 星场、温度/闪烁/视差、实体边缘光、约 7.6 秒周界巡航光流、深色玻璃面板和品牌星标光效。
- 主题切换必须原子提交完整 profile、surface、装饰和运行时层，不能先换色后补动效。

### R2. 首屏与交互时序对齐

- 对齐参考站的首屏 pre-paint 背景、logo/品牌星标入场、标题电影化入场、标题字符级弹性拖拽换句、纵向 carousel 的 wheel/drag/flick/inertia/tilt、卡片 reveal 和 scene transition。
- 允许使用参考站已验证的动画机制（如 GSAP/SplitText）或等效实现；不复制参考站品牌和内容。
- 所有动画都必须提供 reduced-motion、低性能、粗指针、hidden/resume、无 WebGL/Worker 的确定性降级。

### R3. 性能与资源边界

- 维持主站可观测的渲染 owner，禁止无主的常驻 RAF、重复 Canvas、未清理 listener/worker/timer。
- 设定 desktop/mobile、低功耗和 reduced-motion 预算；新增渲染层必须可暂停、可销毁并有 `data-*` 诊断状态。
- 不引入参考站的外部网络资源、私有调试面板、站点脚本原样拷贝或不必要的声音交互。

## Acceptance criteria

- [ ] 三主题在 desktop 1440、mobile 390 的静态关键帧和连续动效中，具备参考站对应的背景结构、材质、动效节奏和交互反馈，不再只是颜色切换。
- [ ] 暮港、自然、星辰分别可观察到独立的 Flow 参数、星场/装饰层和主题专属效果；星辰具备独立边缘光与周界流光。
- [ ] 首屏无闪烁，主题切换无半套状态；首次加载、scene transition、hidden/resume、reduced-motion、low-power、no-WebGL/Worker 均能稳定降级和清理。
- [ ] 标题、carousel、卡片 reveal 的时序和拖拽反馈与参考站行为等效；不破坏主站路由、内容、CTA、项目状态和助手。
- [ ] `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run performance:check`、`npm.cmd run check:ui:smoke`、`npm.cmd run check:ui` 通过，且 `git diff --check` 无错误。
- [ ] `public/status/blog-semi-synthetic.json` 保持用户原有修改，不进入本任务提交。

## Confirmed implementation decision

允许引入 GSAP/SplitText 级别的时间线机制，并把当前单 Flow Canvas 扩展为 Flow Canvas + 独立 2D 星场/主题效果 owner，以实现参考站级别的渲染结构和时序。实现只复用公开的动画机制和视觉语义，不原样复制参考站脚本；中文标题字符拆分优先使用项目内可审计的轻量 helper，避免引入无法确认许可的私有 SplitText 文件。

## Out of scope

- 不重做主站信息架构、内容文案、项目数据、后端或部署配置。
- 不复制参考站品牌 Logo、站名、第三方字体、私有运行时代码、音效和外部资源。
- 不把参考站的调试/管理工具直接嵌入主站。
