# 站点访问与运行监察

这个文档记录 BIAU Port 第一版访问数据和站点健康监察方式。目标是先知道“有没有人来、从哪里来、看了什么、站点有没有坏”，再决定后续项目页、博客和助手怎么优化。

## 访问人数怎么看

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

## 站点健康怎么查

本地或 CI 可以运行：

```powershell
npm.cmd run site:monitor
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
- 把访问统计数据公开展示到站点上。
