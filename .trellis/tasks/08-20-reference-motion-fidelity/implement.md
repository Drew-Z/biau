# 执行计划

## Phase A · 设计基线（Figma）

- [x] 读取现有 Figma 页面、顶层节点、变量、样式和当前选区；记录 `Page 1` 与 `BIAU Port · Theme System` 的可复用节点，不直接修改。
- [x] 新建 `BIAU Port · Reference Motion Fidelity` 页面与分区，建立 Overview 和三主题 desktop/mobile frame。
- [x] 为每个主题建立 idle/intro/transition/parallax/carousel/reduced/fallback 状态和时间线标注；支持的轨道写入 Figma Motion API。
- [x] 逐主题导出截图，检查文本、边界、层级和 motion frame 可读性，记录节点 ID 与实现映射。

## Phase B · 首帧与生命周期（代码）

- [x] 审计并修复 `FlowBackground` 首帧可见性、fallback/canvas 接管和 ready 状态，不改变公开 DOM 合同。
- [x] 统一主题切换的 profile/surface/装饰提交与清理；覆盖 hidden/resume、reduced-motion、low-power、coarse pointer、no-WebGL。
- [x] 添加可测 data 属性/事件版本，确保每次切换只有一套完整主题状态。

## Phase C · 三主题行为等效

- [x] Dusk：校准 Flow 色场/潮线、暖冷纵深、轻视差和铜金 indicator。
- [x] Garden：校准高噪慢速柔焦 Flow、绿色玻璃、弱星场和 spring 策略。
- [x] Stellar：实现多深度星场、温度/闪烁/视差、masked edge glow、7.6s panel border flow 与深色玻璃层。
- [x] 对齐标题 cinema/elastic drag、纵向 carousel 的 wheel/drag/flick/inertia/tilt 和 card reveal 节奏；不复制 GSAP/Three.js。

## Phase D · 验证与交接

- [x] 运行 `npm.cmd run lint`、`npm.cmd run build`。
- [x] 运行既有 performance、UI smoke、完整 `check:ui`；补充 desktop 1440、mobile 390、reduced-motion、no-WebGL 截图/像素检查。
- [x] 验证 `public/status/blog-semi-synthetic.json` 未被触碰，检查无第二 Canvas、无新动画框架；Figma QA PNG 为临时产物，提交前不纳入版本控制。
- [x] 记录必要的 spec 更新、回滚点和实现映射，准备提交前审阅。

## 关键文件与风险点

- `src/components/FlowBackground.tsx`：ready/fallback/主题切换生命周期，最高风险。
- `src/background/FlowRenderer.ts`、`src/background/flow.worker.ts`、`src/background/flowPalettes.ts`：profile、首帧和降级路径。
- `src/components/HarborIntro.tsx`、`src/components/RightScrollCards.tsx`、`src/components/Navigation.tsx`：标题、carousel、导航交互。
- `src/styles/animations.css`、`src/styles/hero-split.css`、`src/styles/appearance-themes.css`、`src/styles/flow-pages.css`、`src/styles/navigation.css`：透明度、材质、主题专属动效。

## 回滚点

1. Figma 页面独立，删除/隐藏新页即可回退设计稿。
2. 首帧生命周期提交单独 commit，主题行为提交单独 commit，交互节奏提交单独 commit。
3. 每个阶段通过检查后再进入下一阶段，失败时只回退当前阶段。
