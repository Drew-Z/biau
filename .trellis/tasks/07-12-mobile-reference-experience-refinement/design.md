# Design

## Direction

采用“移动端编辑式压缩层”而非新交互系统：复用现有 DOM、状态与路由，只调整手机断点下的空间、表面、排版和信息组合。参考站提供节奏原则，不复制其底部目录抽屉或复杂运行时。

## Layout Changes

- `page-hero`：手机端减少上下 padding 和主标题占高；目录页英雄使用更紧凑的最小高度。
- 首页 `hero-copy / carousel-wrapper`：缩短品牌文字与项目列表间距，保持标题完整并让列表上移。
- 博客工具区：在 `BlogPage` 增加语义容器，把 `BlogColumnFilter`、搜索和结果摘要包成同一 surface；桌面仍按现有布局展示。
- 项目分组：手机隐藏桌面 group head，toggle 作为轻量分段控件；项目 grid 取消与外层同等级的边框/阴影，卡片本体保留主要表面。
- 详情 hero：为移动标题定义 32px/34px 两档固定字号，根据紧凑断点切换；限制字面行长但不截断正文标题。

## Interaction

- 不增加手势识别。
- 保持 `touch-action: pan-y`、整卡入口、嵌套操作隔离和底部导航。
- 阅读导航保持顶部 sticky/自动显隐，避免和底部助手、tabbar 争夺空间。

## Validation

Playwright 收集 320/390/430px 的首个可操作入口 y 坐标、触控框、横向溢出、标题边界和底部遮挡；截图覆盖三目录页及两类详情页。桌面做逆向回归。
