# Main site verification diagnostics

## Goal

让主站发布前检查更快获得反馈，明确区分真实产品失败、HTTP 失败和检查环境的 DNS/TLS/连接失败，并阻止普通本地检查污染公开状态快照。

## Background

- `check:ui` 保留 17 条路由和完整交互/视觉矩阵，但当前只在结束时输出结果，长时间运行时无法判断进度或慢点。
- `check:ui:smoke` 已覆盖 5 条核心路由与 320/390/1440px，但尚未输出阶段耗时，也没有统一网络隔离。
- `public-links:check` 已是显式 `--write-status`，但网络分类依赖扁平错误文本，Node `fetch` 常见的 `error.cause.code` 会退化为 `network_error`。
- 多个 synthetic 与 `site:status` 默认写入 `public/status/*`；本机网络/TLS 波动可能把一次环境失败直接变成工作区公开状态变化。
- `status:contract` 会检查现有快照的敏感字段，但缺少无网络 fixture 来证明 DNS、TLS、超时、连接、HTTP 403 和脱敏行为。

## Requirements

### R1 Verification progress

- `check:ui:smoke` 与 `check:ui` 使用同一进度报告格式，输出命名组、上下文、开始/结束状态和耗时。
- full 保留现有 17 路由及完整断言，不以减少覆盖换取速度。
- 未捕获异常必须显示当前检查组；已有断言继续携带路由/视口上下文。

### R2 Local-only UI verification

- smoke 与 full 只访问 `UI_CHECK_BASE`、loopback 静态资源、`data:`/`blob:` 资源和显式页面 fixture。
- 测试不得调用真实模型、搜索、embedding 或生产 API；未知外部请求立即失败并指出检查组、路由和视口。

### R3 Stable network taxonomy

- 共享纯函数读取 `error.name`、顶层 `code` 和递归 `cause.code`，输出固定低敏类别：`timeout`、`dns_error`、`tls_error`、`connection_error`、`network_error`、`http_status`。
- HTTP 200-399 才通过；403、404、5xx 均失败。403 不得被重试白名单或误判为通过。
- 公开状态 payload 只包含固定类别、计数和固定文案，不包含 URL、证书链、原始 error message/cause 或响应体。

### R4 Explicit status publication

- `main-site:synthetic`、Legal RAG、ERP、Xunqiu、Pet、Playlab、`site:status` 与 `reliability:check` 默认不写 `public/status/*`。
- 写入必须显式传入 `--write-status`；可选路径必须限制在仓库内允许的状态输出边界，不能借参数覆盖任意文件。
- `reliability:check` 默认用临时目录承接子检查输出并在结束时清理；只有 suite 自身显式获准写入时，才发布公开快照。

### R5 Deterministic fixture checks

- 新增无网络 diagnostics contract check，覆盖 DNS、TLS、timeout、connection、unknown、HTTP 403/404/500、状态 payload 脱敏和写入路径拒绝。
- fixtures 不依赖当前网络、云服务、模型渠道或生产账号。

## Acceptance Criteria

- [x] `npm.cmd run check:ui:smoke` 独立运行，输出阶段进度与耗时，并覆盖核心公开路由和关键移动端约束。
- [x] `npm.cmd run check:ui` 保留 17 路由及完整交互/视觉矩阵，运行中持续输出命名组进度和组耗时。
- [x] UI 检查安装本地网络边界，fixture 外的外部请求会确定性失败且不会到达生产服务。
- [x] `public-links:check` 对 DNS、TLS、超时、连接、HTTP 状态和未知网络错误输出稳定类别，HTTP 403 保持失败。
- [x] 所有状态生成命令默认不修改 `public/status/*`，显式发布与可靠性临时汇总可验证。
- [x] 无网络 fixture 覆盖错误分类、写入路径边界和公开状态脱敏。
- [x] `lint`、`build`、diagnostics contract、`status:contract`、`check:ui:smoke`、`check:ui` 和 `git diff --check` 通过。

## Out Of Scope

- 自动修复外部站点、部署平台、域名或证书。
- 调用真实模型、搜索、embedding 或生产 API 做测活。
- 通过忽略 HTTP 失败、放宽门禁或删除现有 UI 覆盖让检查变绿。
