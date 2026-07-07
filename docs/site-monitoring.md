# 站点访问与运行监察

这个文档记录 BIAU Port 第一版访问数据和站点健康监察方式。目标是先知道“有没有人来、从哪里来、看了什么、站点有没有坏”，再决定后续项目页、博客和助手怎么优化。

更完整的工具选型、Prometheus / Grafana / OpenTelemetry / ARMS / Sentry / Langfuse 路线和人工配置边界见 `docs/observability-strategy.md`；跨项目人工队列见 [`docs/manual-gates.md`](./manual-gates.md)。

## 访问人数怎么看

先按这四类数据分开看：

| 工具 | 最适合回答 | 不适合回答 | 当前结论 |
|---|---|---|---|
| Cloudflare Web Analytics / Pages Analytics | 总访问量、热门路径、来源、地区、设备、基础性能 | 搜索关键词、站内按钮转化、后端错误 | 先启用，用作主站基础流量入口 |
| Search Console / Webmaster | 搜索曝光、点击、查询词、收录和 sitemap 状态 | 全站真实访问人数、站内点击、接口健康 | 必须配置，用来看 SEO 入口 |
| Umami 或 Plausible | 项目卡片、外链、助手入口、提问次数等产品事件 | 后端延迟、数据库、模型调用失败 | 二选一，不建议同时启用 |
| Prometheus / Grafana / ARMS | 后端请求量、错误率、延迟、依赖健康和告警 | 访客统计、搜索表现、产品点击事件 | 后端服务再接，静态主站不优先 |

推荐第一阶段组合是：Cloudflare + Search Console + Plausible 或 Umami 二选一 + `site:monitor`。这个组合能覆盖“有没有人来、搜索引擎有没有发现、访客点了什么、站点有没有坏”，同时不会引入完整工程监控栈的维护负担。

### Cloudflare Web Analytics / Pages Analytics

适合先看基础流量：

- PV：页面浏览量。
- UV：独立访客数。
- Referrers：来源站点和直接访问。
- Top pages：热门路径，例如 `/projects/legal-rag`、`/blog`。
- Countries / devices / browsers：地区、设备和浏览器分布。

建议先启用 Cloudflare 的隐私友好统计能力。统计脚本、站点 token 或 Cloudflare API token 都不应该写入仓库；需要在 Cloudflare 后台或 Pages 环境里配置。

### Search Console / Webmaster

适合看搜索表现：

- 搜索曝光量。
- 搜索点击量。
- 查询词。
- 被收录页面。
- sitemap 读取状态。
- 移动端或结构化数据问题。

它不能代表全部访问人数，但能回答“哪些页面正在被搜索引擎发现”。

### Umami / Plausible

适合看产品事件：

- 首页项目卡片进入详情。
- 项目集卡片进入详情。
- 项目外链点击。
- 公开助手打开。
- 公开助手提问次数。

本仓库已经提供默认关闭的 `src/utils/analytics.ts` 适配层。只有设置 `VITE_ANALYTICS_PROVIDER=umami` 或 `plausible`，并由站点管理员自行注入对应 provider 脚本后，事件才会发送。未配置时不会采集数据。

Plausible 和 Umami 建议二选一：Plausible 更适合省心的轻量托管统计，Umami 更适合自托管和后续扩展。Cloudflare Web Analytics 和 Search Console 不替代它们；Cloudflare 看基础访问和路径，Search Console 看搜索入口，Plausible/Umami 看站内产品事件。同一个站点同时接 Plausible 和 Umami 会重复采集并带来数据口径对齐成本。

### Prometheus / Grafana / ARMS

这些属于工程可观测性，不是访问人数统计工具。它们更适合 assistant API、ERP、Legal RAG、Xunqiu 后端、Pet Community API 等常驻服务，用来观察请求量、错误率、延迟、依赖健康和告警。当前主站是静态站，优先保持 Cloudflare + Search Console + Plausible/Umami 的轻量组合。

如果未来要做完整工程可观测性，优先顺序是：

- assistant API 和其他后端先暴露低敏、默认关闭的 `/metrics`。
- 再选择 Prometheus + Grafana，或托管 Prometheus/Grafana/ARMS。
- 多服务链路复杂后再接 OpenTelemetry。
- 真实用户前端错误影响体验后再接 Sentry 或 Grafana Faro。
- AI 助手调用量稳定后再评估 Langfuse、Helicone、Phoenix 或 OpenTelemetry GenAI。

## 站点健康怎么查

本地或 CI 可以运行：

```powershell
npm.cmd run reliability:check
npm.cmd run site:monitor
```

`reliability:check` 是跨项目可靠性总入口，会顺序运行主站、Legal RAG、ERP、Xunqiu、Pet、BIAU Playlab 的 synthetic 检查，再生成 `public/status/site-status.json` 和 `public/status/reliability-suite.json`。默认会继续执行后续步骤并写出套件报告；需要让 CI 在故障时失败时使用：

```powershell
npm.cmd run reliability:check -- --strict
npm.cmd run reliability:check -- --timeout 15000
npm.cmd run reliability:check -- --skip site-monitor
```

- `--strict`：任一步骤失败或报告出现失败状态时，命令最终返回非 0。
- `--timeout`：传给每个 synthetic / status / monitor 脚本的请求超时时间，单位毫秒。
- `--skip`：跳过某个步骤，支持多次传入或逗号分隔，例如 `--skip site-monitor,pet,playlab`。
- `public/status/reliability-suite.json` 只保存低敏摘要，不保存环境变量、API base URL、token、原始 stdout/stderr 或外部平台后台链接。

主站 synthetic 默认只检查公开页面、sitemap、robots 和同域
`/api/health`。它不会默认向 `/api/chat/public` 发送问题，避免在公开助手
已接入真实模型时变成无意的模型测活。只有已经批准一次真实内容任务后，才使用：

```powershell
npm.cmd run main-site:synthetic -- --assistant-chat
$env:MAIN_SITE_SYNTHETIC_ASSISTANT_CHAT='1'; npm.cmd run main-site:synthetic; Remove-Item Env:\MAIN_SITE_SYNTHETIC_ASSISTANT_CHAT
```

没有这个显式 opt-in 时，公开助手检查会记录为 `unchecked`，表示 health
可读但 live chat/citation/model 状态未检查。

本地 `vite preview` 只验证静态页面、sitemap 和 robots 时，可以显式跳过同域
assistant Function 检查，避免把本地没有 `/api/health` 误记成线上故障：

```powershell
npm.cmd run main-site:synthetic -- --base http://127.0.0.1:4176 --skip-assistant-api
```

默认检查：

- `https://biau.playlab.eu.cc/`
- `/projects`
- `/blog`
- `/assistant`
- `/projects/legal-rag`
- `/projects/ozon-erp`
- `/projects/biau-playlab`
- `/projects/xunqiu`
- `/blog/legal-rag-review`
- `/sitemap.xml`
- `/robots.txt`

常用参数：

```powershell
npm.cmd run site:monitor -- --base https://biau.playlab.eu.cc
npm.cmd run site:monitor -- --json
npm.cmd run site:monitor -- --check-links
npm.cmd run site:monitor -- --check-external
npm.cmd run site:monitor -- --timeout 15000
```

- `--base`：检查指定域名或预览环境。
- `--json`：输出 JSON，便于后续 CI 或自动化解析。
- `--check-links`：检查核心页面里发现的同源链接。
- `--check-external`：显式检查外部链接；默认关闭，避免无意中批量请求第三方站点。
- `--timeout`：单请求超时时间，单位毫秒。

脚本失败会返回非 0，适合后续放进 GitHub Actions、定时器或手动发布检查。

## 事件统计边界

当前埋点只记录低敏事件：

| 事件 | 触发位置 | 字段 |
|---|---|---|
| `project_detail_open` | 首页项目卡、项目集卡 | `source`、`projectId` |
| `project_external_open` | 首页项目外链按钮 | `source`、`targetHost` |
| `public_assistant_open` | 公开助手浮窗 | `source` |
| `public_assistant_question` | 公开助手提问 | `source`、`questionLength` |

不会记录：

- 用户输入正文。
- IP。
- Cookie。
- 用户账号。
- 私有 token。
- 数据库连接串。
- 管理后台地址。

## 异常处理建议

- `site:monitor` 首页或核心页面失败：先检查 Cloudflare Pages 最新部署是否成功。
- `sitemap.xml` 或 `robots.txt` 失败：运行 `npm.cmd run sitemap:generate`，再检查 `public/` 产物。
- 某个项目详情页失败：确认 React Router 回退 `_redirects` 和对应项目 id 是否仍存在。
- Search Console 收录异常：先提交 sitemap，再检查 canonical 和 meta description。
- 访问数低但外链点击高：项目页可能足够有效，后续优化应增加更多类似入口。
- 访问数高但详情页停留少：需要检查首页文案、项目摘要和卡片跳转是否足够清晰。

## 人工配置 Gate

这些操作需要人工确认后再做：

- 启用 Cloudflare Web Analytics。
- 添加 Umami / Plausible 站点和脚本。
- 配置 Google Search Console / Bing Webmaster 所有权验证。
- 把 `site:monitor` 放进 GitHub Actions、外部定时器或告警平台。
- 开启 assistant API 的 `METRICS_ENABLED` 并配置 Prometheus / Grafana / ARMS 抓取。
- 添加 Sentry、Grafana Faro 或其他真实 RUM / 错误监控脚本。
- 把访问统计数据公开展示到站点上。
