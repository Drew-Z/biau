# 可观测性工具决策矩阵与落地清单 - Implement

## Steps

- [x] 启动 child task，加载当前任务和相关 spec。
- [x] 更新 `docs/observability-strategy.md`：
  - 增加分层模型。
  - 增加工具决策矩阵。
  - 补充“要不要一起做”的判断。
  - 补充 ARMS / Prometheus / Grafana / OpenTelemetry / Sentry / Faro / Langfuse 的推荐时机。
- [x] 更新 `docs/site-monitoring.md`：
  - 保留快速入口。
  - 增加四类站点数据工具差距的简明对照。
  - 明确 Plausible / Umami 二选一。
- [x] 增加离线校验脚本，检查可观测性文档中关键工具、推荐路线和人工 gate 仍存在。
- [x] 在 `package.json` 增加可执行脚本。
- [x] 运行验证并修复失败。
- [ ] 更新任务验收记录、归档 child、更新父任务和 journal、提交并推送。

## Validation

```powershell
npm.cmd run docs:observability-check
npm.cmd run lint
npm.cmd run build
git diff --check
```

另外对 changed files 运行敏感信息扫描，人工检查 `key`、`token`、`secret`、`dsn`、`DATABASE_URL`、`Bearer`、`sk-` 等命中。

## Validation Log

- `npm.cmd run docs:observability-check`：通过。
- `npm.cmd run lint`：通过。
- `npm.cmd run build`：通过；仅出现既有 Vite/Rolldown dynamic import 和 plugin timing 警告。
- `git diff --check`：通过。
- changed files 敏感信息扫描：无命中。

## Rollback

- 文档改动可通过本 task 的 diff 单独回退。
- 新增脚本只做只读检查，不产生运行时副作用。
