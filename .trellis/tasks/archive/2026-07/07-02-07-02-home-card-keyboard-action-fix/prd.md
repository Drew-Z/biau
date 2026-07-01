# 首页项目卡键盘外链行为修复

## Goal

修复首页右侧 IN PORT 项目卡片中外链按钮的键盘激活行为，确保卡片主体进入项目详情页，按钮本身打开外部项目链接，鼠标和键盘交互保持一致。

## Requirements

- 保持现有首页视觉、滚动、拖拽和卡片点击体验。
- 卡片主体点击或按 `Enter` / `Space` 时继续进入 `project.detailLink`。
- 外链按钮点击或通过键盘激活时只执行 `project.externalLink` 行为，不触发卡片详情跳转。
- 没有 `externalLink` 的项目不显示外链按钮，行为保持不变。
- 使用现有 React/Semi 图标和 class-based CSS，不引入新依赖。
- 不改项目内容事实、不改外链目标、不触碰部署或模型配置。

## Acceptance Criteria

- [x] `src/components/ColoredCard.tsx` 的键盘事件不会从外链按钮误触发卡片详情跳转。
- [x] 卡片主体仍支持鼠标点击、`Enter` 和 `Space` 进入详情页。
- [x] 外链按钮仍支持鼠标点击和键盘激活，并保持 `event.stopPropagation()` 边界。
- [x] 运行 `npm.cmd run lint`、`npm.cmd run build` 和 `npm.cmd run check:ui`。

## Notes

- 这是父任务的低风险访客体验小步，偏可访问性和导航一致性。
- 新增 UI 回归检查覆盖首页 Legal RAG 外链按钮的键盘激活：记录 `window.open`，确认当前页面仍停留在 `/`，并确认外链 URL 被请求打开。
- 验证记录：
  - `npm.cmd run lint`：通过。
  - `npm.cmd run build`：通过；仅有现有 dynamic import chunk 提示。
  - `npm.cmd run check:ui`：通过。
  - `git diff --check`：通过；仅有工作区 LF/CRLF 转换提示。
  - 敏感信息扫描：无命中。
