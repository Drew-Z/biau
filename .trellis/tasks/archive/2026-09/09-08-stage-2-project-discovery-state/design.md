# 项目分组状态设计

`src/utils/projectDiscovery.ts` 维护三组键的类型、`parseProjectGroupSearch()`、`serializeProjectGroupSearch()` 和 `getProjectListHref()`。解析只消费 `group` 的首值，未知值回 ai；序列化省略默认组，返回路径固定为 `/projects`。不新增对象存储、后端或通用状态框架。

`ProjectsPage` 从 Router location 派生当前移动分组，保留既有 matchMedia 对布局的判断及原分类/排序。规范化 URL 使用 replace；事件发生时读取当前 browser search 判断是否真的更换分组，避免 Router 过渡期间重复写历史。跨断点只改变面板可见性，不清空选择。

目录打开详情携带同一规范化 search。`ProjectDetailPage` 的正常和缺失返回使用固定目录地址，相关项目链接沿用 search。公开体验/状态证据以及跨到博客的延展阅读不携带项目参数。无条件的旧详情链接仍返回 `/projects`。

检查分为小型确定性 URL 合同和真实 Playwright 导航。浏览器采用现有 network guard，仅允许本 preview origin，`/api/**` 明确 fixture，检查不触达生产服务。24 组宽度/主题/语言矩阵覆盖三种分组；另外核验 720/721 断点。检查接入现有 `check-ui`，并提供独立入口；旧的 `checkMobileProjectCatalog()` 和 `catalog-projects` 组验证内容与布局未退化。

范围只改变项目分组的路由状态。滚动/焦点问题已有父任务 8 次基线，但不在本项中混合实现；其恢复协议在下轮单独定义。回滚点为本项独立代码提交，默认目录及详情旧地址始终有效。
