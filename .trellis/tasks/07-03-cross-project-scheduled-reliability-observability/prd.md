# 跨项目可靠性定时观测与状态页闭环

## Goal

把当前“手动运行 synthetic 脚本”的状态推进到可定时、可查看、可解释的跨项目可靠性观察体系。

## Requirements

- 覆盖项目：
  - 主站 BIAU Port。
  - 公开助手 API。
  - Legal RAG。
  - ERP。
  - Xunqiu 展示站与后端。
  - Pet 展示页。
  - Playlab 游戏展示站。
- 状态页要解释：
  - 哪些检查是 live check。
  - 哪些是静态/文档检查。
  - 哪些需要人工 gate。
  - 最近一次检查时间和结果来源。
- 技术路线保持分层：
  - 静态主站访问分析：Cloudflare + Search Console + Umami/Plausible 二选一。
  - 后端工程可观测性：Prometheus/Grafana/ARMS/OpenTelemetry 等，优先用于常驻服务。
  - 合成检查：Node scripts / GitHub Actions / 平台定时任务。
- 不在公开页面暴露敏感 URL、token、账号密码或内部错误详情。

## Acceptance Criteria

- [x] 定义每个项目的核心检查项、运行方式和状态落点。
- [x] 至少一个定时执行方案落档，例如 GitHub Actions、Cloudflare Cron、Render cron 或本地计划任务。
- [x] 状态详情页能跳转到每个项目的详细状态路由，而不是只在单页内锚点跳转。
- [x] synthetic 结果能被主站状态数据或文档消费，避免人工手填口径漂移。
- [x] 手动 gate 与真实故障在状态显示上区分清楚。

## Notes

- 推荐第一步：盘点现有 `scripts/check-*-synthetic.mjs`，决定先用 GitHub Actions 还是 Cloudflare Cron/外部监控来跑。
- 2026-07-05：新增 `npm.cmd run reliability:check`，默认顺序运行主站、Legal RAG、ERP、Xunqiu、Pet synthetic、`site:status` 和 `site:monitor --json`，并写入 `public/status/reliability-suite.json`。
- 2026-07-05：新增 `.github/workflows/reliability-check.yml`，支持手动和每日定时运行，上传 `public/status/*.json` artifact，不自动提交生成状态文件。
- 2026-07-05：验证通过 `npm.cmd run reliability:check`、`npm.cmd run reliability:check -- --strict`、`npm.cmd run site:status`、`npm.cmd run docs:observability-check`、`npm.cmd run lint`、`npm.cmd run build`、`git diff --check`。
