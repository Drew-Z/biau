# 目录界面双语设计

## 文案与状态

沿用 `SiteLanguage`、`SITE_LANGUAGE_TAGS` 与只读 `useSiteLanguage`。新建小型 `src/data/catalogCopy.ts` 存放两类目录共享的界面字典、数量格式与分组名称；公开文章与项目源数据不改动。`getBlogEmptyState` 增加默认 `zh` 的可选 language 参数，英文分支与现有栏目一一对应，原调用保持原结果。

BlogPage/ProjectsPage 的 main 声明实际界面语言，卡片的标题、摘要、标签和原始元数据明确 `lang="zh-CN"`。双语栏目使用现有 titleZh/titleEn；当前语言为主标题，另一语言为副标题，计数按当前语言格式化。原生 select 继续同时显示两种身份，并保持稳定 option value。英文固定 eyebrow 用 lang=en。

界面文案变化不进入 URL/hook 依赖，不增加 route key，不改变现有数据集合与 callbacks。搜索框仍保留原 transient draft 生命周期。普通阅读/详情动作消费字典；项目 publication 链接容器保持 lang=zh-CN，保留原有标签、解释、href 与权限判断，下一共享文案阶段再统一接入首页/详情。

## 验证与布局

扩充原 language 专项：按语言断言两类目录的语义、可访问名称、计数和操作；切换前后比较原内容、URL、历史与发布入口；覆盖空栏目、无搜索结果、原文标记和截图。扩充原博客语义/对比度矩阵到两种语言，保留全部按钮、Tab/Shift+Tab、720/721 分界与真实背景采样。项目专项刷新后先断言语言，不再用选择函数掩盖丢失偏好。

先在当前原 build 上运行新增断言，确认失败来自英文目录文案缺失。实施后运行相关专项与最终完整 UI（含阅读返回）。仅在真实浏览器发现英文裁切时调整目录内的现有 CSS，不能隐藏内容或降低字体/对比度门禁。

## 文件边界与回滚

Owned：五个目录/卡片组件、catalogCopy.ts、blogShared.ts、相关语言/目录 UI 检查、必要的 catalog/flow CSS、frontend 规范、本子任务与父任务记录。Forbidden：其他业务组件、portfolio/projectPublication 数据、public、server、依赖、工作流及其他任务。

每轮作为独立本地提交；回滚本轮即可恢复原目录文案，不影响第 11 轮共享偏好。保留原有未跟踪资料与 5183 preview，浏览器验证使用自有 preview 与 Temp 证据目录。
