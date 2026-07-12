# Design

## Runtime Contract

新增纯函数 `resolvePerformanceProfile(signals)`，统一管理判定；运行时读取标准与可选浏览器信号，不污染全局 DOM 类型。

`applyInitialPerformanceProfile()` 在 `main.tsx` 渲染前设置根节点 `data-performance="balanced|static"`。

App 生命周期内由 hook 订阅 `matchMedia('(prefers-reduced-motion: reduce)')` 与 `navigator.connection.change`，信号变化后更新同一属性。

## Decision Rules

- reduced motion、Save-Data、`slow-2g` / `2g`：`static`
- mobile-like 且 `deviceMemory <= 4` 且 `hardwareConcurrency <= 4`：`static`
- 其他情况，包括信号未知：`balanced`

## Visual Boundary

CSS 以 `:root[data-performance='static']` 为唯一入口。固定静态背景位置，停止 page pseudo-elements、gradient、carousel ambient layers 和 harbor environment 的持续动画；隐藏 grain，降低 backdrop blur。Logo intro 不引用此属性，因此低配设备仍保留一次性品牌动画；reduced-motion 继续由现有组件逻辑跳过入场。

## Rollback

移除根节点属性初始化、订阅 hook 与 static CSS 块即可恢复原行为，不涉及持久化数据或后端契约。