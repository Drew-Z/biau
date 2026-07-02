# 可观测性二期选型与路线图 - Design

## Architecture

本任务分成两层：

1. 访问分析层
   - 由 `docs/site-monitoring.md` 和新增 `docs/observability-strategy.md` 说明。
   - 目标是回答 PV/UV、来源、热门页面、搜索曝光、事件点击和转化问题。
   - 仍由人工在 Cloudflare、Search Console、Plausible 或 Umami 后台启用真实配置。

2. 工程可观测性层
   - 在 assistant API 中增加默认关闭的 Prometheus `/metrics` 预留接口。
   - 目标是为后续 Prometheus / Grafana / ARMS / OpenTelemetry 提供低敏指标边界，而不是本任务中部署完整监控栈。

## Data Flow

### Metrics

```text
HTTP request -> metrics middleware -> route handler -> response finish -> in-memory counters/histograms -> GET /metrics
```

- metrics middleware 必须在路由前注册，才能覆盖成功、4xx、5xx。
- route label 使用 Express route path 或 `unmatched`，不能记录完整 URL。
- status label 使用 `2xx` / `3xx` / `4xx` / `5xx` / `unknown`，避免高基数。
- duration 使用固定 bucket，输出 Prometheus histogram 结构。

### Access Analytics

```text
Visitor -> Cloudflare / analytics provider script -> provider dashboard
UI click -> analytics adapter -> Plausible/Umami/debug/no-op
Search crawler/user -> Search Console / Webmaster reports
```

仓库只保存 provider 类型和事件名称，不保存站点 ID、脚本 URL、API token 或后台地址。

## Contracts

- `METRICS_ENABLED`：
  - `true` / `1` / `yes` / `on` 开启。
  - 其他值关闭。
  - 默认关闭。
- `GET /metrics`：
  - 关闭时返回 `404 { "error": "metrics-disabled" }`。
  - 开启时返回 `text/plain; version=0.0.4; charset=utf-8`。
  - 输出只含低敏聚合指标。
- `/health`：
  - 继续公开返回服务、数据库和模型可用性，不受 metrics 开关影响。

## Privacy And Security

- 不记录 IP、User-Agent、cookie、Authorization header、member id、session id、chat message、invite code、admin token、数据库 URL 或模型 endpoint。
- 不在文档中写真实平台账号、站点 ID、token、私有 API 地址或 dashboard URL。
- `/metrics` 默认关闭，避免生产意外暴露内部指标。

## Trade-offs

- 不引入 `prom-client` 依赖：当前指标很小，手写 text exposition 可以减少依赖和迁移风险；如果后续指标复杂，再切到成熟库。
- 不接 OpenTelemetry SDK：OTel 更适合跨服务 traces/metrics/logs，一次性接入会明显扩大范围；本任务只记录路线。
- 不把 Plausible 和 Umami 同时启用：两者都解决网站分析和事件统计，同时启用会重复采集、增加噪音和隐私审查成本。
- 不把 ARMS 作为默认：ARMS 适合阿里云托管体系或企业运维栈；当前主站在 Cloudflare Pages，默认路线应保持轻量。

