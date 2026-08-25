# 参考站视觉细节续审与首屏运行时修复

## Goal

在保留主站信息、路由、品牌和 light/dark/auto 可读性模式的前提下，修复参考站审计后仍会导致首屏细节缺失的两个运行时差距：浅色外观覆盖固定 Stellar 背景，以及 HarborIntro 结束后 Flow/Starfield 没有恢复动画。目标是让首次加载、刷新和无 intro 加载都稳定呈现与参考站同类的流体、星场和深色 Stellar 构图。

## Confirmed Evidence

- 当前完整 `npm.cmd run check:ui` 在本地服务运行时为 40/40 通过，说明没有可直接复现的业务路由回归。
- 新浏览器上下文默认 `theme=auto` 且系统解析为 `light` 时，`body` 与 `.app` 的 computed `background-image` 仍为 `linear-gradient(rgb(219, 228, 229), rgb(191, 208, 211))`，来源是 `src/styles/hero-split.css:44-48`。
- 同一上下文等待 intro 结束后，`html` 已移除 `harbor-intro-active`，但 `.flow-background` 与 `.starfield-background` 仍分别为 `data-flow-motion="paused"` / `data-starfield-state="paused"` 且 opacity 为 `0`；两个组件没有监听 html class 变化。
- 注入 `theme=dark` 和已看过 intro 的上下文后，Flow/Starfield 能达到 `running` 并显示，证明 renderer 本身可用，问题在背景 owner 的首屏接管与生命周期同步。
- 用户提供的参考截图显示深色 Stellar 构图包含连续低对比度流体带、星点、局部边缘光和面板周界；单帧截图可漏掉动画相位，故验收必须同时读取运行时状态并采集多个相位。

## Requirements

### R1. 固定 Stellar 背景不受外观模式改写

- `light`、`dark`、`auto` 只能调整文字、面板、控件和焦点可读性，不得把 `body` 或 `.app` 改成另一套浅色页面背景。
- CSS fallback、首帧 prepaint、Flow canvas 和 Starfield canvas 必须继续使用同一 Stellar 构图。
- 删除或失效化任何与 `light-theme body/.app` 相关的旧背景覆盖；不得改变用户已有 `public/status/blog-semi-synthetic.json`。

### R2. Intro 结束后背景 owner 必须恢复

- Flow 和 Starfield 必须响应 `html.harbor-intro-active` 的新增与移除，且不重复创建 renderer、worker 或 RAF。
- intro 结束后，正常模式最终状态应为 Flow `running`、Starfield `running`；reduced-motion、hidden、low-power 和 no-WebGL/no-Worker 继续进入既有静态或 fallback 状态。
- 再次进入 intro 或路由卸载时必须暂停并清理，不能出现 late acknowledgement 覆盖新状态。

### R3. 证据化审计

- 记录参考站与主站的差距、文件/行号证据、修复决策和验证结果。
- 视觉验收至少覆盖 1440x1000、390x900、430x900，且包含 intro 后稳定帧和至少两个正常动画相位；不能只比较单帧平均 RGB。

### R4. 兼容性与质量

- 保留主站品牌、主要信息、导航、路由、CTA、无障碍和 reduced-motion 行为。
- 不复制参考站私有品牌、字体、脚本、音效或外部资源；不引入第二套 UI 框架。
- `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run performance:check`、`npm.cmd run check:ui:smoke` 和 `npm.cmd run check:ui` 必须通过。

## Acceptance Criteria

- [x] 三种外观模式在首页使用同一 Stellar 背景；computed `body/.app` 背景不再是浅色旧渐变。
- [x] 首次加载且 intro 播放后，Flow 与 Starfield 均恢复为可见运行状态；刷新并跳过 intro 仍通过。
- [x] 1440x1000、390x900、430x900 的多相位截图可见流体和星场，且无横向溢出、内容遮挡或固定线条/点阵残留。
- [x] reduced-motion、hidden/resume、low-power、no-WebGL/no-Worker 及导航/路由回归检查通过。
- [x] 所有质量命令通过，且用户已有 `public/status/blog-semi-synthetic.json` 保持未提交、未改写。

## Out of Scope

- 不改变主站信息架构、项目/博客/状态数据、路由或后端。
- 不重新设计已经完成的 Stellar Flow、Starfield、edge glow 或 carousel 参数；只有当本轮生命周期修复需要时才补充诊断断言。
