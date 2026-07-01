# Blog content cleanup and publishing plan

## Goal

完成博客内容治理第二阶段：把当前仍留在运行时博客目录里的 87 篇隐藏旧文从公开发布链路中移出，保留为 legacy 素材和重写队列，让博客运行时数据只承载已经策展的公开文章。

这次任务不是批量生成新博客，也不是直接销毁旧素材，而是减少维护噪音、明确后续重写入口，并继续保证博客页、项目页、公开助手和 sitemap 只使用精选公开内容。

## Background

- `npm.cmd run blog:audit` 已确认当前博客总量 97 篇，其中 10 篇 `featured`、87 篇 `hidden`。
- 当前 10 篇公开文章分别是 `legal-rag-review`、`legal-rag-production-upgrade-plan`、`ozon-erp-architecture`、`pet-workspace-pipeline`、`xunqiu-android64-rebuild`、`game-showcase-standard`、`content-modeling-project-site`、`public-content-governance`、`static-site-release-verification`、`blog-content-system-build-log`。
- 87 篇隐藏旧文主要集中在 `AI 应用知识库`、`Legal RAG`、`AI 应用工程化` 系列，其中大量文章日期同为 `2026-06-20`，更像批量生成素材，不适合继续作为运行时博客目录的一部分。
- 上一阶段已经采用“精选公开 + 批量内容下架待重写”的策略；本阶段把“下架待重写”从仅靠 `hidden` 状态进一步推进到文件和目录层面的 legacy archive。
- 当前栏目体系为 `knowledge`、`project-notes`、`resources`、`ai-daily`、`build-log`。资源分享和 AI 日报暂不批量填充，后续内容通过 `blog-content-pipeline` evidence-first 流程生产。

## Requirements

- R1: 运行时博客目录只保留已策展、可公开展示的文章摘要和正文 loader；隐藏旧文不再参与 `blogPosts` 运行时目录、正文扫描和公开检查。
- R2: 87 篇隐藏旧文不得物理丢失，应移动到明确的 legacy archive 位置，作为后续重写素材。
- R3: 为 legacy 旧文生成或维护可复查的重写队列，至少记录 slug、标题、栏目、标签、系列、日期、推荐处理方向和原始归档路径。
- R4: 博客审计脚本应反映新的运行时事实：总运行时文章数应等于公开精选文章数，legacy 数量应单独报告，公开 loader、正文文件和策展配置保持一致。
- R5: 公开博客页、博客详情、项目延展阅读、公开助手和 sitemap 仍只能暴露精选公开文章；旧文归档不得被前端或 assistant 索引引用。
- R6: 保留后续重写路径：需要能从 legacy archive 选取候选文章，用 `blog-content-pipeline` 重新取证、改写、审稿，再作为新文章加入运行时目录。
- R7: 不引入 CMS、数据库或模型自动生成流水线；本任务只做内容治理、归档、清单和验证。
- R8: 不写入真实 IP、账号、密钥、数据库连接串、云端 API 地址、签名文件路径等敏感信息。

## Acceptance Criteria

- [ ] `.trellis/tasks/07-01-blog-content-cleanup-publishing-plan/` 包含 `prd.md`、`design.md`、`implement.md`，说明清理范围、数据设计、执行顺序和验证方式。
- [ ] 87 篇隐藏旧文从 `src/data/blog.ts` 和 `src/data/blog-posts/` 运行时目录移出，并保留在 legacy archive 中。
- [ ] 运行时 `blogPosts` 只包含当前 10 篇精选公开文章，`blogCuration` 不再需要依赖默认隐藏旧文来掩盖批量内容。
- [ ] legacy archive 有 README 或 manifest/rewrite queue，能解释这些文章为什么不公开、后续如何重写。
- [ ] `npm.cmd run blog:audit` 能输出运行时公开文章、legacy 数量、缺失文件、孤儿 loader、策展引用等结果，并通过检查。
- [ ] `npm.cmd run blog:check`、`npm.cmd run assistant:index`、`npm.cmd run sitemap:generate`、`npm.cmd run lint`、`npm.cmd run build` 通过。

## Out Of Scope

- 本任务不批量重写 87 篇旧文。
- 本任务不新增 AI 日报、资源分享或大批知识积累文章。
- 本任务不改变公开博客栏目体系和模型协作策略。
- 本任务不引入后端 CMS、数据库内容管理或自动发布任务。
