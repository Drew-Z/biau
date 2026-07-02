# 泊岸 Logo 入场归位动画

## Goal

为 `BIAU Port / 泊岸` 首页添加连贯的品牌入场动画：开屏 Logo 在屏幕中心完成“泊岸”意象的绘制与点亮，然后明确归位到现有导航栏站点图标位置，让用户感知这是同一个 Logo 留在站点导航中，而不是独立播放后消失的装饰动画。

## User Value

- 首访用户能更快建立 `biau port / 泊岸` 的品牌记忆。
- 动画表达“漂泊到靠岸、灯光点亮、进入站点”的情绪，但不阻碍页面使用。
- 站点图标、导航 Logo 和开屏动画共享同一视觉资产，减少品牌表达不一致。

## Confirmed Facts

- 当前站点已在 `src/components/BiauPortMark.tsx` 中实现 SVG Logo，包含 `b` 主体、水线、`>` 端口和暖金灯点。
- 首页已在 `src/components/HarborIntro.tsx` 中渲染首访开屏动画，并且只在 `pathname === '/'` 时出现。
- 当前动画落点主要依赖 `src/styles/animations.css` 中的 `--harbor-logo-x` / `--harbor-logo-y` 固定 CSS 变量，不能保证和真实导航栏 Logo 完全对齐。
- 导航栏 Logo 在 `src/components/Navigation.tsx` 中由 `.nav-logo` 包裹 `BiauPortMark` 渲染。
- 现有逻辑已经跳过 `prefers-reduced-motion: reduce`，并用 `sessionStorage` 避免同一会话重复播放。

## Requirements

1. 开屏动画必须继续复用 `BiauPortMark`，不得引入另一套不一致的 Logo 图形。
2. 动画结束段必须根据当前页面中真实 `.nav-logo` 的位置计算落点，使中央 Logo 视觉上缩放并移动到导航栏站点图标。
3. 导航栏真实 Logo 在开屏期间应避免和归位动画发生明显重叠或闪烁；开屏结束后真实导航 Logo 正常可见和可交互。
4. 动画应保留 `b` 主体绘制、水线/端口线条、暖金灯点点亮和站名浮现的品牌表达。
5. 支持移动端导航 Logo 尺寸和位置差异，不依赖桌面固定坐标。
6. 继续遵守 `prefers-reduced-motion` 和同一会话只播放一次的行为。
7. 不引入新的公开敏感信息、外部服务、真实部署地址或图片生成资产。

## Acceptance Criteria

- [x] 首页首访时，开屏中心 Logo 最后一段移动并缩放到当前导航栏 `.nav-logo` 的真实位置。
- [x] 开屏期间导航栏 Logo 不出现明显双影；动画结束后导航栏 Logo 保持现有 hover/click 行为。
- [x] 桌面和移动端都不再依赖固定 `--harbor-logo-x` / `--harbor-logo-y` 作为最终落点来源。
- [x] `prefers-reduced-motion: reduce` 用户不会看到入场动画。
- [x] 运行 `npm.cmd run lint` 和 `npm.cmd run build` 通过。
- [x] 运行 `git diff --check` 和敏感信息扫描，不发现新增问题。

## Validation

- `npm.cmd run lint` passed.
- `npm.cmd run build` passed, with existing Vite ineffective dynamic import warnings for `blogCuration.ts` and `portfolio.ts`.
- `npm.cmd run check:ui` passed, including the new home-intro docking assertion for matching `.nav-logo` center and target scale.
- `git diff --check` passed.
- Sensitive-info scan over changed implementation, style, check script, and PRD files found no matches.

## Out Of Scope

- 不更换项目整体视觉主题。
- 不发布或部署站点。
- 不生成正式公开图片资产。
- 不改动博客内容、项目案例数据或站点地图。
