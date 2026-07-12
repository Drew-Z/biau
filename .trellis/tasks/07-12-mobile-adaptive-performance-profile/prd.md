# Mobile Adaptive Performance Profile

## Goal

为移动端和受限设备提供自动性能分级，在保留 BIAU 品牌入场与核心交互的前提下，停止高成本的持续背景渲染。

## Requirements

- 提供 `balanced` 与 `static` 两档自动模式。
- `prefers-reduced-motion`、Save-Data、2G 网络直接进入 `static`。
- 手机设备仅在低内存与低 CPU 同时成立时进入 `static`；浏览器缺少信号时保持 `balanced`。
- 首次 React 渲染前写入根节点 `data-performance`，避免首屏模式闪烁。
- 运行时响应 reduced-motion 与网络连接状态变化。
- `static` 只停止持续背景动画并降低合成成本，不移除内容、导航、首页文字切换、阅读目录与一次性 Logo 入场。
- 不持久化模式，不向用户展示硬件诊断信息。

## Acceptance Criteria

- 普通或未知设备使用 `balanced`。
- reduced-motion、Save-Data、2G、低配手机组合使用 `static`。
- `static` 下背景、field/ribbon/environment 持续动画停止，grain 隐藏，玻璃模糊降低。
- 320px、390px、430px 页面无横向溢出，底部导航及公开助手位置不回归。
- lint、build 与 UI 自动化检查通过。