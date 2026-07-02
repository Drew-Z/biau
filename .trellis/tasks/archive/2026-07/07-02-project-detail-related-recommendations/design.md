# 项目详情相关推荐质量优化 - Design

## Architecture

只改前端静态推荐逻辑：

- `ProjectDetailPage.tsx` 继续拥有页面级推荐计算。
- 输入仍来自公开静态数据：`projects` 和 `getProjectBlogPosts(project.id)`。
- 不新增持久化、不接后台、不改 URL 结构。

## Recommendation Score

候选项目分数由几类低风险公开信号组成：

- 同 category：强相关。
- 共享公开博客 slug：强相关。
- 共享技术栈：中相关，按交集数量累加。
- 当前项目或候选项目有 `main` / `live` 状态：轻权重，帮助访客跳到更成熟可展示项目。
- 兜底：如果没有任何正分候选，选公开展示更成熟的项目作为备选，避免单类目项目无下一跳。

排序：

```text
score desc -> 原 projects 顺序 asc
```

## UI Contract

- 推荐最多 3 个。
- 推荐卡片继续使用现有 `detail-related-card` 样式。
- 如果推荐中存在跨 category 项目，标题用“相关项目”。
- 如果全部同 category，标题用“同类项目”。

## Safety

- 技术栈、category、blog curation 都是公开站点数据，可用于公开推荐。
- 不把 `assistantContext` 原文用于推荐标题或卡片，避免把长段上下文带入 UI。
- 不记录点击数据新增字段；现有 project detail open 事件保持不变。
