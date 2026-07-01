# Blog content cleanup design

## Decision

第一阶段采用“精选公开 + 批量内容下架待重写”的博客治理方式。现有 96 篇文章继续保留为内容素材，但博客首页、搜索、详情直达、相关推荐、项目延展阅读、站点地图和公开助手只暴露少量精选文章。

## Boundaries

- 不改变 `src/data/blog-posts/*.ts` 的正文结构。
- 不引入 CMS、数据库或后端内容接口。
- 不批量重写或物理删除正文，只允许小范围修正摘要、分类、标签、日期、项目关联和入口文案；批量生成感明显的文章先隐藏，后续另开任务重写。
- 不把内部项目细节、真实连接信息或敏感部署资料写入公开内容。

## Data Model

在现有 `BlogPostSummary` 之外增加策展元数据，优先放在独立文件，例如 `src/data/blogCuration.ts`：

```ts
export type BlogVisibility = 'featured' | 'archive' | 'hidden'
export type BlogContentRole = 'case-study' | 'technical-method' | 'resource' | 'roadmap'

export interface BlogCuration {
  visibility: BlogVisibility
  role: BlogContentRole
  priority: number
  projectIds?: string[]
}
```

默认策略：

- 未显式配置的文章默认为 `hidden`，不进入公开列表、搜索、相关推荐、项目延展阅读、站点地图或公开助手。
- `featured` 用于博客首页第一屏、精选列表、项目延展阅读和助手优先引用。
- `archive` 作为后续状态保留；当前阶段不公开归档文章，避免模板化历史内容污染公开站点。

## Derived Selectors

新增派生函数，避免页面和助手重复写筛选逻辑：

- `getBlogCatalog()`：合并 `blogPosts` 与策展元数据，并按 `visibility/priority/date` 排序。
- `getFeaturedBlogPosts()`：返回精选文章。
- `getPublicBlogPosts()`：当前只返回公开可见文章，实际等同于精选集；排除 `hidden`。
- `getPublicBlogPostSummary(slug)`：详情页和 SEO 使用的公开门禁，隐藏文章直达时视为未找到。
- `getProjectBlogPosts(projectId)`：根据 `projectIds` 返回项目关联文章。
- `getRelatedBlogPosts(post)`：优先同项目，其次同系列，再同分类，替代当前“同分类前 3 篇”。

## UI Flow

- 博客首页只展示精选公开内容，不提供全部归档入口。
- 搜索只覆盖公开可见文章；隐藏文章保留为内部重写素材，不对访客暴露。
- 卡片继续使用现有 `BlogCard`，可增加角色、项目或精选标记，但不做大幅视觉重构。
- 博客详情页在正文后展示“关联项目”和更准确的相关文章；隐藏文章的直接 URL 应返回“未找到该文章”。
- `src/data/blogContent.ts` 只注册公开文章 loader；隐藏文章素材文件可以继续保留，但不应被运行时加载或打进公开构建。
- 项目详情页增加“延展阅读”区块，优先展示关联博客；项目原有 `links` 仍保留外部演示、代码或文档入口。

## Assistant Flow

`src/data/assistant.ts` 当前把全部 `blogPosts` 转为 public 知识项。治理后应改为使用公开可见文章，并在评分时让精选文章和项目页保持优先级：

- `hidden` 文章不进入 `publicKnowledgeBase`。
- `featured` 文章可增加标签或权重。
- 访客问“项目/案例/作品”时，项目知识仍优先；博客作为延展证据补充。

## Audit Script

新增或扩展博客审计脚本，建议使用 `tsx` 直接读取 TypeScript 数据源：

- 总文章数、公开正文 loader 数、素材文件数、缺失/孤儿正文。
- 分类、标签、系列、日期分布。
- `featured/archive/hidden` 数量。
- 每个 `featured` 是否有 `role`、`priority`。
- `projectIds` 是否能匹配 `projects` 中的真实项目。
- 每个核心项目是否至少有关联文章。
- `hidden` 是否仍进入助手知识库或博客首页。
- 公开文章数量是否等于精选文章数量，避免 `archive` 被误开放。
- 隐藏文章是否仍拥有公开 loader，避免下架内容进入构建产物。

## Rollback

该设计应保持低风险：策展数据是独立层，若后续决定重写并重新开放文章，可以逐篇把 `hidden` 调整为 `featured` 或 `archive`。若出现问题，可以恢复博客首页直接使用 `blogPosts`，项目页和助手也可回退到旧逻辑。
