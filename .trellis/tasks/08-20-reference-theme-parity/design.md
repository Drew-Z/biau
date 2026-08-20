# 技术设计

## 1. 总体边界

保持 BIAU Port 现有 React/Vite 路由、内容和品牌组件不变，只替换首页的环境渲染、主题效果和首屏动效 owner。参考站的代码仅作为行为证据，不作为可运行依赖或源码拷贝来源。

Figma 页面 `BIAU Port · Reference Motion Fidelity` 是设计验收基线：它描述静态层级、主题 token、关键帧、时间线和降级状态；WebGL/Canvas/GSAP 的实时行为仍以代码实现和浏览器检查为准。

```text
typed appearance state
  -> atomic scene profile
  -> Flow WebGL renderer
  -> 2D starfield renderer (stellar-first, reduced on other scenes)
  -> DOM theme effects (wash, grain, edge glow, border flow)
  -> home cinema / carousel interaction owners
```

## 2. 渲染层

### Flow

- 扩展现有 `FlowSceneProfile`，让每个 scene 明确声明 palette、field、ribbon、noise、contrast、brightness、saturation、speed、render budget 和 fallback profile。
- `FlowRenderer` 继续负责单个 WebGL2 Flow Canvas；Worker、main-thread、CSS fallback 的生命周期保持一个 owner。
- 主题切换时先计算完整 profile，再同步 root data/version、CSS tokens 和 renderer profile，避免半套主题。

### Starfield

- 新增 `StarfieldRenderer`（Canvas 2D）和 `StarfieldBackground` 组件，参考站的 `tools-starfield.js` 只作为行为参考。
- 星体使用确定性 seed 生成三层深度，带有大小、温度、亮度、闪烁和指针/滚动视差；dusk 仅保留极弱星点，garden 降低数量与对比度，stellar 启用完整多深度星场。
- `requestAnimationFrame` 只在页面可见、运动允许且存在未完成活动时运行；hidden、低功耗、reduced-motion、粗指针和卸载都必须停止并清理。
- Canvas 具备 `data-starfield-state`、`data-starfield-scene`、`data-starfield-profile-version`，供 UI 检查确认非空和主题同步。

### Stellar 专属效果

- 用现有 DOM 层和 CSS mask/gradient 实现 header、hero、carousel panel 的指针实体边缘光与 7.6 秒周界流光。
- 新增一个集中式 `StellarEffects` owner，统一管理 pointer、resize、scene/version、reduced-motion、visibility 和 cleanup，禁止各组件分别创建 RAF。
- 品牌星标保留 `BiauPortMark` 的 SVG/语义结构；在 nav/intro 上增加可选的轻量 2D highlight/rotation layer，效果等价于参考站品牌 3D 星标的光照和飞行反馈，但不复制参考站 Logo。

## 3. 首页时序与交互

### Intro / cinema

- 新增 `useHeroCinema` 或等价的 home-only controller，使用 GSAP core timeline（或同等可审计时间线）驱动 eyebrow、status、title、body、panel 的分段入场。
- 中文标题字符拆分由本地 helper 生成可回收的 span，并保留原始可访问文本；拖拽/点击换句沿用现有 `HeroSplit` 状态，将字符级 exit/entry、directional stagger、overshoot 和 settle 参数对齐参考站。
- SPA 返回首页跳过完整 boot，但必须执行一次稳定的 content reveal；reduced-motion 直接设置终态。

### Carousel

- 保留现有 `RightScrollCards` 数据和可访问 DOM，重新校准 wheel、drag、flick、inertia、tilt、reveal 的时间常量和 scene-specific strength。
- pointer owner 只负责写 CSS variables；布局和内容仍由 React 控制，不把每帧位置放进 React state。

## 4. 原子主题契约

- `appearance.ts` 继续是 `HarborScene` 的唯一来源；新增 `SceneVisualProfile` 或从 `getFlowProfile` 派生的完整 scene profile，不在组件中重复 scene 字符串。
- `useHarborScene` 的提交顺序固定为：计算 profile -> `applyHarborScene` -> 写入 storage -> React flush -> renderer/effects 观察 version。
- `data-harbor-scene-version`、`data-flow-profile-version`、`data-starfield-profile-version` 必须在一次切换中单调递增并最终一致。

## 5. 降级和可访问性

- 首帧继续由 CSS fallback 立即可见，Flow/Starfield 的首个有效帧只负责接管，不允许 `opacity: 0 -> 1` 闪现。
- reduced-motion：保持静态但有层级的首帧，关闭 timeline、twinkle、parallax、border flow 和 inertia。
- low-power/saveData：禁用或降低 2D 星场和 Stellar effects，Flow 使用低帧或静态 fallback。
- no-WebGL/Worker：保留 CSS Flow foundation，Starfield 仍可单独运行；若 2D Canvas 不可用，保留 CSS 星点/材质层。
- 所有新增 listener、RAF、timer、canvas context、GSAP timeline 和 observer 都必须在 cleanup 中可追踪释放。

## 6. 依赖与兼容

- 可引入 `gsap` 作为 production dependency；不引入参考站的私有 `SplitText.min.js`、站点脚本、外部字体或音效。
- 通过本地字符拆分 helper 保持中文标题的可访问文本和 tree-shaking；不使用第二个 UI 框架。
- 维持现有 `data-*` 诊断属性和 smoke selectors，新增属性只用于可观测性。

## 7. 回滚策略

1. 先提交 Starfield/效果 owner 与 CSS fallback 的独立阶段。
2. 再提交 Hero/Carousel 时间线校准。
3. 任一主题的像素/性能检查下降时，只回退对应 profile 或 owner，不回滚用户的 `public/status/blog-semi-synthetic.json`。
