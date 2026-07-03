# Pet homepage showcase action and APK gate

## Goal

把首页 Pet 项目的操作按钮接入 `/pet-app-showcase/`，让访客从首页能直接进入 App 展示与下载状态页。同时推进 APK 下载信息到更明确的发布准备状态：记录当前只发现 debug 构建，公开下载仍需要正式签名包、版本说明、校验摘要、基础回归和人工确认。

## Requirements

- 首页右侧项目卡片中 `AI 宠物生成管线` 的按钮应出现并跳转到 `/pet-app-showcase/`。
- 保留卡片本体点击进入 `/projects/pet-workspace` 的行为。
- Pet 展示页应更明确说明：
  - 当前已有内部 debug 构建证据，但它不能作为公开发布包。
  - 公开 APK 下载需要正式 release 构建、签名、校验摘要、版本说明、回归和人工确认。
  - 不放置真实 APK 下载链接、内部构建路径、签名路径、token 或私有 artifact URL。
- 状态页/项目数据可同步“APK 发布 gate 正在准备”的说明，但不得把 `pet-apk-gate` 标记为 online。
- 重新生成公开助手知识、sitemap/status 相关输出（如受影响）。

## Acceptance Criteria

- [x] `src/data/hero.ts` 中 Pet 首页卡片按钮指向 `/pet-app-showcase/`。
- [x] Pet 展示页公开下载区域说明 debug 构建和正式 release gate 的边界，且没有真实下载 href。
- [x] `pet:synthetic` 仍通过，`pet-showcase=online`，`pet-apk-gate` 仍不是 online。
- [x] 通过 `npm.cmd run assistant:index`、`npm.cmd run pet:synthetic`、`npm.cmd run site:status`、`npm.cmd run lint`、`npm.cmd run build`。
- [x] 通过 `git diff --check` 和敏感扫描。

## Notes

- 本地巡检只发现 Android debug APK；本任务不公开 debug 包，不替代正式 APK 发布 gate。
- 2026-07-03 验证：`assistant:index` 生成 23 条公开知识；`pet:synthetic` 通过并确认 4/4 截图；`site:status` 中 `pet-showcase=online`、`pet-apk-gate=planned`；`lint`、`build`、`git diff --check` 通过。敏感扫描命中均为环境变量名、门禁说明或已有公开阶段 APK 文案，未发现真实密钥或内部下载路径。
