# 站点访问与运行监察 MVP

## Goal

建立 BIAU Port 的首版“访问数据怎么看、线上站点是否健康怎么查”的工作流，让后续项目页、博客页和公开助手优化不再只靠主观判断。首版必须不依赖私有 token、不部署、不采集个人敏感信息；先提供可运行的站点健康检查脚本、隐私友好的统计接入说明，以及默认关闭的前端事件统计适配层。

## Requirements

- 访问数据说明：
  - 解释 PV、UV、来源、热门页面、设备/地区、搜索曝光/点击、事件点击分别应该从哪里看。
  - 推荐首选 Cloudflare Web Analytics / Cloudflare Pages Analytics 查看基础 PV、UV、来源和页面路径。
  - 推荐 Google Search Console / Bing Webmaster 查看搜索曝光、点击、关键词和收录问题。
  - 推荐 Umami 或 Plausible 用于项目卡片点击、外链点击、公开助手打开等产品事件；默认不接 GA4 复杂方案。
- 线上健康检查：
  - 新增无需私密凭据的 `site:monitor` 脚本。
  - 默认检查 `https://biau.playlab.eu.cc` 的首页、项目页、博客页、助手页、代表性项目详情页、代表性博客页、`sitemap.xml` 和 `robots.txt`。
  - 可通过参数或环境变量指定 base URL，便于检查预览环境或未来域名。
  - 可选检查同源站内链接；外部链接检查必须显式开启，避免默认批量请求第三方站点。
  - 输出人类可读报告；失败时退出非 0，适合本地和后续 CI/自动化调用。
- 前端事件统计适配：
  - 新增默认关闭的 analytics adapter。
  - 不写死任何 provider token、站点 ID、私有 API 地址或外部脚本。
  - 支持后续接入 Umami / Plausible 风格的 `window.umami.track` / `window.plausible`，但未配置时应静默 no-op。
  - 先埋低风险事件：项目详情打开、项目外链打开、公开助手打开、公开助手提问。
- 文档：
  - 新增 `docs/site-monitoring.md`，说明如何查看访问人数和关键数据、如何运行 `site:monitor`、哪些指标异常需要处理、哪些事项仍需人工配置。
  - 更新部署文档中的线上检查说明，指向新脚本。
- 安全边界：
  - 不提交真实统计后台 token、Cloudflare API token、Umami site id、私有 analytics endpoint、Cookie 配置或用户级标识。
  - 不新增 cookie、不采集 IP、不采集用户输入正文。
  - 不执行部署。

## Evidence

- `docs/deployment.md`: 当前站点部署在 Cloudflare Pages，线上域名为 `https://biau.playlab.eu.cc`，已有手工线上检查记录。
- `src/utils/seo.ts`: `SITE_URL` 已固定为 `https://biau.playlab.eu.cc`，可作为默认监控目标。
- `package.json`: 已有 `verify`、`check:ui`、`blog:check` 等本地质量脚本，但没有线上站点监察命令。
- `scripts/verify.mjs`: 会启动本地 preview 并跑 UI 检查，不覆盖线上 sitemap/robots/实际部署状态。
- 现有前端点击路径集中在 `HomePage.tsx`、`ProjectsPage.tsx`、`PublicAssistantWidget.tsx`，适合接入 no-op analytics adapter。

## Out of Scope

- 不在本任务中配置 Cloudflare Web Analytics、Google Search Console、Bing Webmaster、Umami 或 Plausible 的真实账号。
- 不自动创建 Cloudflare/Umami 项目，不调用 Cloudflare API。
- 不建立数据看板后端、数据库表、用户追踪或 cookie 同意弹窗。
- 不把访问统计结果展示到公开页面。
- 不部署到生产环境。

## Acceptance Criteria

- [x] `npm.cmd run site:monitor` 能在默认线上站点运行，检查核心页面、sitemap 和 robots；失败时退出非 0。
- [x] `site:monitor` 支持 `--base <url>`、`--json`、`--check-links`、`--check-external`、`--timeout <ms>` 这类基础参数或等价环境变量。
- [x] `src/utils/analytics.ts` 提供默认 no-op 的事件统计适配层，不配置 provider 时不抛错、不发送请求。
- [x] 首页项目卡、项目集卡、公开助手打开和公开助手提问接入事件统计，但不采集用户输入正文。
- [x] `docs/site-monitoring.md` 说明访问人数/数据查看方式、推荐工具、脚本用法、人工配置 gate 和隐私边界。
- [x] `docs/deployment.md` 的线上检查记录指向 `npm.cmd run site:monitor`。
- [x] 验证通过：`npm.cmd run site:monitor`、`npm.cmd run blog:check`、`npm.cmd run lint`、`npm.cmd run build`、`git diff --check` 和敏感信息扫描。

## Validation Log

- `npm.cmd run site:monitor`：通过，默认线上站点 11/11 检查通过。
- `npm.cmd run site:monitor -- --json`：通过，输出 `ok: true` JSON。
- `npm.cmd run site:monitor -- --check-links --json`：通过，同源链接检查通过，外链未默认检查。
- `npm.cmd run site:monitor -- --base biau.playlab.eu.cc --timeout 15000 --max-links 5 --json`：通过，验证 base/timeout/max-links 参数解析。
- `npm.cmd run blog:check`：通过。
- `npm.cmd run lint`：通过。
- `npm.cmd run build`：通过；保留既有 `INEFFECTIVE_DYNAMIC_IMPORT` 警告，未发现本任务引入的构建失败。
- `git diff --check`：通过，仅输出 Windows 换行提示。
- 敏感信息扫描：仅命中 `.env.example` / 文档中的占位变量或“不要提交 token”等说明性文字，未发现真实密钥、私有 IP 或连接串。

## Notes

- 推荐决策：首版采用“Cloudflare/搜索平台看基础流量 + 本地脚本查站点健康 + no-op analytics adapter 预留事件”的组合。这样能马上提高运维可见性，又不需要在仓库里落任何私有配置。
