# 跨域网站体验与项目助手缺口审计

审计日期：2026-09-10
审计范围：公共 UI、项目整理与公开助手

## 结论

公共 UI、项目注册/公开内容合同和公开助手合同没有发现新的高置信度运行时缺陷。发现一个可独立验收的工具链缺口：`scripts/check-public-links.ts` 从原始项目数据收集链接，没有复用页面使用的 `getPublishedProjectLinks()` / `getProjectCta()` 投影。

这会把已被公开界面替换为站内状态入口的 `entry` URL 继续计入公开链接巡检。例如 `legal-rag`、`chatus`、`ozon-erp` 和 `xunqiu` 的公开页面都只显示状态/文档/证据链接，但原始入口仍被巡检器请求。该问题污染巡检结果和状态诊断，不证明页面本身存在同等数量的访客可见断链。

建议创建一个独立修复子任务，仅让公开链接巡检器按公开 projection 收集目标，并为投影边界增加确定性检查。审计子任务本身不修改业务源码、公开状态或生产配置。

## 公共 UI

- 已复用并通过博客/项目发现、阅读导航、公开路由恢复、项目详情和完整公开路由矩阵；覆盖中英文、三主题和桌面/移动断点。
- `npm.cmd run check:ui:smoke` 首次失败是默认 `127.0.0.1:5174` 未启动，所有 21 组均为 `ERR_CONNECTION_REFUSED`。启动临时 Vite 服务后同一命令通过 `21/21`，没有页面断言失败。
- 现有临时截图覆盖首页、项目目录、博客目录、项目详情、状态页和公开助手桌面/移动首屏；未观察到稳定的遮挡、水平溢出或移动助手面板越界。
- `/assistant` 显示统一 404 页面；公开助手是共享浮动 widget，不存在独立助手路由，这与当前路由设计一致，未计为缺陷。

## 项目整理

- `blog:discovery-check`、`projects:discovery-check`、对应 discovery UI、`project-details:check`、`project-registry:check` 和 `status:contract` 已通过。
- 项目数据为 15 项，目录公开投影为 9 项；没有重复 id/title、孤立 publication 或未解释的 product identity。6 个互动游戏归入 `biau-playlab` 聚合产品，符合 `productRegistry.ts` 与公开 publication 设计。
- Playlab 浏览器 GET 现场验证：`https://games.playlab.eu.cc/`、`/games/`、`/games/first-tetris/` 均返回 `200`；页面包含品牌/作品文本，并发现 6 个 `play.playlab.eu.cc/*/index.html` 试玩入口。Node synthetic 的 `web=offline` 是当前 Node 网络路径的 connection reset，不能推导为站点下线。
- ERP 返回 `403` 且重定向到托管停机页，但 publication 明确为 `unchecked + login-gated`，页面 projection 已关闭直接入口；不把访问边界误改成 broken。

## 公开助手

- 知识库、public quality/agent/model/image/metrics/persistence/rate-limit/API/conversation/browser-state 检查均通过；检查使用 fixture，真实模型调用为零。
- 恢复、取消、分支、历史、引用、浏览器状态、注入防护和 public payload 边界均有确定性合同覆盖。打开 widget 的本地 API 不可用时展示既有恢复/重新准备状态，未观察到布局溢出。
- `assistant:public-migration-check` 未执行到数据库验证，原因是缺少 `PUBLIC_ASSISTANT_REVISION_TEST_DATABASE_URL`。审计不配置真实数据库，因此这是环境前置条件，不是业务缺陷。

## 唯一修复候选

稳定复现步骤：

1. 运行 `npm.cmd run public-links:check -- --json`。本轮得到 `43` 个目标、`37` 个失败；失败主要是 Node 对 `*.playlab.eu.cc` 的 connection reset，另有 ERP `403`。
2. 对 `legal-rag`、`chatus`、`ozon-erp`、`xunqiu` 调用 `getPublishedProjectLinks(findProjectPublication(id), project.links)`。四个项目的原始 `entry` URL 均不在返回值中，返回的是状态、文档或证据链接。
3. 对照 `scripts/check-public-links.ts:152-172`，当前收集器直接遍历 `heroContent.projects`、`project.detailLink`、`project.links`、正文 section links 和 visual source，没有调用公开 projection。
4. 对照 `src/components/ProjectCard.tsx:29-31`、`src/pages/ProjectDetailPage.tsx:75-77` 和 `:270-310`，公开页面实际使用的是 projection。

最小修复边界：让巡检器复用同一个 publication projection；hero action 也按 `getProjectCta()` 判断是否存在可点击外部入口；未渲染的原始 `detailLink` 不应继续被命名为 public link 目标。保留文档、仓库、证据和站内 status 链接的巡检。不要在该修复中改变 publication 状态、URL、公开数据或助手行为。

