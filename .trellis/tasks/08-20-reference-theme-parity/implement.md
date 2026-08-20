# 执行计划

## Phase A · 参考站证据与基线

- [x] 读取参考站 HTML、`styles.css`、`home-runtime.js`、`tools-starfield.js`、`hero-accents.js`，记录三主题渲染层、运行时 owner、降级路径和关键时序。
- [x] 审计主站 `FlowRenderer`、`FlowBackground`、`appearance`、`HeroSplit`、`RightScrollCards` 和主题 CSS，记录当前差距。
- [x] 用户确认允许 GSAP/SplitText 级别的时间线机制、独立 2D 星场和主题效果 owner。
- [x] 更新 Figma `BIAU Port · Reference Motion Fidelity` 的 Implementation Notes：同步独立 2D 星场、GSAP/本地字符拆分、StellarEffects owner、降级契约和代码映射；不把 Figma 当作 shader/帧率实现工具。

## Phase B · 渲染基础设施

- [x] 扩展 typed scene visual profile 与 render budget，补充三主题独立参数和 version contract。
- [x] 引入 `gsap`，建立可清理的 timeline helper；实现本地中文字符拆分，保留可访问文本。
- [x] 新增 `StarfieldRenderer` / `StarfieldBackground`，实现 seed 星体、三层深度、温度、闪烁、指针/滚动视差、hidden/reduced/low-power cleanup。
- [x] 新增 `StellarEffects` owner，实现实体边缘光、7.6 秒周界流光和 scene-specific DOM layers。
- [x] 将新增 owner 挂载到现有 Layout/Home 结构，确认只有一个 Flow owner、一个 Starfield owner 和按需 Stellar owner。

## Phase C · 三主题效果对齐

- [x] Dusk：校准暖冷潮线、色带、铜金 indicator、低强度星点和 material layers。
- [x] Garden：校准高噪慢速柔焦流场、紫雾/青水/鲜绿过渡、绿色玻璃和弱弹性反馈。
- [x] Stellar：校准深蓝靛紫 Flow、多深度星场、温度/闪烁/视差、edge glow、border flow、品牌星标 highlight。
- [x] 确保 light/dark 六种组合都遵循同一 profile/version 原子提交。

## Phase D · 首页时序对齐

- [x] 对齐首屏 pre-paint fallback、logo/intro 入场和 home-only cinematic timeline。
- [x] 对齐标题字符级 exit/entry、directional stagger、overshoot/settle、拖拽和点击换句。
- [x] 对齐 carousel wheel/drag/flick/inertia/tilt/reveal，并为三主题保留不同 motion strength。
- [x] reduced-motion、SPA 返回、hidden/resume、移动端和低功耗路径回归。

## Phase E · 验证

- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] `npm.cmd run performance:check`
- [x] `npm.cmd run check:ui:smoke`
- [x] `npm.cmd run check:ui`
- [x] 对 1440/390、dusk/garden/stellar、light/dark、reduced-motion、no-WebGL/no-Worker 做截图/像素和 DOM version 检查。
- [x] `git diff --check`，确认 `public/status/blog-semi-synthetic.json` 未进入暂存区。

## 关键文件与风险点

- `src/background/FlowRenderer.ts`、`src/background/flowPalettes.ts`：shader/profile 与首帧接管，最高风险。
- `src/components/FlowBackground.tsx`、新增 `StarfieldBackground.tsx` / `StellarEffects.tsx`：多 owner 生命周期、Canvas 和 RAF 清理。
- `src/components/HeroSplit.tsx`、`src/components/RightScrollCards.tsx`：时间线与手势行为回归风险。
- `src/styles/appearance-themes.css`、`src/styles/flow-pages.css`、`src/styles/hero-split.css`：主题材质与 CSS fallback/parity。
- `package.json` / `package-lock.json`：GSAP 依赖与 bundle 体积。
- `scripts/check-ui.mjs`：新增主题层、Canvas 非空、profile version、边缘光和周界流光检查。

## 回滚点

1. Starfield/效果 owner 独立回滚点。
2. Hero/Carousel 时间线独立回滚点。
3. profile 参数只回退对应 scene，不回滚用户 status JSON。
