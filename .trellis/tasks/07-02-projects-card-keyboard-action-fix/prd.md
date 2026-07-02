# 项目集卡片键盘外链行为修复

## Goal

修复 `/projects` 项目卡片内部控件的键盘事件边界和可访问名称，确保卡片主体与可见详情按钮都能进入详情页，隐藏外链标签不会在未来样式打开时误触发卡片详情跳转。

## Requirements

- 保持现有项目集页面视觉、筛选、卡片点击和详情跳转体验。
- 卡片主体点击或按 `Enter` / `Space` 时继续进入项目详情页。
- “查看详情”按钮继续进入项目详情页，补充可访问名称，并且键盘事件不依赖外层卡片冒泡。
- 外部链接标签当前在 `/projects` 页面样式中隐藏；代码层仍保留点击和键盘冒泡边界，避免未来显示后误触发卡片详情跳转。
- 使用现有 React、Semi 图标和 class-based CSS，不引入新依赖。
- 不改项目内容事实、不改外链目标、不触碰部署或模型配置。

## Acceptance Criteria

- [x] `src/components/ProjectCard.tsx` 的卡片主体键盘处理只响应卡片自身焦点。
- [x] 内部“查看详情”按钮有可访问名称，并阻断键盘事件冒泡到卡片主体。
- [x] 外链标签保留点击和键盘事件冒泡边界；当前隐藏样式下不新增不可见键盘目标。
- [x] `/projects` 页面仍可通过键盘 `Enter` 打开项目详情。
- [x] UI 回归检查覆盖项目集卡片主体和内部详情按钮的键盘详情跳转。
- [x] 运行 `npm.cmd run lint`、`npm.cmd run build` 和 `npm.cmd run check:ui`。

## Notes

- 这是父任务的低风险访客体验小步，偏可访问性和导航一致性。
- 巡检发现 `/projects` 中 `.project-links` 当前被页面样式隐藏，外链标签不是当前可键盘聚焦的 UI；本轮不改变视觉密度，只保留代码层冒泡边界。
- 验证记录：
  - `npm.cmd run lint`：通过。
  - `npm.cmd run build`：通过；仅有现有 dynamic import chunk 提示。
  - `npm.cmd run check:ui`：通过。
  - `git diff --check`：通过；仅有工作区 LF/CRLF 转换提示。
  - 敏感信息扫描：仅命中 UI 检查脚本本地地址 `127.0.0.1:5174`，无真实敏感值。
