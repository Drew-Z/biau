# Design

## State Model

`DetailReadingGuide` 增加 `isAutoHidden`。现有 requestAnimationFrame 测量循环同时读取滚动方向，避免新增第二套 scroll listener。

规则：

- `scrollY <= 120`：显示。
- `delta >= 10` 且目录关闭：隐藏。
- `delta <= -10`：显示。
- 目录打开：强制显示。

窗口宽度大于 720px 时清除自动隐藏。使用 React 状态仅在方向跨阈值时切换，不在每个 scroll frame 强制重渲染。

## Presentation

CSS 只移动 `.detail-reading-guide__shell`，保留 sticky 根节点和阅读进度数据。隐藏态设置 opacity 与 pointer-events，向上滚动时用短过渡恢复；focus-within 强制显示。

## Tradeoff

参考站使用底部目录抽屉，但主站已有固定底栏与助手。顶部方向感知比叠加第三个底部表面更健壮，并保留当前已验证的目录几何与锚点逻辑。