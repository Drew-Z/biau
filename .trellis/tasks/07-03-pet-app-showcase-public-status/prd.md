# Pet app showcase public status

## Goal

把 `/status` 页面中 Pet / Gamer 的 “App 展示页” 从 `planned` 推进为可验证状态：新增低敏 synthetic 检查，确认 `/pet-app-showcase/` 静态展示页和关键 Android 截图资产可访问，同时继续保留 APK 发布 gate，不声明 APK 已公开。

## Requirements

- 新增 `npm.cmd run pet:synthetic`，生成 `public/status/pet-gamer-synthetic.json`。
- 检查范围：
  - `/pet-app-showcase/` HTML 返回 2xx/3xx。
  - 页面包含标题、canonical、项目详情链接、APK 待公开/发布门禁文案。
  - 页面引用的四张 Android 截图资产存在并可通过公开路径读取。
- 只输出低敏状态 JSON：`checkedAt`、`ok`、`checks[]`，每项包含 `id`、`status`、`httpStatus`、`durationMs`、`summary`、`issues`。
- `pet-showcase` 可标为 `online`；`pet-apk-gate` 仍由静态状态保持 `planned`，不得在没有人工确认时改成 online。
- 运行 `npm.cmd run site:status` 后，`public/status/site-status.json` 中 Pet / Gamer 的 `App 展示页` 合并为 `online`。
- 不新增真实 APK 下载链接，不写入签名路径、内部 artifact URL、token、账号或私有服务地址。

## Acceptance Criteria

- [x] 新增 `pet:synthetic` package script 和检查脚本。
- [x] `npm.cmd run pet:synthetic` 生成 `public/status/pet-gamer-synthetic.json`，其中 `pet-showcase=online`。
- [x] `npm.cmd run site:status` 后 `public/status/site-status.json` 中 `pet-showcase=online`，`pet-apk-gate` 仍未误标为 online。
- [x] 通过 `npm.cmd run lint` 和 `npm.cmd run build`。
- [x] 通过 `git diff --check` 和敏感扫描。

## Notes

- 本任务只提升状态页证据，不发布 APK，不部署 Pet 后端，不修改 Pet 原仓库。
- 2026-07-03: `npm.cmd run pet:synthetic` 检查线上 `/pet-app-showcase/` 和 4 张 Android 截图，生成 `pet-showcase=online`。
- 2026-07-03: `npm.cmd run site:status` 已把 Pet / Gamer 的 `App 展示页` 合并为 `online`，`pet-apk-gate` 仍保持 `planned`。
- 2026-07-03: `npm.cmd run lint`、`npm.cmd run build`、`git diff --check` 通过；敏感扫描仅命中变量名和任务安全说明。
