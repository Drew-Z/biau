# Blog content cleanup

## Goal

把博客从“批量知识条目集合”整理成访客可读、可筛选、可继续迭代的公开知识层：它应支持项目页叙事、公开助手检索和后续博客精修，而不是在本任务内一次性重写全部 96 篇文章。

## Decision

第一阶段采用“精选公开 + 批量内容下架待重写”。现有文章继续作为内容素材保留在代码库中，但公开博客首页、搜索、相关推荐、项目延展阅读、站点地图和公开助手只使用少量已经接近访客可读的精选文章；其余批量生成感较强的文章默认 `hidden`，等待后续重写。

## User Value

- 访客进入知识库时，只看到少量能支撑项目叙事的文章，而不是大量同日期、同分类、模板感明显的文章堆叠。
- 项目页可以自然关联对应博客，让 Legal RAG、ERP、Playlab、Pet、Xunqiu 等项目的实现、架构、技术栈和后续优化方向有更完整的延展阅读。
- 公开助手继续基于站点公开内容回答问题，但知识源需要更有层次，避免被低优先级或未整理内容淹没。

## Confirmed Facts

- 博客数据模型在 `src/data/blogShared.ts:1` 定义了 `tech | project | news | resource | daily` 五类，完整正文支持 `sections`、`takeaways`、`scenarios`、`practiceChecklist` 等结构化字段（`src/data/blogShared.ts:11`）。
- 博客首页已有分类筛选、搜索和分页，分页大小为 12（`src/pages/BlogPage.tsx:7`），筛选和搜索基于 `title/detail/tag/series/knowledgePoints`（`src/pages/BlogPage.tsx:15`）。
- 博客详情页通过 `getBlogPost` 懒加载正文（`src/pages/BlogPostPage.tsx:17`、`src/data/blogContent.ts:104`），相关推荐目前只取同分类前 3 篇（`src/pages/BlogPostPage.tsx:26`）。
- 当前有 96 条博客摘要和 96 个正文素材文件；实现阶段会把公开正文 loader 收窄到精选文章，隐藏文章文件保留作后续重写素材。
- 内容分布明显偏斜：`AI 应用知识库` 系列 79 篇，91 篇日期为 `2026-06-20`，这会让列表像一次性导入而不是持续策展；对应字段在 `src/data/blog.ts:13`、`src/data/blog.ts:15` 等大量重复出现。
- 抽样正文不是空壳：例如 `legal-rag-review`（`src/data/blog.ts:23`）、`ozon-erp-architecture`（`src/data/blog.ts:1388`）、`pet-workspace-pipeline`（`src/data/blog.ts:1403`）、`xunqiu-android64-rebuild`（`src/data/blog.ts:1418`）、`game-showcase-standard`（`src/data/blog.ts:1433`）都有场景、清单、分节正文和收获。
- 项目数据已有 12 个项目，入口从 `src/data/portfolio.ts:89` 开始；其中只有 Ozon ERP 明确链接到博客文章 `/blog/ozon-erp-architecture`（`src/data/portfolio.ts:318`），博客正文未显式反向链接到 `/projects/...`。
- 公开助手会把全部 `blogPosts` 转成 public 知识项（`src/data/assistant.ts:166`），并与项目知识一起进入 `publicKnowledgeBase`（`src/data/assistant.ts:175`）。因此博客治理会直接影响公开助手检索质量。
- 已有 `scripts/check-public-blog.mjs` 扫描公开禁用词和草稿结构（`scripts/check-public-blog.mjs:10`、`scripts/check-public-blog.mjs:11`），但还没有检查分类均衡、可见性、项目关联或策展优先级。

## Scope

- 本任务作为博客治理第一阶段交付，完成可独立验证的策展数据层、博客/项目/助手接入、公开下架门禁和审计脚本。
- 后续如果要逐篇改写或重新生成博客正文，应另开子任务或后续任务，并以本次隐藏素材和精选清单作为输入。

## Review Status

- 用户先确认采用推荐方案进入实现，后续指出现有博客大多不满足真正博客条件，原本甚至考虑直接全部删除。因此第一阶段策略从“归档可搜索”收紧为“少量精选公开，其余隐藏待重写”。
- 第一阶段暂不拆分子任务：策展数据、页面接入、助手接入和审计脚本彼此依赖，作为一个小闭环交付更容易验证。后续逐篇改写正文、优化博客内容质量或扩展分类体系时再单独拆任务。

## Requirements

- R1: 产出博客目录审计结果，覆盖每篇文章的分类、系列、标签、日期、关联项目、公开展示优先级和后续处理建议。
- R2: 为博客引入明确的公开策展策略，至少能区分“首页/列表重点展示”“暂不展示或后续重写”两种实际公开状态，并保留 `archive` 作为后续可恢复状态。
- R3: 优先处理信息架构和可见性，不在本任务内重写全部 96 篇正文；把批量生成感明显的文章从公开站点下架，源文件保留作后续重写素材。
- R4: 将项目案例文章与项目页建立双向关系，优先覆盖 Legal RAG、Pet Workspace、Ozon ERP、Biau Playlab、Xunqiu 和当前主站。
- R5: 公开助手知识库应尊重博客治理结果：隐藏文章不得进入公开助手知识库或与核心项目页争夺引用。
- R6: 博客页应保留现有搜索/分类/分页能力，并在治理后更容易让访客按主题或项目方向找到内容。
- R7: 保持公开内容安全边界，不加入真实 IP、账号、密钥、数据库连接串、云端 API 地址、签名文件路径等敏感信息。

## Acceptance Criteria

- [ ] `prd.md`、`design.md`、`implement.md` 说明博客清理范围、数据设计、执行顺序和验证方式。
- [ ] 有可复跑的博客目录审计方式，能输出总量、分类/系列/日期分布、正文缺失、项目关联和可见性状态。
- [ ] 博客数据或派生逻辑支持策展状态，列表、详情直达、相关推荐、站点地图和助手知识能使用该状态。
- [ ] 至少 5 个核心项目能从项目页进入对应博客/知识延展，且相关博客能回到对应项目页。
- [ ] 首页或博客列表不再把全部 96 篇同权重文章直接铺开；访客只能看到少量精选公开文章。
- [ ] `scripts/check-public-blog.mjs` 或新增检查覆盖本次新增的公开内容治理规则。
- [ ] 运行最小验证：`npm run lint`、`npm run build`，以及博客治理相关检查脚本。

## Out Of Scope

- 一次性重写或物理删除全部 96 篇博客正文。
- 引入 CMS、数据库或后端内容管理。
- 改造内部助手为真实私有知识库。
- 为所有历史项目补齐全量博客长文；本任务先做策展和核心项目连接。
