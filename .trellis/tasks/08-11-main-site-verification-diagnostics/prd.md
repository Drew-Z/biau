# Main site verification diagnostics

## Goal

让主站发布前检查更快获得反馈，并能区分真实产品失败、远端 HTTP 失败和检查环境网络/TLS 失败。

## Dependency

依赖 `08-11-main-site-public-truth` 完成；建议在 `08-11-main-site-css-performance` 后实施，以便 smoke/full 分层直接覆盖最终 CSS 所有权。依赖是显式验收基线依赖，不阻止先行研究脚本结构。

## Requirements

- 增加核心 `check:ui:smoke`，保留 `check:ui` 全量覆盖。
- 全量检查按命名组输出进度与耗时，失败能定位到路由/视口/检查组。
- smoke 与 full 都只使用本地 fixture，不调用真实模型、搜索、embedding 或生产 API。
- `public-links:check` 将网络失败归类为固定低敏类别，并保留 HTTP 403/404/5xx 的失败语义。
- 默认检查不写 `public/status/*`；状态写入必须显式 opt-in，公开快照不得包含 URL、证书链或底层敏感信息。

## Acceptance Criteria

- [ ] `npm.cmd run check:ui:smoke` 可独立运行、输出阶段进度并覆盖核心公开路由与关键移动端约束。
- [ ] `npm.cmd run check:ui` 保留现有 17 路由和完整交互/视觉矩阵，运行中持续输出有意义进度。
- [ ] `public-links:check` 对 DNS、TLS、超时、连接、HTTP 状态和未知网络错误输出稳定类别。
- [ ] 本地 fixture 覆盖错误分类与状态脱敏，HTTP 403 不被白名单或误判为通过。
- [ ] `lint`、`build`、`status:contract` 和 `git diff --check` 通过。

## Out Of Scope

- 自动修复外部站点、部署平台、域名或证书。
- 将本机一次失败直接写成生产 offline，或通过忽略失败让门禁变绿。
