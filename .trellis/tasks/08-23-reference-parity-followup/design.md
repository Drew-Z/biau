# 技术设计：参考站视觉细节续审

## 边界

本任务只修复固定 Stellar 构图的 CSS 覆盖和首屏 intro 生命周期同步，不创建新的背景主题系统。Flow、Starfield、StellarEffects 仍是现有全局 owner；外观模式继续由 `useTheme` 管理，但只负责内容表面。

## 设计决策

### 1. 背景层级

- 删除 `src/styles/hero-split.css` 中 `.light-theme body, .light-theme .app` 的暖色渐变。
- 由 `index.html` prepaint、Flow CSS fallback 和现有 canvas owner 共同保持 Stellar 构图；内容 surface 使用现有 `flow-pages.css` / `appearance-themes.css` token。
- 不把 `background` 改到 `.app` 的新局部规则中，避免再次形成第二个全屏 owner。

### 2. 生命周期同步

- 在 `FlowBackground` 和 `StarfieldBackground` 各自的 effect 中观察 `document.documentElement` 的 `class` 属性，class 变化时调用现有 `sync()`。
- 只观察与运行时有关的根 class 变化；sync 内保留现有 token/状态判断，避免重新创建 renderer。
- Flow worker 路径沿用 motion token；Starfield 复用现有 `cancelAnimationFrame` 与确定性 draw。
- cleanup 时断开 MutationObserver，确保路由卸载和 HMR 不泄漏。

### 3. 审计与诊断

- 增加一个针对 intro 后恢复的 UI 断言：首次上下文不预置 intro storage，等待 `harbor-intro-active` 消失后检查 Flow/Starfield 状态和可见 opacity。
- 继续保留已通过的固定 Stellar、reduced-motion 和生产 appearance 检查。
- 截图审计使用相同视口在 intro 后至少采集 `t0`、`t0+800ms`、`t0+1600ms`，同时读取 `data-flow-motion`、`data-starfield-state`、canvas 非空像素和 DOM 几何。

## 兼容与回滚

- 回滚点为两处 CSS 删除和两个 observer 增量；不触碰用户 status JSON。
- 如果 MutationObserver 在某浏览器不提供 class 变化，现有 visibility/resize/reduced-motion 监听仍作为 fallback，且不会阻塞内容显示。
