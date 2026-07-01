# 主站项目展示闭环审计与修复

## Goal

让 `blog-semi` 的项目入口行为形成一致闭环：访客点击项目卡片时优先进入主站项目详情页，卡片内按钮或外链才跳转到对应外部站点。这样项目详情页能承担“访客可读的技术案例页”，外部站点承担 demo、试玩或源码入口。

第一轮已完成首页 hero 卡片的 `detailLink` / `externalLink` 拆分；本子任务继续处理项目列表页和详情页周边链接，避免部分项目绕过主站案例页直接外跳。

## Requirements

- 项目列表页 `ProjectsPage` 中，整卡和“查看详情”按钮必须统一导航到 `/projects/<id>`。
- 外部站点、试玩、源码、API health 等链接仍保留在卡片外链 badge 或项目详情页“相关链接”中，并保持新窗口打开。
- 不能破坏首页 `HeroSplit` / `RightScrollCards` 已实现的整卡详情、按钮外链行为。
- 不能删除项目数据；如果发现项目缺少详情内容，记录为后续 evidence refresh，不在本子任务扩大重写。
- 保持键盘可访问性：项目卡片 Enter/Space 与点击行为一致。
- 更新 Trellis 记录，说明本轮审计发现和后续候选。

## Acceptance Criteria

- [x] `/projects` 页面所有项目卡片点击都进入主站 `/projects/<id>` 详情页。
- [x] 游戏项目、Playlab、外部 demo 链接不再通过整卡点击直接外跳。
- [x] 卡片内外部链接仍可打开外部站点，并且点击外链不会触发整卡导航。
- [x] `npm.cmd run lint` 通过。
- [x] `npm.cmd run build` 通过。
- [x] `npm.cmd run check:ui` 通过或记录无法运行原因。
- [x] 提交前完成 `git diff --check` 与敏感信息扫描。

## Notes

- Evidence read:
  - `src/pages/ProjectsPage.tsx`
  - `src/components/ProjectCard.tsx`
  - `src/pages/ProjectDetailPage.tsx`
  - `src/data/hero.ts`
  - `src/components/RightScrollCards.tsx`
- Change made:
  - `ProjectsPage.openProjectDetail` now always routes to `/projects/<id>`.
  - External project links remain in `ProjectCard` badges and `ProjectDetailPage` related links.
- Validation:
  - `git diff --check`: passed.
  - Sensitive scan over `src` and task artifacts: only existing frontend token variable names were matched; no secret values were found.
  - `npm.cmd run lint`: passed.
  - `npm.cmd run build`: passed.
  - First direct `npm.cmd run check:ui`: failed because no server was running at `http://127.0.0.1:5174`.
  - `npm.cmd run check:ui` with a temporary preview server on `http://127.0.0.1:5174`: passed.
