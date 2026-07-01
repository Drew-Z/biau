# Publish first build log blog post

## Goal

发布第一篇 `构建手记 / Build Log` 栏目文章，用真实的站点改造过程验证新的博客栏目系统与 `blog-content-pipeline` skill。

这篇文章聚焦“博客内容系统从批量生成清理到栏目化生产流水线”的建设过程：为什么先隐藏旧文章、为什么直接迁移到 `BlogColumn`、如何建立栏目元数据、如何把内容生成流程固化为 skill，以及后续应该怎样继续生产更精致的博客。

## Background

- `06-30-blog-content-cleanup` 已将公开博客收窄为 9 篇精选文章，87 篇旧/批量生成内容保持隐藏。
- `07-01-blog-content-system` 已将博客从旧 `BlogCategory/category` 迁移为 `BlogColumn/column`，新增 `知识积累 / 项目总结 / 资源分享 / AI 日报 / 构建手记` 五个一级栏目。
- `blog-content-pipeline` skill 已建立，要求内容生产遵循取证、栏目判断、模型策略、审稿、入库和验证流程。
- 当前 `构建手记` 栏目还没有公开文章。发布一篇真实的系统构建复盘，能验证栏目展示、筛选、助手标签、sitemap 和审计流程。

## Requirements

- R1: 新增一篇公开 Build Log 文章，栏目为 `build-log`，角色适合设置为 `technical-method` 或 `roadmap`，并加入公开策展。
- R2: 内容必须基于本仓库已完成的任务和代码事实，不编造外部指标、用户、部署细节或私有信息。
- R3: 文章应解释真实建设过程：
  - 初始问题：博客有大量不适合公开的批量生成内容。
  - 清理策略：先精选公开内容，隐藏不合格内容。
  - 栏目决策：不兼容旧分类，直接迁移到 `BlogColumn`。
  - 流水线决策：Codex 取证 + 单强模型写作/改写 + Codex 审稿入库，默认串行。
  - 验证闭环：`blog:audit`、`assistant:index`、`sitemap:generate`、`lint`、`build`、`verify`。
  - 后续方向：按栏目小批量生产，而不是批量自动发文。
- R4: 文章不得和项目详情页重复；它是站点构建过程复盘，不是某个项目案例页。
- R5: 更新 `src/data/blog.ts`、`src/data/blog-posts/`、`src/data/blogContent.ts`、`src/data/blogCuration.ts`，并确保公开 selector、助手知识和 sitemap 能看到该文章。
- R6: 更新后运行必要验证。

## Acceptance Criteria

- [ ] 新文章显示在博客列表中，筛选 `构建手记 / Build Log` 能找到它。
- [ ] 新文章详情页可以通过公开路由访问。
- [ ] `npm.cmd run blog:audit` 通过，且公开文章数量从 9 增至 10。
- [ ] `npm.cmd run assistant:index` 后，`server/data/public-knowledge.json` 包含新文章条目和 Build Log 栏目标签。
- [ ] `npm.cmd run sitemap:generate` 后，`public/sitemap.xml` 包含新文章 URL。
- [ ] `npm.cmd run lint`、`npm.cmd run build` 通过，尽量运行 `npm.cmd run verify`。
- [ ] 不修改或回滚无关脏文件：`AGENTS.md`、既有 `.agents/skills/trellis-*`、`.codex/`、`docs/agents/codex-workflow.md`。

## Notes

- 这是轻量任务，PRD-only 即可。
- 内容使用 `blog-content-pipeline` 的 Build Log 模板。
- 优先自己取证和撰写，不调用外部模型；后续有需要时再把同类文章交给单个强内容模型改写。
