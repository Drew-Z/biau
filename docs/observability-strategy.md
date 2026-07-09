# 可观测性策略

这个文档把 BIAU Port 的“访问分析”“SEO 数据”“产品事件”“前端真实用户体验”“后端工程指标”和“AI 助手调用观测”拆开。它们可以互补，但不要互相替代，也不要一次性全部接入。快速查看访问人数和站点健康时，先看 `docs/site-monitoring.md`；需要处理平台、凭据、模型 live 调用或 APK 发布批准时，看 [`docs/manual-gates.md`](./manual-gates.md)。

## 推荐结论

当前不要一次性把 Cloudflare、Search Console、Plausible、Umami、ARMS、Prometheus、Grafana、OpenTelemetry、Sentry、Grafana Faro 和 Langfuse 全部接入。推荐按阶段推进：

1. 主站访问分析：Cloudflare Web Analytics / Pages Analytics + Search Console / Webmaster + Plausible 或 Umami 二选一。
2. 主站和跨项目健康检查：使用 `npm.cmd run reliability:check` 作为统一入口，保留 `npm.cmd run site:monitor` 做单独核心路由巡检。
3. Assistant API 工程指标：保留默认关闭的 `/metrics`，只有设置 `METRICS_ENABLED=true` 后才输出 Prometheus text 格式。
4. 后端项目可观测性：ERP、Legal RAG、Xunqiu 后端、Pet Community API 等常驻服务再逐步接 Prometheus / OpenTelemetry / Grafana 或 ARMS。
5. 错误体验闭环：如果公开助手或主站真实用户错误开始影响体验，再评估 Sentry 或 Grafana Faro。
6. AI 助手观测：当模型调用成为核心能力后，再评估 Langfuse、Helicone、Phoenix 或 OpenTelemetry GenAI 语义约定。

## 分层模型

| 层级 | 回答的问题 | 典型工具 | 当前动作 |
|---|---|---|---|
| CDN / 基础访问 | 有没有人来、从哪里来、看了哪些页面、设备和地区分布如何 | Cloudflare Web Analytics / Pages Analytics | 人工启用，仓库只记录配置边界 |
| 搜索入口 | 搜索引擎是否收录、哪些查询词带来曝光和点击、sitemap 是否正常 | Google Search Console / Bing Webmaster | 人工验证所有权并提交 sitemap |
| 产品事件 | 用户是否点击项目详情、外链、助手入口和关键按钮 | Plausible 或 Umami | 二选一，沿用 `src/utils/analytics.ts` |
| 站点健康 | 首页、项目页、博客、sitemap、robots 是否可访问，跨项目 synthetic 是否产出公开状态 | `npm.cmd run reliability:check`、`npm.cmd run site:monitor` | 先用统一套件跑本地/CI 检查，再按需接定时器 |
| 前端真实用户体验 | 浏览器错误、慢页面、真实设备体验、回放或前端 trace | Sentry、Grafana Faro | 暂不默认接入，等真实错误影响体验后再做 |
| 后端工程指标 | 请求量、错误率、延迟、依赖健康、数据库和队列状态 | Prometheus、Grafana、ARMS、OpenTelemetry | assistant API 已预留默认关闭 `/metrics` |
| AI 助手质量 | 模型调用成本、延迟、失败率、prompt 版本、RAG 命中、回答质量 | Langfuse、Helicone、Phoenix、OpenTelemetry GenAI | 等助手流量和模型策略稳定后评估 |

## 工具决策矩阵

| 工具 | 主要用途 | 不适合替代 | 当前建议 |
|---|---|---|---|
| Cloudflare Web Analytics / Pages Analytics | PV、UV、来源、热门路径、地区、设备、基础性能 | 搜索查询词、站内按钮事件、服务内部错误 | 先启用，适合当前 Cloudflare Pages 主站 |
| Google Search Console / Bing Webmaster | 搜索曝光、点击、查询词、收录、sitemap 状态 | 全站真实访问人数、站内事件、接口健康 | 必须配置，用来看 SEO 入口 |
| Plausible | 简洁隐私友好统计、目标转化、外链和自定义事件 | 深度自托管控制、复杂路径分析 | 想省心时优先选它 |
| Umami | 开源自托管、事件、漏斗、用户路径、API | 托管维护成本较低的省心方案 | 想掌控数据和扩展性时选它 |
| Prometheus | 数值型时序指标采集和查询 | 访客行为分析、搜索数据、逐请求审计和计费 | 后端服务优先，静态主站不优先 |
| Grafana | 指标、日志、trace、告警的看板和探索 | 自己采集数据或替代业务埋点 | 配合 Prometheus / Loki / Tempo / Mimir 或托管数据源 |
| OpenTelemetry | traces、metrics、logs 的标准、SDK、Collector 和 OTLP 协议 | 后端存储、看板和告警本身 | 多服务链路复杂后再接，避免厂商锁定 |
| Grafana Alloy | 统一采集 Prometheus、OpenTelemetry、Loki、Pyroscope 等信号 | 访问分析或 SEO 工具 | 后续需要统一 agent 时再考虑 |
| ARMS | 阿里云一站式应用监控、浏览器监控、托管 Prometheus/Grafana、OpenTelemetry、合成监控 | 跨云完全中立的自建方案 | 服务主要在阿里云时很合适，否则先保持开放栈 |
| Sentry | 前端/后端错误、性能、release、session replay 和修复上下文 | 访问人数统计、SEO 查询词、通用指标仓库 | 真实用户错误影响体验后接入 |
| Grafana Faro | 浏览器 RUM、错误、Web Vitals、日志、前端 trace，并能接 Grafana Cloud | SEO 和基础流量统计 | 已用 Grafana Cloud/LGTM 时优先评估 |
| Langfuse / LLM observability | LLM trace、prompt 版本、成本、延迟、评估和用户反馈 | 通用后端指标或全站访问统计 | 助手进入高频使用后评估 |

## 要不要一起做

可以一起做的组合：

- Cloudflare + Search Console：一个看全站基础访问和 CDN 视角，一个看搜索曝光和收录，数据口径不同。
- Cloudflare + Plausible/Umami：一个看基础流量，一个看站内产品事件和转化目标。
- `site:monitor` + 任意分析工具：前者是主动健康检查，后者是被动访问或事件统计。
- Prometheus + Grafana：Prometheus 采集和查询指标，Grafana 展示和告警。
- OpenTelemetry + Prometheus/Grafana/ARMS：OpenTelemetry 负责标准化采集和导出，后者负责存储、查询、看板或托管平台。

不建议一起做的组合：

- Plausible + Umami 同时接入同一个站点：会重复采集、增加隐私审查和口径对齐成本。
- 静态主站第一阶段就上 Prometheus：静态页面没有常驻服务内部状态，主站当前更需要访问分析和链接健康。
- ARMS 和自建 Prometheus/Grafana 同时做完整生产链路：除非有明确迁移或对比目标，否则会维护两套告警、看板和权限。
- Sentry 和 Grafana Faro 同时全量开 session replay：会增加隐私、性能和数据量审查成本，先选一个方向。
- LLM observability 在助手流量很低时提前重度接入：成本和维护复杂度可能高于收益。

## 当前项目推荐路线

### Phase 1：主站轻量分析

- 人工启用 Cloudflare Web Analytics / Pages Analytics。
- 人工配置 Google Search Console / Bing Webmaster，并提交 `sitemap.xml`。
- Plausible / Umami 二选一，接入当前 `src/utils/analytics.ts` adapter；当前 adapter 已包含默认关闭的 `route_view` 和项目/助手交互事件，路由事件只发送归一化 route metadata。
- 使用 `npm.cmd run reliability:check` 做跨项目发布前或发布后检查；需要单独巡检核心路由时继续运行 `npm.cmd run site:monitor`。

### Phase 2：后端基础指标

- Assistant API 开启 `METRICS_ENABLED=true` 后验证 `/metrics`，但生产 scrape 计划必须先人工确认。
- 后续给 ERP、Legal RAG、Xunqiu 后端、Pet Community API 增加同类低敏 `/metrics`。
- 统一指标名和低基数标签，不把用户内容、私有 ID、完整 URL query 或 provider 配置写进指标。

### Phase 3：看板和告警

- 选择自建 Prometheus + Grafana，或托管 Prometheus/Grafana/ARMS。
- 加入核心告警：服务不可用、5xx 升高、p95 延迟升高、模型调用失败、数据库不可用。
- 把 `reliability:check` 接入 CI、定时器或合成监控。

### Phase 4：更完整的链路观测

- 多服务链路变复杂后再接 OpenTelemetry 和 Collector / Grafana Alloy。
- 需要前端真实用户错误和回放时再接 Sentry 或 Grafana Faro。
- 助手/模型能力成为核心路径后，再评估 Langfuse、Helicone、Phoenix 或 OpenTelemetry GenAI 语义约定。

## Assistant API 指标边界

当前 assistant API 支持默认关闭的 `/metrics`：

```text
METRICS_ENABLED=false
```

关闭时：

```text
GET /metrics -> 404 { "error": "metrics-disabled" }
```

开启时：

```text
GET /metrics -> text/plain; version=0.0.4; charset=utf-8
```

指标只包含低敏聚合数据：

- `biau_assistant_api_started_timestamp_seconds`
- `biau_assistant_api_uptime_seconds`
- `biau_assistant_api_http_requests_total`
- `biau_assistant_api_http_request_duration_seconds`

标签只允许：

- `method`
- `route`
- `status_class`
- histogram 的 `le`

不会记录：

- IP、User-Agent、Cookie。
- Authorization header、admin token、member token、invite code。
- member id、session id、message id。
- 用户提问正文。
- 完整 URL query。
- 数据库连接串、模型 endpoint 或 provider key。

## 人工 Gate

统一人工队列见 [`docs/manual-gates.md`](./manual-gates.md)。以下是可观测性相关边界：

以下操作不能自动执行：

- 启用真实 Cloudflare Web Analytics。
- 验证 Search Console / Bing Webmaster 所有权。
- 选择并配置 Plausible 或 Umami 真实脚本。
- 添加 Sentry DSN、ARMS 账号、托管 Prometheus/Grafana 凭据。
- 把 `/metrics` 暴露到生产 scrape。
- 配置 CI、定时器、合成监控或告警平台。
- 接入 Langfuse、Helicone、Phoenix 或任何真实 LLM trace 平台。
- 公开展示任何访问量、错误率、用户数、转化率、成本或质量评分等真实运营数据。

可以自动推进：

- 更新公开文档和配置说明。
- 扩展默认关闭的 analytics adapter。
- 增加低敏、默认关闭、本地可验证的 metrics 代码。
- 增加 `reliability:check`、`site:monitor` 或文档离线检查。
- 更新 `.trellis/spec/` 中的可观测性安全边界。

## 第一版定时路线

推荐先用 GitHub Actions 的 scheduled workflow 跑统一套件：

```powershell
npm.cmd run reliability:check -- --strict
```

套件会写出：

- `public/status/blog-semi-synthetic.json`
- `public/status/legal-rag-synthetic.json`
- `public/status/erp-synthetic.json`
- `public/status/xunqiu-synthetic.json`
- `public/status/pet-gamer-synthetic.json`
- `public/status/site-status.json`
- `public/status/reliability-suite.json`

CI 第一版只把这些 JSON 作为 artifact 上传，不自动提交回 `main`。这样可以做到“定时可查”和“失败可见”，同时避免定时任务不断改动仓库。需要把最新状态公开到站点时，再由人工或部署流程决定是否发布这些生成文件。

## 参考资料

- Cloudflare Web Analytics: `https://developers.cloudflare.com/web-analytics/`
- Google Search Console Performance report: `https://support.google.com/webmasters/answer/7576553`
- Umami Docs: `https://umami.is/docs`
- Plausible Docs: `https://plausible.io/docs`
- Prometheus Overview: `https://prometheus.io/docs/introduction/overview/`
- OpenTelemetry: `https://opentelemetry.io/docs/what-is-opentelemetry/`
- Grafana Alloy: `https://grafana.com/docs/alloy/latest/`
- Grafana Frontend Observability: `https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/`
- Sentry JavaScript SDK: `https://docs.sentry.io/platforms/javascript/`
- Langfuse Docs: `https://langfuse.com/docs`
- Alibaba Cloud ARMS: `https://www.alibabacloud.com/help/en/arms/`
