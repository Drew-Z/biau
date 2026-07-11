# Design: Multi-theme Luminous Motion System

## Layer Model

从后向前保留五级视觉层：

1. `.gradient-bg`：主题基础色场与慢速 background-position 变化。
2. `.app::before`：大范围 fluid field，负责可见的移动主光团。
3. `.app::after`：更宽、更慢的 ribbon field，负责背景流向。
4. `.harbor-environment`：edge trace、beam、spectrum、mist，负责局部高光与主题特征。
5. 内容面板：继续使用现有半透明表面和边框，不新增装饰 DOM。

## Theme Contract

- `dusk`：玫瑰暖光、日光黄、海雾青蓝；深色版本降低暖色面积但保留港湾灯光。
- `garden`：苔绿、青绿、雾白和少量淡紫；混合模式更偏 `soft-light / screen`。
- `stellar`：钴蓝、深海蓝、青色窄光、淡紫和暖金边缘；深色版本强度最高。

场景差异通过 CSS variables 和主题选择器表达，不在 React 中增加动画状态。

## Performance

- 桌面使用完整五层 CSS motion。
- `max-width: 768px` 下缩小 pseudo inset/blur，并降低 spectrum/mist 强度；仍保留主光与 beam。
- `prefers-reduced-motion: reduce` 继续统一关闭 animation。
- 不新增网络资源、JavaScript animation loop 或组件依赖。

## Regression Contract

`scripts/check-ui.mjs` 将读取：

- app `::before / ::after` 的 display、opacity、animationName；
- environment 与三个 span 的 display、opacity、animationName；
- gradient base、mist 和 edge animation；
- 六种主题组合的关键 token signature；
- reduced-motion 下所有上述 animationName 是否为 `none`。

视觉验证额外在固定截图区域比较两个时间点的像素差，证明光场实际移动而不只是声明了 animation。

## Rollback Boundary

- 如移动端性能或可读性下降，优先降低移动端 opacity、blur 和 layer size，不再次全局关闭光效层。
- 如单个场景过亮，只调整该场景 token，不回退其他主题。
