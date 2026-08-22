# 技术设计：单主题 Stellar 视觉架构

## 1. 架构目标

将视觉系统从“场景 × 外观 × 多个装饰 owner”收敛为：

```text
index.html prepaint
        |
        v
StellarBackgroundProfile (唯一全局背景 profile)
        |
   +----+----------------+
   |                     |
FlowBackground       StarfieldBackground
   |                     |
   +----------+----------+
              v
       内容与可读性表面
              |
      Navigation / Hero / Panels
              |
       StellarEffects（仅局部 edge/perimeter）
```

Flow 负责全屏流体渐变和动画，Starfield 负责全屏星点；两者共享同一 Stellar profile 与性能状态。内容组件只能提供局部表面和交互反馈，不再绘制全局背景纹理。

## 2. 状态与数据流

- `src/utils/appearance.ts` 保留 `ThemeMode = light | dark | auto`，但移除可变 `HarborScene` 作为用户状态；`STELLAR_SCENE` 为内部常量。
- `src/hooks/useTheme.ts` 继续同步 `html.light-theme` 与 `data-color-mode`，只影响可读性 token。
- `src/hooks/useHarborScene.ts`、`getNextHarborScene`、场景存储键和场景循环入口停止参与渲染；兼容旧 localStorage 时直接忽略其值，不覆盖用户其他存储。
- `index.html` 在 CSS 之前只写入固定 Stellar prepaint gradient，避免首帧闪屏；不得按 `light-theme` 生成另一套背景渐变。
- `FlowBackground` 与 `StarfieldBackground` 从固定 profile 读取参数，并观察 `data-color-mode` 只用于内容表面同步，不重建背景构图。
- `StellarEffects` 保留 pointer edge glow、品牌高光和 carousel perimeter，但目标集合限定为 header、home hero、hero panel 与实际 carousel panel；路由页面不得挂载全屏装饰层。

## 3. 文件边界

### 保留并重写

- `src/components/FlowBackground.tsx`
- `src/background/FlowRenderer.ts`
- `src/background/flowPalettes.ts`
- `src/components/StarfieldBackground.tsx`
- `src/background/StarfieldRenderer.ts`
- `src/components/StellarEffects.tsx`
- `src/components/RightScrollCards.tsx`
- `src/components/Navigation.tsx`
- `src/App.tsx`
- `src/styles/appearance-themes.css`
- `src/styles/flow-pages.css`
- `src/styles/hero-split.css`
- `index.html`

### 删除或失效化

- `harbor-scene-foundation__wash`
- `harbor-scene-foundation__texture`
- `harbor-scene-foundation__landmark`
- `--home-scene-atmosphere*`
- `--home-scene-detail*`
- `--harbor-foundation-*`
- Dusk/Garden profile、场景 metadata、场景切换按钮和场景 ARIA 提示
- 页面级全屏 `::before` / `::after` 中用于线条、网格、点阵或装饰渐变的规则

### 兼容保留

- `useTheme` 与主题按钮的交互协议
- 既有路由、导航文案、项目数据、CTA、页脚和无障碍结构
- Flow WebGL/Worker、CSS fallback、reduced-motion、visibility 与低功耗清理机制
- carousel 的拖拽、滚轮、惯性、键盘与移动端静态行为

## 4. CSS 与视觉规则

- Stellar 背景基准为 `linear-gradient(122deg, #59575c 0%, #2b315f 30%, #354b7b 47%, #092243 70%, #052433 100%)`；Flow canvas 负责材质化，不再在页面伪元素上叠加同类渐变。
- 全局星点只允许存在于 `StarfieldBackground`；Flow profile 的 `starIntensity` 固定为 0，避免双重星点。
- 参考站确有的边缘光使用 `148px` radial layer 与 `clamp(min(width,height)*.14,52px,96px)`；不为普通卡片批量启用。
- perimeter flow 只作用于首页 carousel/hero panel，周期约 `7600ms`；静态、reduced-motion、移动端和低功耗下冻结或隐藏。
- light/dark 只切换文字颜色、面板透明度、边框对比度、控件焦点和阴影，不切换背景 stop、星点密度或流体方向。

## 5. 性能与回滚

- 复用现有 `visualPerformance` 信号；背景 owner 使用统一的 static/balanced/full 预算，所有 RAF、Worker、Canvas、observer、timer 必须在卸载与状态变化时清理。
- WebGL 不可用时使用同一 Stellar CSS fallback，不允许 fallback 退回 Dusk/Garden 或静态网格。
- 回滚点按层次设置：先恢复组件挂载，再恢复 profile/token，最后恢复旧场景存储读取；不得恢复会覆盖用户 status JSON 的操作。
- 若视觉检查发现内容对比度不足，只调整表面 token 和文本层，不重新引入第二套背景。

## 6. 不采用的方案

- 不继续维护三主题的兼容视觉分支。
- 不把参考站压缩脚本、私有字体、Logo、音效或外部资源直接移植到 React。
- 不用更多伪元素“补齐”参考站效果；所有新增效果必须有明确 owner、目标元素和降级策略。
