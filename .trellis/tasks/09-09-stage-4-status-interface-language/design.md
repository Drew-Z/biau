# 状态公共界面语言设计

新增 `src/data/statusInterfaceCopy.ts`，由状态页及分区导航消费。中文状态/分层/类别复用 `siteStatusView` 原映射，英文只覆盖 label/hint/title/description；tone/code 继续从原映射派生。六个总览 ID 与六个详情 ID 保持静态，翻译通过 ID 查表，不能从文字生成导航目标。该字典只由已有 lazy 状态路径使用，不进入首页入口数据。

`siteStatusView` 仅扩展三个既有 formatter 的可选 `SiteLanguage = 'zh'` 参数，使用共享语言标签和同一日期格式选项。中文默认、数字单位、Invalid Date 与缺值分类保持；`parseEvidenceFreshness` 保留原签名和中文默认投影。新鲜度的四个标签在 UI 映射英文，原 evidence、解析出的 ageText 和时间戳均不改写、不重新推断新鲜度。

状态页面读取 `useSiteLanguage`，根节点声明当前语言，作者及原证据节点单独声明中文；原始 loadError 使用 `lang=""` 保留未知语言，固定提示前缀按偏好。聚合、队列、note 去重和所有 href 保持既有 view/helper。页面只根据已有 type/status 选择文案，UI 翻译不参与状态判断。

分区导航的 scroll/resize effect 仍依赖静态 ID 列表且不依赖语言；选择状态不重建。详情传入按当前语言标注的目录项目及 itemsLanguage，保留原 ID、父指南状态和移动工具互斥。切换时产生的正常文本重排不作为滚动重置来实现，也不修改 reading hook。

验证增加独立状态语言浏览器模块，并由既有 `language:ui`/完整 `check:ui` 调用；旧状态/日报目录兼容用例只更新状态目录的阶段性中文假设，日报保持原文。状态 fixture 同时覆盖四类 entry、五类 reliability 和证据新鲜度，保存原文/目标/计数快照，语言切换与刷新分别验证。延迟状态请求测试证明 fallback 可读且语言切换不增加请求；失败保留原错误及静态数据。单独检查三个 overview 判断分支，不能把在线入口等同于全能力可用。

Owned：新状态 UI 字典、SiteStatusPage、SiteStatusDetailPage、StatusSectionNavigator、siteStatusView 的三个 formatter、check-status-contract.ts、新状态语言检查及 check-site-language-ui.mjs、必要且已证实的 route-pages.css、相关 frontend 规范、本子任务和父任务记账。既有 check-ui.mjs 只在发现旧语言选择器与实际场景不匹配时精确调整，不删原状态行为检查。

Forbidden：所有 public/server、statusTargets/portfolio/hero/productRegistry/siteLinks 原数据、原 view 的状态合并/聚合/队列/parser、useSiteStatus/语言/阅读 hook、App/路由、SEO/助手知识和生成产物、依赖、workflows、其他任务/worktree。若出现业务回归，以本轮独立工作提交为回滚边界。
