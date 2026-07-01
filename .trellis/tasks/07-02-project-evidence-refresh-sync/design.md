# 项目案例证据刷新与主站同步 - Design

## First Iteration Target

本轮优先刷新 `blog-semi` 自身的项目案例页，因为证据全部来自当前仓库，且该项目条目目前缺少 `image`、`detailContent` 和 `assistantContext`。

## Evidence

- `src/App.tsx`: 路由包含首页、项目集、项目详情、博客、博客详情、助手和助手管理页。
- `src/data/portfolio.ts`: 项目详情页通过 typed `detailContent` 渲染案例分析，助手知识通过 `assistantContext` 投影。
- `src/data/blogCuration.ts`: `blog-semi` 已关联内容模型、公开内容治理、静态站验证和构建手记文章。
- `scripts/generate-assistant-knowledge.ts`: `portfolio.ts` 是公开助手项目知识来源。
- `scripts/generate-sitemap.mjs`: 项目 id 会进入 sitemap。
- `scripts/verify.mjs`: 完整验证会运行 assistant index、Prisma validate、lint、server build/smoke、build、blog check 和 UI check。
- `public/images/projects/showcase/blog-semi-*.png|webp`: 已有首页、项目页和博客页截图素材。

## Target Shape

- 给 `blog-semi` 项目添加真实截图：优先使用 `/images/projects/showcase/blog-semi-home-desktop.png`。
- 用 `detailContent` 补齐：
  - 案例概览。
  - 工作台能力。
  - 实现与架构。
  - 质量与验证。
  - 当前边界。
  - 后续优化。
- 用 `assistantContext` 补齐公开助手摘要，使助手能回答主站能力、内容治理、验证链路和后续方向。

## Safety

- 只写公开站点能力、脚本和本地可验证流程。
- 不写入内部密钥、部署凭据、私有后台地址、数据库连接串或未公开的模型配置。
