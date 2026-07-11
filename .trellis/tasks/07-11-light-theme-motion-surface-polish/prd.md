# Light Theme Motion And Surface Polish

## Goal

在保留 BIAU Port 当前“晨雾港湾”流体背景和可见动画的前提下，轻微降低浅色主题的刺眼色彩纯度，并统一导航、页面面板、项目卡片、博客筛选和页脚的半透明表面层级。

## Background

上一轮尝试同时降低背景饱和度、流体层透明度和光带强度，实际观感过素，背景动效近似消失。用户明确要求保留原有效果，因此本任务不能通过继续降低动态层可见度来获得“克制”。

当前基线：

- 三种浅色场景 `dusk / garden / stellar` 已有独立配色。
- 当前可见背景由 `biauReferenceColorFlow`、`biauReferenceMistFlow`、`biauReferenceEdgeFlow` 三层动画驱动。
- 浅色场景的 mist/edge opacity 均保持在 `0.18 / 0.22` 以上。
- 页面布局、移动端触摸和入场动画已有 `check:ui` 守护。

## Requirements

- 保持背景动画名称、速度和关键动态层，不删除、暂停或改成近似静态。
- 浅色场景 mist opacity 不低于 `0.18`，edge opacity 不低于 `0.22`。
- 只对浅色颜色端点和 saturation 做小幅调整；`dusk` 仍保留暖光、淡粉和海雾蓝，不变成纯灰或单一蓝色。
- 面板 alpha 只小幅提高，保持背景颜色仍能透出。
- 统一浅色导航、页面 hero、项目/博客卡片、筛选工具栏和页脚的边框与阴影语言。
- 浅色 hover 保留色彩反馈，但去除刺眼的纯白光圈和大范围霓虹感。
- 不改变深色主题、页面结构、文案、路由和移动端手势逻辑。
- 不重新引入 Semi Design 或其他 UI 框架。

## Acceptance Criteria

- [x] 三种浅色场景仍有不同颜色端点，且 `dusk` 不是纯灰背景。
- [x] 浅色主页的 color/mist/edge computed animation 均保持运行，mist/edge opacity 分别不低于 `0.18 / 0.22`。
- [x] 首页、项目页和博客页的内容面板更清楚，但背景流动仍可见。
- [x] 项目卡片和博客卡片 hover 在浅色主题下没有纯白强光圈。
- [x] 320、390、430 手机宽度无导航重叠和横向溢出。
- [x] `lint`、`build`、`performance:check`、`check:ui` 通过。
- [x] 桌面和手机截图经过人工视觉检查。

## Out Of Scope

- 不重做深色主题。
- 不更换首页布局、字号体系或项目卡片结构。
- 不调整 Harbor Intro、移动端手势或公开助手逻辑。
- 不生成新图片或引入第三方动画库。
