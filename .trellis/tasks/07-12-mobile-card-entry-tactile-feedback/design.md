# Design

## Interaction Contract

沿用 `ProjectCard` 与 `ColoredCard` 的 `role="link" + tabIndex + Enter/Space` 交互模式，为 `BlogCard` 补齐同一契约。嵌套按钮必须 `stopPropagation`，避免整卡与按钮双重触发。

## Touch Feedback

在 `@media (hover: none) and (pointer: coarse)` 中统一设置：

- `touch-action: pan-y`
- 约 80ms 的 transform / border / shadow transition
- `:active` 使用轻微 `scale(.985)`，不做位移和强烈发光

reduced-motion 下移除 transform transition 和缩放。

## Non-goals

- 不修改首屏信息密度；对照截图证明主站已更紧凑。
- 不引入震动 API、横向 swipe 或全局点击处理器。
- 不把状态数据卡等非导航表面伪装成链接。