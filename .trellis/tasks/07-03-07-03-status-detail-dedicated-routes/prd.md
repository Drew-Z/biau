# Status detail dedicated routes

## Goal

把 `/status` 页面里每个项目卡片的“详细状态”从同页锚点跳转改为独立路由页面。访客点击后应进入一个清晰的项目可靠性详情页，而不是在长页面内滚动到某个区块。

## Requirements

- 新增状态详情路由，例如 `/status/:projectId` 或等价清晰路径。
- `/status` 的项目入口卡片按钮改为跳转到对应详情页，不再使用 `#reliability-*` 作为主要导航。
- 详情页显示单个 `ReliabilityProject` 的：
  - 项目标题、分类、整体摘要。
  - 状态计数。
  - 每个 reliability check 的层级、频率、接入点、状态语义、证据。
  - gate 和 next actions。
  - 返回 `/status` 的入口。
- 未知 `projectId` 进入现有 NotFound 或清晰缺省状态。
- 数据来源继续使用 `src/data/statusTargets.ts` 和生成后的 `public/status/site-status.json`，不要复制一份状态数据。
- 移动端与桌面端按钮、卡片、详情页布局不能出现文本溢出或横向滚动。

## Acceptance Criteria

- [x] `/status` 上每个“详细状态”按钮跳转到独立路由，不再是 `#` hash。
- [x] 每个可靠性项目详情页可以通过 URL 直接打开。
- [x] UI 回归检查覆盖详情链接数量、href 路径、至少一个详情页渲染和返回 `/status`。
- [x] `npm.cmd run check:ui`、`npm.cmd run lint`、`npm.cmd run build` 通过。
- [x] `git diff --check` 与敏感扫描通过。

## Out of Scope

- 不接入新的真实监控平台。
- 不改变各项目 synthetic 状态含义。
- 不公开任何私有 dashboard、账号、API base URL 或凭据。

## Validation

- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed; Vite kept existing ineffective dynamic import warnings.
- `npm.cmd run check:ui`: passed against local preview.
- `git diff --check`: passed with Windows line-ending warnings only.
- Sensitive scan: no real secrets; only the frontend quality spec safety text matched.

## Spec Update

- Updated `.trellis/spec/frontend/quality-guidelines.md` so `/status` UI checks expect dedicated `/status/:projectId` routes rather than hash anchors.
