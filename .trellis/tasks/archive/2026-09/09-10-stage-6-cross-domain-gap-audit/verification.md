# 审计验证记录

日期：2026-09-10

## 通过

- `npm.cmd run blog:discovery-check`：8 groups / 25 isolated fixture posts。
- `npm.cmd run projects:discovery-check`：6 groups。
- `npm.cmd run blog:discovery-ui`：24 viewport/theme/language groups，1152 contrast samples。
- `npm.cmd run projects:discovery-ui`：24 viewport/theme/language groups，2 breakpoint groups。
- `npm.cmd run reading:navigation-ui`：matrix 48，normal motion 4，edge 22。
- `npm.cmd run public-routes:ui`：matrix 48，encoded 4，status 18，model calls 0。
- `npm.cmd run check:ui:smoke`：在 `http://127.0.0.1:5174` 临时本地 Vite 服务上 `21/21` 通过；服务已停止。
- `npm.cmd run ai-daily:public-payload-check`：27 invalid、3 valid、19 UI error contracts 通过。
- `npm.cmd run blog:knowledge-check`：4 public knowledge posts。
- `npm.cmd run blog:project-notes-check`：6 public project notes。
- `npm.cmd run project-details:check`、`project-registry:check`、`status:contract`、`analytics:check`：通过。
- `npm.cmd run assistant:kg-check`：31 docs、61 chunks、166 entities、231 relations、26 route suggestion cases。
- `assistant:public-quality-check`、`assistant:public-agent-check`、`assistant:public-model-check`、`assistant:public-image-check`、`assistant:public-metrics-check`、`assistant:public-persistence-check`、`assistant:public-rate-limit-check`、`assistant:public-api-check`、`assistant:public-conversation-check`、`assistant:public-browser-state-check`：通过。
- `git diff --check`：通过；仅提示现有 task JSON 的换行转换。
- Playwright 浏览器 GET：Playlab 首页、游戏目录和 First Tetris 详情均 HTTP 200，页面文本和试玩入口存在。

## 有边界的失败或阻塞

- `npm.cmd run public-links:check -- --json`：43 个目标中 37 个失败。Node `HEAD/fetch` 对 Playlab 域名持续 `connection_error`，而同一观察窗口的浏览器 GET 返回 200；该网络差异按现有规范记录，不能改写公开状态快照。
- ERP 外链最终 HTTP 403；其 publication 已是 `unchecked + login-gated`，属于已知访问边界。
- `npm.cmd run playlab:synthetic`：`web=offline, mobile=unchecked, playable=0/0, resources=0/0`，仅因 Node synthetic 无法通过当前网络路径获取页面；未写入 snapshot。
- `npm.cmd run assistant:public-migration-check`：被缺少 `PUBLIC_ASSISTANT_REVISION_TEST_DATABASE_URL` 阻塞；没有连接真实数据库。
- `npm.cmd run check:ui:smoke` 的第一次运行因 5174 无服务而得到 21 个 `ERR_CONNECTION_REFUSED`；按正确端口启动临时服务后重跑通过，第一次结果不计入 UI 回归结论。

## 保护边界

- 未修改 `src/`、`public/status/blog-semi-synthetic.json`、公开 AI Daily payload、生产配置、助手 relay 或 Feed/Cron。
- 未调用真实模型、未登录外部服务、未写入公共状态 snapshot。
- 临时截图目录 `C:\Users\zhang\AppData\Local\Temp\blog-semi-cross-domain-audit-20260910` 待本子任务交付前清理。

