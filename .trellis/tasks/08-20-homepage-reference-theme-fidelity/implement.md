# Implementation Plan

## Phase A: Baseline And Contracts

- [x] 记录当前六组合的 computed style、Canvas 数量、Flow dynamics 和桌面/移动截图基线。
- [x] 搜索并列出 `appearance-themes.css`、`hero-split.css`、`flow-pages.css` 中互相覆盖的 page/panel/card/action 规则。
- [x] 固定六组合 surface token 命名和静态检查所需的 data attributes，不修改原有七值 `data-flow-dynamics`。

## Phase B: Surface Rebuild

- [x] 重做六组合 page/horizon/texture、nav、hero、panel、card、action 和 footer surface token。
- [x] 让 Garden 走清亮有机材质，Dusk 走暖光谱纸/玻璃材质，Stellar 走深空玻璃与青蓝光材质。
- [x] 收敛项目卡强调色和按钮层级，保证内容先于色块和纹理。

## Phase C: Scene Motion Calibration

- [x] 只在现有 Flow profile、三层 CSS foundation 和项目板指针光上校准动态；删除/减弱会造成浑浊的重复叠层。
- [x] 保留 Stellar 星场/周界光的单 Canvas 和无持续 React 帧更新契约。
- [x] 验证 intro、hidden、reduced-motion、低功耗和 Save-Data 下的暂停行为。

## Phase D: Browser Verification

- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] `npm.cmd run performance:check`
- [x] `npm.cmd run check:ui:smoke`（使用隔离当前预览和 `UI_CHECK_BASE`）
- [x] `npm.cmd run check:ui`
- [x] `git diff --check`
- [x] 对照三张用户截图和本地参考源码检查主题层级、文字可读性、面板透明度、卡片统一性和 Hero/项目板比例。

## Phase E: Finish

- [x] 只暂存本轮源码、规范和任务工件，不暂存 `public/status/blog-semi-synthetic.json`。
- [ ] 提交并推送 `main`，归档任务并记录会话。

## Risky Files

- `src/styles/appearance-themes.css`
- `src/styles/hero-split.css`
- `src/styles/flow-pages.css`
- `src/background/flowPalettes.ts`
- `src/components/FlowBackground.tsx`
- `src/components/RightScrollCards.tsx`

## Rollback Points

- 完成 Surface Rebuild 后先跑构建与 smoke，再进入 Motion Calibration。
- 如果主题材质导致 UI matrix 回归，只回退本轮样式/token 区块，保留已验证的单 Canvas 与 reducer/CTA 代码。
