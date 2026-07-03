# Main site public routes synthetic status

## Goal

让 `/status` 页面中的 “BIAU Port 主站 / 核心公开路由” 从 `unchecked` 变成可验证状态。新增或复用本地脚本生成 `public/status/blog-semi-synthetic.json`，检查主站公开页面、sitemap 和 robots 的可访问性，并由现有 `npm.cmd run site:status` 合并到状态页。

## Requirements

- 新增低敏 synthetic 脚本，默认检查 `SITE_STATUS_BASE_URL` 指向的公开站点。
- 检查范围包含：
  - `/`
  - `/projects`
  - `/blog`
  - `/assistant`
  - `/status`
  - `/sitemap.xml`
  - `/robots.txt`
- 输出路径为 `public/status/blog-semi-synthetic.json`，check id 使用现有 `blog-semi-public-routes`，以便 `site:status` 直接合并。
- 输出内容只能包含状态、HTTP 状态码、耗时、检测时间、低敏摘要和问题列表；不记录 cookies、headers、IP、私有后台地址、token 或模型配置。
- 当核心页面全部返回 2xx/3xx，且 sitemap/robots 可读时，该 check 为 `online`；部分非核心异常可标 `degraded`，核心路由失败为 `offline`。
- 增加 package script，便于后续自动化调用。
- 运行 `npm.cmd run site:status` 后，`public/status/site-status.json` 中 `blog-semi-public-routes` 应合并为实际 synthetic 状态。

## Acceptance Criteria

- [x] 新增主站公开路由 synthetic 脚本和 package script。
- [x] `npm.cmd run main-site:synthetic` 生成 `public/status/blog-semi-synthetic.json`。
- [x] `public/status/site-status.json` 中 `blog-semi-public-routes` 不再是 `unchecked`。
- [x] 生成 JSON 不包含 cookies、tokens、API keys、数据库连接串或私有后台地址。
- [x] 通过 `npm.cmd run site:status`。
- [x] 通过 `npm.cmd run lint` 和 `npm.cmd run build`。
- [x] 通过 `git diff --check` 和敏感扫描。

## Notes

- 这个任务不接 Plausible/Umami/Prometheus/Grafana，也不改变部署；它只是给现有状态页补一条主站自身的公开 synthetic 证据。
- Validation:
  - `npm.cmd run main-site:synthetic` passed: 7/7 public routes returned expected responses.
  - `npm.cmd run site:status` passed and merged `blog-semi-public-routes=online`.
  - Node status assertion passed for `blog-semi-public-routes=online` and Legal RAG health remaining online.
  - `npm.cmd run lint` passed.
  - `npm.cmd run build` passed with existing Vite dynamic import warnings.
  - `git diff --check` passed.
  - Sensitive scan only found environment variable names and PRD safety terms, no real secrets.
