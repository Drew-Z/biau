# Main site sitemap static route guard

## Goal

补强 `main-site:synthetic` 对 sitemap 的断言，确保主站核心公开路由、状态页和 Pet 静态展示页都在 sitemap 中，避免静态页上线但搜索入口/站点地图漏掉。

## Requirements

- 更新 `scripts/check-main-site-synthetic.mjs` 的 sitemap 检查范围。
- sitemap 检查至少覆盖 `/`、`/projects`、`/blog`、`/status`、`/pet-app-showcase/`。
- 不改变公开路由结构，不新增部署或外部服务配置。
- 保持输出 `public/status/blog-semi-synthetic.json` 的低敏 shape 不变。

## Acceptance Criteria

- [x] `npm.cmd run main-site:synthetic` 通过，并在 sitemap 缺少 `/status` 或 `/pet-app-showcase/` 时能产生 issue。
- [x] `npm.cmd run site:status` 通过，状态页继续合并主站 synthetic 状态。
- [x] 通过 `npm.cmd run lint` 和 `npm.cmd run build`。
- [x] 通过 `git diff --check` 和敏感扫描。

## Notes

- 本任务是轻量脚本回归守护，只提升现有检查覆盖率。
- 2026-07-03: `main-site:synthetic` 的 sitemap 必含路径扩展为 `/`、`/projects`、`/blog`、`/status`、`/pet-app-showcase/`。
- 2026-07-03: `npm.cmd run main-site:synthetic` 通过，输出 `7/7 public routes returned expected responses`；`npm.cmd run site:status` 已合并主站状态。
- 2026-07-03: `npm.cmd run lint`、`npm.cmd run build`、`git diff --check` 通过；敏感扫描仅命中已有公开环境变量名。
