# 技术设计：恢复双轴主题并保留 Stellar 生命周期修复

## 架构边界

恢复主题状态层和三主题 profile，不回滚整批单主题提交。`useTheme` 继续负责 resolved color mode；`useHarborScene` 负责 scene 状态、持久化和原子 root dataset 更新。Flow、Starfield、StellarEffects 从 root scene 读取完整 profile，页面 surface 通过 `[data-harbor-scene]` 与 `light-theme` token 组合呈现。

```text
index.html prepaint
   |-- data-color-mode + light-theme
   |-- data-harbor-scene
             |
       App / Navigation
             |
   FlowBackground + StarfieldBackground + StellarEffects
             |
      scene-aware surface tokens
```

## 状态与时序

- `index.html` 同步读取 `theme` 和 `biau-port-harbor-scene`，无效值回退到 `auto` / `dusk`。
- `useHarborScene` 使用 `useLayoutEffect` 与 `flushSync`，先提交 root scene，再提交 React state；可用 View Transition 时包裹同一 commit。
- Flow 与 Starfield 保留现有 `MutationObserver`，scene class/dataset 变化通过既有 `sync()` 重新发送 profile，不重建 owner。
- `HarborIntro` 仅在首页出现；intro class 变化继续由 Flow/Starfield observer 驱动暂停与恢复。

## Profile 合约

- 恢复 `dusk/garden/stellar` 独立的 palette、dynamics、effects、starfield、stellarEffects、renderBudget。
- Stellar 继续使用已验证的六色、318°、noise/field/mist 参数与多深度星场；Dusk/Garden 使用历史参考 profile 的较弱星场和不同流体材质。
- `getFlowProfile(scene, light, portrait)` 保持现有调用签名，light 只选择内容可读性相关 profile 分支；场景差异不能被 light 覆盖。

## UI 与验证

- Navigation 恢复场景按钮，使用当前 scene metadata、`aria-label`、`title` 与 Lucide 图标，Logo 仍是首页链接而非场景控制。
- `check-ui.mjs` 增加三主题循环、点击/持久化/刷新断言，并保留 Stellar intro-resume、reduced-motion、fallback 和 canvas 帧差检查。
- `check-production-appearance.mjs` 扩展到 6 个 scene/appearance 组合，scene-specific profile 与 Stellar-only effects 分开断言。

## 兼容、性能与回滚

- 所有 Canvas、Worker、RAF、observer、timer 继续由原 owner 清理；切换 scene 不允许并行 renderer。
- light/dark/auto 只改变表面 token；不再用 light scene 规则覆盖全屏背景。
- 若某个历史 profile 与当前 CSS 合约冲突，优先以当前 Flow/Starfield 生命周期和无障碍检查为准，局部调整 token，不恢复固定全屏装饰。
- 回滚粒度为 appearance state、scene hook、profile、Navigation/检查脚本和 scene token；不回滚 `b094be55` 的 intro 恢复修复，不触碰 status JSON。
