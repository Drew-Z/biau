# AI 日报公共界面语言设计

新增 `src/data/aiDailyInterfaceCopy.ts`，以 `Record<SiteLanguage, ...>` 保存固定文案、参数化提示、目录标题和有限错误字典。只由既有 lazy 公共日报页面消费，类型使用 type-only import，不向首页增加日报内容或运行时数据依赖。

错误保留原分类和优先级：feed 的 404/429/503/network/default，以及 detail 的 missing-id/404/410-withdrawn/410-expired/network/default。页面 state 保存该有限类别，load 只设置类别；render 使用字典。load 的依赖仍为原 [] 或 [publicId]，abort、sequence、ETag、payloadRef、60秒可见性轮询均保持，避免语言切换制造请求或把旧错误固定成中文。

日期 helper 合并两页面既有日期选项；feed 不显示年份、detail 显示年份，更新时钟只显示时分，均保持原本地时区和中文默认。仅缺值提示/显示 locale 改变，正文的日期字段、revision、stale 状态、计数和来源不会改变。

根节点声明界面语言，作者正文/标题显式中文。来源文本可能中英文混合，原文使用 lang=""，来源操作 span 使用当前语言。产品名字保留 formatProductName 原值。详情目录继续使用 ai-daily-fact/impact/uncertainty/citations 四个固定 ID 和原显隐条件，传 itemsLanguage，不从翻译生成 ID。SEO effect 保持原逻辑及依赖。

新浏览器模块由 Node language:ui 和 tsx check:ui 共用。将 check-ui 中两个既有纯 fixture 工厂原样提取为共享 mjs，再给专项构造分页、pending/error/304 和可选章节场景；不复制生成器或导入会执行全套 UI 的入口。旧共享目录兼容断言只更新日报项目默认中文的阶段假设，保留原焦点/导航合同。

Owned：两公共日报页面、新 UI 文案/helper、新浏览器语言模块、共享本地 fixture、check-ai-daily-public-payload.ts、check-site-language-ui.mjs、check-ui.mjs 的 fixture 导入/兼容选择器、已证实必要的 route-pages.css、相关 frontend 规范与本轮父子任务。

Forbidden：public/server、src/utils/aiDailyPublicApi.ts、原内容/状态/产品记录、App/路由、shared language/reading hooks、SEO helper、依赖/workflows、其他任务和 worktree。回滚边界为本轮独立本地工作提交；没有生产迁移或发布步骤。
