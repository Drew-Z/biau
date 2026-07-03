# Remove unused legacy home hero reference

## Goal

清理主站首页已经不用的旧版 Hero 参考实现，避免后续维护时误改死代码，也减少无效 CSS 进入构建。

## Requirements

- 基于当前代码引用关系执行，不凭记忆判断：
  - 实际首页路由为 `HomePage -> HeroSplit -> RightScrollCards -> ColoredCard`。
  - `src/components/Hero.tsx` 未被任何生产路由导入。
  - `src/styles/hero-reference.css` 只通过 `src/index.css` 导入，且服务于旧 `Hero.tsx` 的 `.hero-fullscreen` / `.project-card-horizontal` 等类。
- 移除旧 Hero 参考实现和对应 CSS 入口时，不影响当前首页 `HeroSplit`、卡片整卡跳详情、按钮跳外链、泊岸入场动画和导航。
- 不做无关重构，不调整当前 `HeroSplit` 视觉设计，不改项目数据和公开内容。
- 删除前后使用 `rg` 证明旧类名/组件不再被生产代码引用。

## Acceptance Criteria

- [x] `src/components/Hero.tsx` 被移除或不再作为可维护生产入口存在。
- [x] `src/styles/hero-reference.css` 不再被 `src/index.css` 导入；如无其他引用，应删除该 CSS 文件。
- [x] `rg` 搜索确认 `Hero.tsx`、`hero-reference.css`、`.hero-fullscreen`、`.project-card-horizontal` 等旧入口不再被生产代码引用。
- [x] `npm.cmd run lint`、`npm.cmd run build` 通过。
- [x] 如变更影响首页样式入口，运行 `npm.cmd run check:ui` 或等价首页 UI 检查。
- [x] 运行 `git diff --check` 和敏感信息扫描。

## Notes

- 本任务只处理已确认未使用的旧首页参考实现；如果发现类名仍被当前页面依赖，停止删除并记录证据。
