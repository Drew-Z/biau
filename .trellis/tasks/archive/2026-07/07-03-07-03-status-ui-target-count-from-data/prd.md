# Status UI check follows homepage external targets

## Goal

修复 `/status` UI 回归脚本对主页外链入口数量的硬编码，让它跟随 `src/data/statusTargets.ts` 中的 `siteStatusTargets` 数据源。这样后续首页项目按钮新增或移除外链时，UI 检查不会因为旧常量误报。

## Requirements

- `scripts/check-ui.mjs` 不再硬编码 `/status` 主页外链卡片数量为 4。
- 检查脚本应从当前公开数据源推导期望数量，至少覆盖 Pet 展示页接入后 5 个入口的状态。
- 保留现有 `/status` 外链安全检查：外链 href、`target="_blank"`、`rel="noopener noreferrer"` 仍需验证。
- 不改变页面 UI 行为，不新增公开数据，不引入真实账号、密钥、生产地址或私有监控配置。

## Acceptance Criteria

- [x] `npm.cmd run check:ui` 通过。
- [x] `npm.cmd run lint` 通过。
- [x] `npm.cmd run build` 通过。
- [x] `git diff --check` 通过。
- [x] 敏感扫描未发现真实密钥、token、密码、内部 URL 或私有配置。

## Notes

- 当前触发原因：Pet 首页动作按钮接入 `/pet-app-showcase/` 后，`siteStatusTargets` 从 4 个入口扩展为 5 个入口。
- 2026-07-03 验证：`check:ui` 通过并确认 `/status` 目标数量从 `siteStatusTargets.length` 推导；`lint`、`build`、`git diff --check` 均通过。敏感扫描命中仅为测试用公开 URL、localhost 和 PRD 安全词。
