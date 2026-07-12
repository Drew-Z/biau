# Mobile Card Entry and Tactile Feedback

## Goal

借鉴参考站“整张卡片即入口”和短促按压反馈，让手机用户无需猜测可点击区域，同时保持页面自然纵向滚动。

## Requirements

- 首页项目卡、项目目录卡和博客卡在手机端具有一致、克制的按压反馈。
- 博客卡整卡可进入文章，支持 Enter / Space 键盘激活，原有按钮继续可用且不会重复触发。
- 触控反馈不得拦截 `pan-y`，不得重新引入横向手势或页面滚动锁定。
- 鼠标桌面 hover、焦点可见性和现有路由行为不回归。
- 动效遵守 reduced-motion。

## Acceptance Criteria

- 320/390/430px 下三类卡片均有 `touch-action: pan-y` 和短促 active feedback。
- 点击博客卡非按钮区域进入正确详情页；按钮仅触发一次导航。
- 键盘可聚焦博客卡并通过 Enter 进入详情。
- 模拟触摸滚动不会误导航，页面无横向溢出。
- lint、build、UI 回归通过。