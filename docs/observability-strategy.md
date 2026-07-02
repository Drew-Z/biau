# 可观测性策略

这个文档把 BIAU Port 的“访问分析”和“工程可观测性”拆开。前者关注访客行为和内容效果，后者关注服务健康、错误、延迟、依赖和告警。两类工具可以互补，但不要互相替代。

## 推荐结论

当前不要一次性把 Cloudflare、Search Console、Plausible、Umami、ARMS、Prometheus、Grafana、OpenTelemetry 和 Sentry 全部接入。推荐按阶段推进：

1. 主站访问分析：Cloudflare Web Analytics + Search Console + Plausible/Umami 二选一。
2. 主站健康检查：继续使用 `npm.cmd run site:monitor`，后续再考虑 CI 或定时器。
3. Assistant API 工程指标：默认关闭的 `/metrics` 已预留，只有设置 `METRICS_ENABLED=true` 后才输出 Prometheus text 格式。
4. 后端项目可观测性：ERP、Legal RAG、Xunqiu 后端、Pet Community API 等常驻服务再逐步接 Prometheus / OpenTelemetry / Grafana。
5. 错误体验闭环：如果公开助手或主站真实用户错误开始影响体验，再评估 Sentry 或 Grafana Faro。

## 访问分析工具

| 工具 | 解决的问题 | 不解决的问题 | 当前建议 |
|---|---|---|---|
| Cloudflare Web Analytics / Pages Analytics | PV、UV、来源、热门路径、地区、设备、基础性能 | 搜索关键词细节、产品按钮转化、服务内部错误 | 先启用，适合当前 Cloudflare Pages 主站 |
| Google Search Console / Bing Webmaster | 搜索曝光、点击、查询词、收录、sitemap 状态 | 全站真实访问人数、站内点击事件、接口健康 | 必须配置，用来看 SEO 入口 |
| Plausible | 简洁隐私友好统计、目标转化、外链/事件 | 深度自托管控制、复杂产品路径分析 | 如果想省心，优先选它 |
| Umami | 开源自托管、事件、漏斗、用户路径、API | 托管维护成本可能更高 | 如果想掌控数据和扩展性，选它 |

Plausible 和 Umami 不建议同时启用。它们都覆盖网站分析和事件统计，同时启用会重复采集、增加隐私审查和数据口径对齐成本。当前 `src/utils/analytics.ts` 已经支持 `plausible`、`umami` 和 `debug`，真实 provider 只需人工选择一个并注入脚本。

## 工程可观测性工具

| 工具 | 角色 | 适合范围 |
|---|---|---|
| Prometheus | 数值型时序指标采集与查询 | 请求数、错误率、延迟、队列、数据库连接、模型调用耗时 |
| Grafana | 可视化、探索和告警 | 统一看板、发布对比、异常排查 |
| OpenTelemetry | traces/metrics/logs 标准和采集导出框架 | 多服务链路追踪、跨后端统一观测、避免厂商锁定 |
| Grafana Alloy | 兼容 OpenTelemetry 和 Prometheus 的现代采集器 | 后续统一收 metrics/logs/traces/profiles |
| Sentry | 错误、性能、session replay、trace 和修复上下文 | 前端异常、后端异常、真实用户错误影响面 |
| ARMS | 阿里云托管应用监控套件 | 云上企业监控、托管 Prometheus/Grafana/OpenTelemetry、RUM、合成监控 |

Prometheus / Grafana 不是 Cloudflare / Search Console / Plausible / Umami 的替代。前者看服务内部状态，后者看访客与搜索表现。主站是静态应用，第一优先级应是访问分析和站点健康；Prometheus 应优先用于 assistant API 和其他后端服务。

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

## 分阶段路线

### Phase 1：主站轻量分析

- 人工启用 Cloudflare Web Analytics。
- 人工配置 Search Console / Bing Webmaster，并提交 sitemap。
- Plausible / Umami 二选一，接入当前 analytics adapter。
- 继续使用 `npm.cmd run site:monitor` 做发布前/发布后检查。

### Phase 2：后端基础指标

- Assistant API 开启 `METRICS_ENABLED=true` 后验证 `/metrics`。
- 后续给 ERP、Legal RAG、Xunqiu 后端、Pet Community API 增加同类 `/metrics`。
- 统一指标名和低基数标签，不把用户内容和私有 ID 放进指标。

### Phase 3：看板和告警

- 选择自建 Prometheus + Grafana，或托管 Prometheus/Grafana/ARMS。
- 加入核心告警：服务不可用、5xx 升高、p95 延迟升高、模型调用失败、数据库不可用。
- 把 `site:monitor` 接入 CI、定时器或合成监控。

### Phase 4：更完整的链路观测

- 多服务链路变复杂后再接 OpenTelemetry。
- 需要前端真实用户错误和回放时再接 Sentry 或 Grafana Faro。
- 助手/模型能力成为核心路径后，再评估 Langfuse、Helicone、Phoenix 或 OpenTelemetry GenAI 语义约定。

## 人工 Gate

以下操作不能自动执行：

- 启用真实 Cloudflare Web Analytics。
- 验证 Search Console / Bing Webmaster 所有权。
- 选择并配置 Plausible 或 Umami 真实脚本。
- 添加 Sentry DSN、ARMS 账号、托管 Prometheus/Grafana 凭据。
- 把 `/metrics` 暴露到生产 scrape。
- 配置 CI/定时器/告警平台。
- 公开展示任何访问量、错误率、用户数、转化率等真实运营数据。

## 参考资料

- Cloudflare Web Analytics: `https://developers.cloudflare.com/web-analytics/`
- Google Search Console Performance report: `https://support.google.com/webmasters/answer/7576553`
- Umami Docs: `https://umami.is/docs`
- Plausible Docs: `https://plausible.io/docs`
- Prometheus Overview: `https://prometheus.io/docs/introduction/overview/`
- OpenTelemetry: `https://opentelemetry.io/docs/what-is-opentelemetry/`
- Grafana Introduction: `https://grafana.com/docs/grafana/latest/introduction/`
- Grafana Alloy: `https://grafana.com/docs/alloy/latest/`
- Alibaba Cloud ARMS: `https://www.alibabacloud.com/help/en/arms/`

