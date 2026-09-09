# Authored 内容与 SEO 双语范围审计

日期：2026-09-10

本审计只读取当前仓库和确定性检查结果，不翻译、不修改业务源码、公开数据、生产记录或 SEO 输出。

## 覆盖矩阵

| 公共表面 | 当前源与规模 | authored/payload 字段 | 固定界面语言 | SEO/URL 投影 | 结论 |
| --- | --- | --- | --- | --- | --- |
| 首页 | `src/components/HeroSplit.tsx:50,303-307`；项目面板来自 `src/components/RightScrollCards.tsx:490-519`；15 个项目来自 `src/data/portfolio.ts:70-86` | hero 题句、正文、项目标题/描述/事实保持中文；项目动作由 `projectInterfaceCopy` 投影 | 首页固定状态、动作、刷新和根页面 copy 已跟随 `SiteLanguage` | `/` 使用 `src/utils/seo.ts:73-80` 的中文默认 title/description；无语言 URL | authored 文案与 SEO 需产品决定，不应在 UI 任务中盲译 |
| 项目目录/详情 | `src/data/portfolio.ts:70-86`；`src/pages/ProjectDetailPage.tsx:123-185,275-390` | `title`、`summary`、`role`、`imageAlt`、`imageCaption`、`stack`、`highlights`、`detailContent`、视觉说明和项目特定 explanation | 目录/详情标题操作、类别/状态和通用入口已本地化；项目事实与原始 explanation 保留语言 | `getProjectSeo` 在 `src/utils/seo.ts:180-187` 直接使用 `project.title`/`project.summary`，canonical 为 `/projects/:id` | 需要决定是否增加翻译字段；保持 publication、href、id、canonical 不变 |
| 博客目录/详情 | 11 篇公开文章由 `src/data/blogCuration.ts:142-155` 投影；类型见 `src/data/blogShared.ts:180-200`；详情渲染见 `src/pages/BlogPostPage.tsx:103-200` | `title`、`tag`、`detail`、`series`、知识点、日期/阅读时间、章节 title/body、takeaways 和 related 内容保持中文 | 目录筛选、计数、空态、详情返回、阅读目录和固定操作已本地化；文章内容保留原文 | `getBlogPostSeo` 在 `src/utils/seo.ts:190-197` 直接使用 `post.title`/`post.detail`，canonical 为 `/blog/:slug` | 翻译需要内容字段/版本策略，不应直接替换现有文章源 |
| AI Daily feed/detail | public page 渲染 `src/pages/AiDailyPublicPage.tsx:95-195`、`src/pages/AiDailyPublicDetailPage.tsx:113-134`；contract decoder 由既有 public API 负责 | 批准的 title、factSummary、whyItMatters、uncertainty、citation publisher/title/excerpt/URL 保留 payload 原值；固定 sections、错误、日期和来源动作已本地化 | 公共 feed/detail 固定界面已本地化，语言不进入请求/ETag/polling 依赖 | `/ai-daily` 和 detail 使用 `src/utils/seo.ts:100-115` 的中文固定 metadata；detail canonical 保持 publicId URL | AI Daily 内容双语属于版次/编辑流程决策；不能修改生产版次或 Feed |
| 公开助手 | suggestion 类型与 prompt 在 `src/data/assistant.ts:26-53,55-123`；31 条公开知识项在 `src/data/assistant.ts:125-190`；payload chrome 在 `src/components/PublicAssistantWidget.tsx:1934-2033,2248` | 用户问题、回答、建议 prompt、session/history title、citation title/section/summary/URL、claim、model metadata 保持原始 payload；公开知识内容保持中文/混合来源 | launcher、模式、状态、历史、分支、修订、反馈、引用外壳、图片、composer 和 Markdown chrome 已本地化 | 助手没有独立 SEO route metadata；宿主页面继续使用 path-only `SeoManager` | 内容翻译必须先定义知识/回答/引用版本和安全边界；当前不实施 |

## SEO 观察

- `src/components/SeoManager.tsx:15-28` 的 effect 仅依赖 `pathname`，语言切换不会重新生成 title、description、Open Graph 或 Twitter metadata。
- `src/utils/seo.ts:46-63` 将 `SeoMeta` 写入 document head，但 `SeoMeta` 没有 `language` 或 alternate metadata 字段；`getStaticSeo`、`getProjectSeo`、`getBlogPostSeo` 的公共 title/description 均来自中文固定 copy 或 authored 中文字段（`src/utils/seo.ts:70-197`）。
- 初始 HTML 在 `index.html:2,30-70` 使用 `lang="zh-CN"`、中文默认 description/title 和单一 canonical；语言偏好在 `src/hooks/useSiteLanguage.ts:10-16` 的 layout effect 中投影到 `html.lang`，不是服务器/预渲染双语 SEO。
- `public/sitemap.xml:2-244` 只有一套无语言后缀 URL，`public/robots.txt:1-5` 只声明该单一 sitemap；没有发现 `hreflang`、语言 alternate sitemap 或 locale URL 规则。
- canonical、Open Graph URL、source URL 和页面路由保持稳定；本轮没有改动这些身份字段。

## 决策边界

可以进入下一阶段的候选：

1. 先为 SEO metadata 建立 `zh/en` 资源和回退规则，明确是否引入 locale URL、`hreflang`、canonical 选择和 sitemap 变体。
2. 先为项目/博客 authored 内容建立译文字段或独立版本模型，明确原文保留、编辑来源、发布时间和 related/assistant 投影如何同步。
3. 将 AI Daily 和助手回答/引用内容继续作为独立的 approved payload/production 决策，不与静态 UI 翻译混合。

当前不能直接实施的事项：

- 把中文项目/文章/助手内容逐字替换为英文；这会改变公开事实、引用语义或 assistant knowledge identity。
- 仅因访客切换了界面语言就重写 canonical、sitemap 或生产 AI Daily/助手 payload。
- 用真实模型、发布 Feed/Cron 或生产服务验证内容翻译。

## 推荐恢复输入

需要产品明确：内容翻译覆盖的实体与字段、翻译来源/审核责任、原文与译文的 URL/SEO 策略、助手/AI Daily 是否允许翻译 approved payload。收到这些输入后，再创建只改已批准字段的实现子任务。\n
