# 可观测性二期选型与路线图

## Goal

把“访问人数统计”和“工程可观测性”拆成清晰、可执行的二期路线，避免把 Cloudflare/Search Console/Umami/Plausible、ARMS、Prometheus、Grafana、OpenTelemetry、Sentry 等工具混在一起盲目接入。首版落地应保持低风险：补充项目级可观测性决策文档，更新站点监察说明，并给当前 assistant API 增加默认关闭、无敏感标签的 Prometheus `/metrics` 预留接口。

## Confirmed Facts

- `docs/site-monitoring.md` 已记录 Cloudflare Web Analytics、Search Console / Webmaster、Umami / Plausible 和 `site:monitor` 的首版使用方式。
- `src/utils/analytics.ts` 已提供默认 no-op 的前端事件适配层，支持 `umami`、`plausible` 和 `debug`。
- `server/src/app.ts` 当前只有 `/health`，没有 `/metrics`。
- `docs/deployment.md` 已记录 assistant API 的最小接口列表和 Render/Aiven 部署建议。
- 官方资料要点：
  - Cloudflare Web Analytics 是 privacy-first 的网站访问分析，用于查看访客体验和页面性能。
  - Google Search Console Performance report 查看 Google Search 的 clicks、impressions、CTR、position，并可按 query/page/country 等维度分组。
  - Umami 是开源隐私友好的网站分析平台，支持 pageviews、visitors、referrers、devices、custom events、funnels、journeys、goals 和 API。
  - Plausible 是隐私友好、无 cookie、轻量脚本的网站分析工具，主打易读面板、goals 和 API。
  - Prometheus 是数值型时序指标与告警工具，适合服务请求量、错误率、延迟和资源等工程指标，不适合当作精确计费或访客分析唯一来源。
  - OpenTelemetry 是 vendor-agnostic 的 traces/metrics/logs 生成、采集和导出标准，本身不是存储或看板后端。
  - Grafana 用于查询、可视化和告警 metrics/logs/traces；Grafana Alloy 是兼容 OpenTelemetry 和 Prometheus 的现代采集器。
  - Alibaba Cloud ARMS 覆盖应用监控、浏览器/RUM、托管 Prometheus、托管 Grafana、托管 OpenTelemetry、合成监控和告警，适合云上托管形态，不应作为当前静态主站的默认复杂前置。

## Requirements

- 新增一份项目可观测性策略文档，说明：
  - 访问分析和工程可观测性的边界。
  - Cloudflare Web Analytics、Search Console、Umami、Plausible 的差异、关系和推荐组合。
  - ARMS + Prometheus + Grafana 与当前站点访问分析工具的关系。
  - OpenTelemetry、Grafana Alloy、Sentry、Grafana Faro、LLM observability 等后续可选方向。
  - 当前项目为什么不应一次性“全接”，以及推荐分阶段路线。
- 更新 `docs/site-monitoring.md`：
  - 链接新策略文档。
  - 明确 Plausible / Umami 二选一，Cloudflare 和 Search Console 不与它们互相替代。
  - 明确 Prometheus / Grafana 应优先用于 assistant API、ERP、Legal RAG、Xunqiu 后端等服务，而不是纯静态主站首要入口。
- 为 assistant API 增加默认关闭的 Prometheus `/metrics` 预留能力：
  - 新增 `METRICS_ENABLED` 环境开关，默认关闭。
  - 关闭时 `/metrics` 返回 `404`，避免误以为生产已暴露指标。
  - 开启时输出 Prometheus text exposition 格式。
  - 指标只能包含低敏、低基数数据：总请求数、响应状态类别、路由模板、方法、请求耗时 bucket、进程启动时间等。
  - 不记录 IP、用户输入正文、token、member id、session id、完整 URL query、数据库连接串或外部模型地址。
  - `/health` 行为保持不变。
- 更新部署文档中的 assistant API 接口和可观测性说明。
- 不配置真实 Cloudflare / Search Console / Umami / Plausible / ARMS / Prometheus / Grafana / Sentry 账号或 token。
- 不部署，不创建云资源，不把 metrics endpoint 加入公开 scrape 任务。

## Acceptance Criteria

- [x] `docs/observability-strategy.md` 说明工具差异、推荐路线、人工 gate 和后续项目范围。
- [x] `docs/site-monitoring.md` 明确四类访问工具差异，并指向工程可观测性策略。
- [x] `docs/deployment.md` 记录 `METRICS_ENABLED` 和 `/metrics` 的默认关闭策略。
- [x] `.env.example` 增加 `METRICS_ENABLED=false` 占位，不包含真实 endpoint/token。
- [x] assistant API 默认情况下 `/metrics` 返回 `404`，`server:smoke` 保持通过。
- [x] 设置 `METRICS_ENABLED=true` 后 `/metrics` 返回 Prometheus text 格式，并包含低敏指标。
- [x] 验证通过：`npm.cmd run server:build`、`npm.cmd run server:smoke`、`npm.cmd run lint`、`npm.cmd run build`、`git diff --check` 和敏感信息扫描。

## Validation Log

- `npm.cmd run prisma:validate`：通过。
- `npm.cmd run server:build`：通过。
- `npm.cmd run server:smoke`：通过，默认 `/metrics` 为 404。
- `$env:METRICS_ENABLED='true'; npm.cmd run server:smoke`：通过，开启后验证 `/health` 请求计数出现在 `/metrics`。
- `npm.cmd run lint`：通过。
- `npm.cmd run build`：通过；保留既有 `INEFFECTIVE_DYNAMIC_IMPORT` 警告。
- `git diff --check`：通过，仅输出 Windows 换行提示。
- 敏感信息扫描：仅命中 `.env.example` / 文档中的占位变量或“不要提交 token”等说明性文字，未发现真实密钥、私有 IP 或连接串。

## Notes

- 人工 gate：启用真实分析平台、Sentry DSN、ARMS、托管 Prometheus/Grafana、CI/定时器 scrape、生产部署。
- 推荐路线：主站访问分析先用 Cloudflare + Search Console + Plausible/Umami 二选一；后端项目再逐步接 Prometheus/OpenTelemetry/Grafana。
