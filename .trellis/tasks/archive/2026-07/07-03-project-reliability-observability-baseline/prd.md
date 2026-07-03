# 全项目可靠性观察基线

## Goal

让 BIAU Port 从“能打开几个外链”推进到“能看见每个重点项目的关键能力是否可控”。第一版要在主站提供公开可读、低敏的可靠性基线：入口可达、关键功能合成检查规划、项目指标接入状态、人工 gate 和下一步接入清单。

## Background

- 现有 `/status` 已能检查主页 IN PORT 四个外链入口：Legal RAG、Ozon ERP、BIAU Playlab、寻球。
- 现有 `scripts/check-site-monitor.mjs` 已能检查主站核心路由、SEO 基本项、站内/外链。
- 用户进一步要求：现有项目都需要可靠性观察检查，例如法律机器人的模型 API、合同审查和法律问答功能是否正常。
- Prometheus、Grafana、ARMS、OpenTelemetry 等属于工程可观测性层；它们不能替代真实业务小任务的合成检查。

## Requirements

- 状态页必须从单一“入口可达性”扩展为分层可靠性视图：
  - L0：公开入口可达性，继续复用已有 HTTP 检查。
  - L1：关键功能合成检查，例如 Legal RAG 问答、合同审查、ERP 登录/注册、Playlab 试玩资源、寻球展示/API。
  - L2：项目运行指标，例如 `/metrics`、错误率、延迟、队列或模型调用状态。
  - L3：看板/告警，例如 Grafana、ARMS、Sentry、Umami/Plausible、Cloudflare 或 Search Console。
- 第一版不能写入真实密钥、真实账号、生产后台密码、私有 API 地址、数据库连接串、签名路径或不可公开凭据。
- 第一版不自动开启任何生产 scrape、告警、埋点、Sentry、ARMS、Langfuse 或真实定时任务。
- 合成检查必须表达“是否已接入”和“如何验证”，不能把未接入的功能伪装成可用。
- 对所有当前重点项目给出可靠性检查基线：
  - `blog-semi` 主站。
  - `legal-rag`。
  - `erp`。
  - `xunqiu` / `xunqiu-backend-modern`。
  - `pet` / `gamer`。
  - `game` / Playlab。
- 主站 `/status` 文案必须面向访客可读：告诉访客哪些能力可用、哪些能力受限、哪些还需要人工接入，而不是只展示工程术语。
- 工程文档必须说明后续如何把 L1 合成检查结果写入 JSON 或指标，并说明何时才需要 Prometheus/Grafana。

## Out of Scope

- 不在本子任务中接入用户刚提供的限时 GLM key。
- 不在本子任务中开启 AI 日报自动生成。
- 不在本子任务中修改各项目生产部署配置。
- 不在本子任务中公开任何真实 demo 账号、后台密码或管理员凭据。
- 不在本子任务中承诺所有项目关键功能已经在线通过，只能呈现已验证/待接入状态。

## Acceptance Criteria

- [x] `/status` 能展示 L0 入口检查和 L1/L2/L3 可靠性接入状态。
- [x] `public/status/site-status.json` 的生成脚本包含统一可靠性数据结构，未接入项显示为 `unchecked` 或 `planned`。
- [x] 至少覆盖 `blog-semi`、`legal-rag`、`erp`、`xunqiu`、`pet/gamer`、`game/Playlab` 的检查项清单。
- [x] 生成脚本仍保持串行检查，不对外部服务制造高并发。
- [x] 页面明确区分“公开入口正常”和“关键功能已验证”，避免误导。
- [x] 文档或任务记录说明 Prometheus/Grafana 与合成检查的关系，以及后续接入顺序。
- [x] 运行最小验证：`npm.cmd run site:status`、`npm.cmd run sitemap:generate`、`npm.cmd run lint`、`npm.cmd run build`。
- [x] 提交前完成 `git diff --check` 和敏感信息扫描。

## Validation Notes

- `npm.cmd run site:status`：通过，生成 4 个 L0 入口结果，当前均为 online。
- `npm.cmd run sitemap:generate`：通过，生成 27 个 URL。
- `npm.cmd run lint`：通过。
- `npm.cmd run build`：通过；仅保留 Vite 既有 dynamic import chunk 提示。
- `npm.cmd run check:ui`：通过，覆盖 9 个路由、桌面与移动视口，并验证 `/status` 的可靠性项目组与检查项。
- `npm.cmd run assistant:index`：通过，生成 23 个公开知识项。
- `npm.cmd run blog:check`：通过。
- `git diff --check`：通过，仅出现 Windows 换行提示。
- 敏感扫描：未发现 GLM key、中转域名、API key、Bearer、数据库串；仅命中既有公开 ERP 外链域名。
