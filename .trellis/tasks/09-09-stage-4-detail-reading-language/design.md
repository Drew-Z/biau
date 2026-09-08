# 详情语言设计

沿用 `useSiteLanguage`、`SiteLanguage` 与 `SITE_LANGUAGE_TAGS`。新增小型 `detailCopy.ts` 保存固定公共阅读字典；项目章节的中文映射复用 `portfolio.ts`，英文按现有 key 投影，不修改 Studio/导出合同。`getRelatedProjectsTitle` 增加默认中文的可选语言参数，只翻译输出，不触碰推荐规则。

构建验证发现字典对 portfolio 的运行时导入使入口 JS 从 300449 增长到 423376 bytes；现改为字典仅导入类型，ProjectDetailPage 在既有 portfolio 导入处选择中英章节映射，复验入口为 300457 bytes。浏览器初次测得 320px 英文文章缺失页返回按钮高 40px；两类详情使用相同的缺失按钮结构，以 `.detail-missing--catalog` 精确标记这两类状态，在既有 720px 媒体查询补齐 44px。最终矩阵验证文章和项目返回均通过，不扩散至其他缺失页。

`DetailReadingGuide` 消费共享偏好，默认公共标签在字典中选择。新增 `itemsLanguage`（默认 zh，兼容尚未翻译的状态/日报）和 `DetailReadingItem.language` 可选覆盖；根目录与公共控件标记当前语言，当前章节及每个目录标签独立标记实际语言。文章固定标签使用当前语言，作者章节覆盖 zh；项目固定阅读标签使用当前语言。状态页只接入自定义“状态导航”的双语标签，原章节/正文不变。

详情根节点标记当前界面语言，作者文本及图像 alt 显式中文。`ResponsiveImage` 已转发原生 img 属性，直接使用 lang，无需改动该组件。publication 输出、源链接和说明仍保持中文。固定栏目身份使用现有 titleZh/titleEn；原图 href、rel、loading、章节 id、阅读 callbacks 均保持。不要把语言加入内容加载 effect、URL 或阅读 hook 的重置依赖。

检查扩充现有 `check-site-language-ui.mjs` 并由 `checkSiteLanguage` 接入现有完整 UI：详情双语、固定/作者目录语言、内容与动作快照、DOM 连续性、history、目录键盘/Escape/锚点、延迟正文加载及缺失返回、其他目录调用方的中文项。等待字体、有限动画和 eager 图片稳定后测量布局；进度可随文本布局重新测量，不要求翻译前后百分比字节相同。必要时将旧 UI 的“载入中”判断改为现有语义就绪标记，不放宽门禁。

Owned：`src/data/detailCopy.ts`、`src/data/projectRecommendations.ts`（标题输出）、BlogPostPage、ProjectDetailPage、DetailReadingGuide、SiteStatusDetailPage（仅目录 label 接入）、`scripts/check-site-language-ui.mjs`、必要的既有 UI 就绪断言、实际证据支持的 route-pages CSS、frontend 规范、本子任务与父任务资料。

Forbidden：portfolio/projectPublication/blog 原始内容与 curation、public/server、依赖、工作流、路由/阅读恢复 hooks、其他任务与历史 worktree。每轮独立提交可回退，本轮回退不撤销目录语言交付。验收继续使用自有 5190 preview，证据新建在系统 Temp 中。
