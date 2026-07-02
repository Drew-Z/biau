# 可观测性工具决策矩阵与落地清单

## Goal

把站点访问分析、SEO 数据、产品事件、前端错误、后端工程指标、LLM 调用观测这些概念拆清楚，形成访客官网当前阶段可执行的工具决策矩阵和落地清单。让后续接入 Cloudflare、Search Console、Umami/Plausible、Prometheus/Grafana、ARMS、Sentry、OpenTelemetry 或 Langfuse 时，不会混淆工具角色、重复采集或误把真实 token / 私有运营数据写入仓库。

本任务只做公开文档和离线校验，不启用任何真实第三方站点配置，不提交任何密钥、站点 token、dashboard URL、生产 scrape URL 或真实运营数据。

## Confirmed Facts

- 当前主站是 React + Vite 静态官网，部署在 Cloudflare Pages；`docs/deployment.md` 已记录 Cloudflare Pages、助手 API 和默认关闭的 `METRICS_ENABLED`。
- `docs/site-monitoring.md` 已有站点访问与运行监察 MVP，说明 Cloudflare、Search Console、Umami/Plausible、Prometheus/Grafana/ARMS 的基本边界。
- `docs/observability-strategy.md` 已有第一版策略，建议分阶段推进，并把真实平台配置列为人工 gate。
- `src/utils/analytics.ts` 已提供默认关闭的 analytics adapter，支持 `none`、`debug`、`umami`、`plausible`。
- assistant API 已有默认关闭的 Prometheus `/metrics` 端点；`.trellis/spec/backend/observability-guidelines.md` 已规定低敏标签和禁止写入 metrics/logs/traces 的字段。
- 用户关心的问题是：ARMS + Prometheus + Grafana、Plausible、Umami、Cloudflare、Search Console 的区别和关系；是否应该一起做；有没有更新的可观测技术；项目是否需要 Prometheus 或其他方案。

## Requirements

- 补充一个可直接阅读的工具决策矩阵，覆盖：
  - Cloudflare Web Analytics / Pages Analytics。
  - Google Search Console / Bing Webmaster。
  - Umami。
  - Plausible。
  - Prometheus。
  - Grafana。
  - ARMS。
  - OpenTelemetry。
  - Sentry 或 Grafana Faro。
  - Langfuse / LLM observability。
- 明确这些工具之间的关系：
  - Cloudflare / Search Console / Umami/Plausible 属于访问分析、SEO 和产品事件层。
  - Prometheus / Grafana / ARMS / OpenTelemetry 属于工程可观测性层。
  - Sentry / Grafana Faro 属于前端真实用户错误和性能体验层。
  - Langfuse 等属于 LLM 应用观测、prompt、成本、延迟和质量评估层。
- 明确推荐路径：
  - 当前主站先做 Cloudflare + Search Console + Umami/Plausible 二选一 + `site:monitor`。
  - 静态主站不优先上 Prometheus；Prometheus 优先用于 assistant API 和其他后端服务。
  - 多服务链路复杂后再接 OpenTelemetry。
  - 真实用户错误影响体验后再接 Sentry 或 Grafana Faro。
  - AI 助手成为核心路径后再评估 Langfuse / Helicone / Phoenix / OpenTelemetry GenAI。
- 增加“要不要一起做”的判断规则，避免工具重复采集、口径混乱和不必要运维负担。
- 增加可执行的人工配置清单，区分：
  - 可以自动推进的仓库改动。
  - 必须用户审核或在第三方后台完成的真实配置。
- 增加离线文档校验，至少检查关键工具名、推荐路线和人工 gate 仍存在，避免后续文档改坏。
- 不改变生产行为，不添加真实第三方脚本，不打开 `METRICS_ENABLED`，不添加真实 DSN、API key、site id、scrape URL 或 dashboard URL。

## Acceptance Criteria

- [x] `docs/observability-strategy.md` 包含分层决策矩阵、推荐组合、暂不一起接入的理由、ARMS 与 Prometheus/Grafana/OpenTelemetry 的关系、以及 LLM observability 何时评估。
- [x] `docs/site-monitoring.md` 能让用户快速理解 Cloudflare / Search Console / Umami 或 Plausible / Prometheus-Grafana-ARMS 的差距，并链接到完整策略。
- [x] 增加或更新一个离线校验命令，能在不访问第三方平台、不需要密钥的情况下验证可观测性文档关键内容。
- [x] `package.json` 提供可运行脚本，便于后续执行该离线校验。
- [x] 运行并记录最小验证：新增校验脚本、`npm.cmd run lint`、`npm.cmd run build`、`git diff --check`、敏感信息扫描。
- [x] 不提交真实 token、密钥、生产 dashboard 链接、真实访问量、真实错误率或私有运营数据。

## Out of Scope

- 不启用 Cloudflare Web Analytics、Search Console、Umami、Plausible、Sentry、ARMS、Prometheus 或 Grafana 的真实项目配置。
- 不部署任何 scrape、dashboard、alert、CI 定时任务或第三方脚本。
- 不把真实访问量、用户数、转化率、错误率或成本数据展示到公开站点。
- 不在这轮把 `/metrics` 模式推广到 ERP、Legal RAG、Xunqiu 后端或 Pet Community API；这些属于后续跨项目 child task。
