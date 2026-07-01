# 主站项目展示闭环审计与修复 - Design

## Current Behavior

- 首页 hero 项目卡片已经使用 `detailLink` 进入主站详情，`externalLink` 由卡片按钮打开外部站点。
- 项目列表页 `ProjectsPage.openProjectDetail` 当前读取 `project.detailLink`；当该字段为 external 时会直接 `window.open`，导致 Playlab 和各游戏项目整卡点击绕过主站详情页。

## Target Behavior

- `ProjectsPage` 的整卡点击与“查看详情”按钮始终进入 `/projects/${project.id}`。
- `ProjectCard` 现有 external link badge 保持作为外部访问入口。
- `ProjectDetailPage` 继续展示项目相关链接，供访客从技术案例页进入 demo、试玩、源码或 health endpoint。

## Compatibility

- 保留 `Project.detailLink` 字段，因为它仍表达某些项目的外部详情来源或下游站点入口。
- 不修改项目数据结构；本轮只修正列表页导航语义。
- 首页 hero 不变。
