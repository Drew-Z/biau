# 实施计划：首页单主题视觉架构重构

## 1. 准备与基线

- [x] 记录当前 `git status`，确认只忽略用户已有的 `public/status/blog-semi-synthetic.json` 修改。
- [x] 运行 `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui:smoke` 建立基线。
- [x] 以 `audit.md` 和参考站资源为视觉验收依据，保留当前截图/检查命令，不改写旧审计结论。

## 2. 状态与入口收敛

- [x] 将 `src/utils/appearance.ts` 的背景状态固定为 Stellar，保留 `light/dark/auto` 作为可读性模式。
- [x] 重写 `src/hooks/useHarborScene.ts` 或移除其渲染依赖，确保旧场景 localStorage 不再改变背景。
- [x] 修改 `src/components/Navigation.tsx` 与 `src/components/Layout.tsx`，移除场景切换、场景名称和场景 ARIA 提示；Logo 仍保持可访问首页入口。
- [x] 修改 `src/App.tsx`，让所有背景 owner 接收固定 profile，不重复挂载全局背景。
- [x] 修改 `index.html`，只保留固定 Stellar prepaint，不按外观模式生成另一种背景构图。

## 3. 背景 owner 重构

- [x] 在 `src/background/flowPalettes.ts` 建立单一 `stellar` profile，删除 Dusk/Garden 与 scene-specific token 分支。
- [x] 在 `FlowBackground.tsx` 和 `FlowRenderer.ts` 中删除 foundation wash/texture/landmark DOM 和 pointer 偏移逻辑，只保留 Flow canvas、统一 profile、fallback 和生命周期清理。
- [x] 在 `StarfieldBackground.tsx` / `StarfieldRenderer.ts` 中固定参考站密度、四层 depth、平方视差和双正弦 twinkle；确保静态/reduced 时可确定性冻结。
- [x] 调整 `visualPerformance` 接口，使 Flow、Starfield、carousel perimeter 读取相同预算与暂停信号。

## 4. 装饰层清理与局部效果

- [x] 从 `appearance-themes.css` 删除 foundation texture、landmark、全屏 pointer wash 和重复 Stellar overlay token。
- [x] 从 `flow-pages.css`、`hero-split.css`、`animations.css` 删除首页全屏固定线条、网格、静态点阵和与 Flow 重复的伪元素；保留内容必要的状态线和焦点样式。
- [x] 将 `StellarEffects.tsx` 限定为 header/home hero/hero panel 的 edge glow 与 carousel panel perimeter，统一 target 清理。
- [x] 在 `RightScrollCards.tsx` 保留真实圆角周界流光的 fallback 与 reduced/mobile/low-power 行为，确认不扩散到普通卡片。

## 5. 可读性与内容回归

- [x] 重新校准 light/dark surface token，使文字、面板、按钮和焦点环在固定 Stellar 背景上满足对比度。
- [x] 保持首页、项目、博客、状态、AI 日报和 studio 路由可访问；核对导航、CTA、键盘操作、移动 tabbar 与 reduced-motion。
- [x] 更新 `scripts/check-ui.mjs`，检查单一 Stellar profile、无场景切换入口、背景 owner 数量和装饰层清理结果。

## 6. 验证与交付

- [x] 运行 `npm.cmd run lint`。
- [x] 运行 `npm.cmd run build`。
- [x] 运行 `npm.cmd run check:ui:smoke` 和完整 `npm.cmd run check:ui`（完整检查的路由、Flow 专项、移动端与专项交互均通过；状态页导航异步组曾出现时序波动，已单独复测通过）。
- [x] 运行 `npm.cmd run performance:check` 与 `git diff --check`。
- [x] 在 1440x1000、390x900 下检查固定 Stellar 背景、星场密度、内容层级、边缘光和面板周界。
- [x] 对照参考运行时 profile 值，在至少三个正常动画相位复核宽幅流体带、中央过渡、星点和局部 edge/perimeter 细节；不能只用单帧均值判断。
- [x] 检查 reduced-motion、隐藏/恢复、低功耗、no-WebGL/CSS fallback、刷新和旧场景 localStorage 兼容。
- [x] 复核工作树，确保不暂存或提交 `public/status/blog-semi-synthetic.json`。

## 风险文件与回滚点

- 高风险：`index.html`、`src/utils/appearance.ts`、`src/hooks/useHarborScene.ts`、`src/App.tsx`；风险是首帧闪烁、状态不同步或导航回归。
- 高风险：`src/styles/appearance-themes.css`、`src/styles/flow-pages.css`、`src/styles/hero-split.css`；风险是误删内容表面、焦点环或移动端布局。
- 中风险：`FlowBackground.tsx`、`StarfieldBackground.tsx`、`StellarEffects.tsx`、`RightScrollCards.tsx`；风险是 RAF/Canvas 清理、降级和交互回归。
- 回滚顺序：先恢复组件挂载和 profile 合约，再恢复样式 token，最后恢复局部特效；不回滚用户独立 status JSON 修改。

## 启动前检查

- [ ] PRD 已通过收敛检查，未保留已解决的 open question。
- [ ] `design.md` 与本清单中的文件边界一致。
- [ ] 用户已确认保留 light/dark/auto 但固定 Stellar 背景的决策。
- [ ] 规划审阅通过后，再执行 `python ./.trellis/scripts/task.py start .trellis/tasks/08-21-single-theme-visual-refactor`。
