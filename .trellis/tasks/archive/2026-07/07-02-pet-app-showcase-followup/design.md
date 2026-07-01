# Pet App 展示页继续优化 - Design

## Current State

- `pet/gamer` 当前分支为 `cursor-windows-migration`。
- 展示页位于 `pet-app-showcase-site/`，是纯静态 HTML/CSS，无构建依赖。
- 页面已经使用四张真实 Android 模拟器截图：
  - `android-main.png`
  - `android-hatch.png`
  - `android-community.png`
  - `android-profile.png`
- 当前仓库存在 unrelated dirty files:
  - `services/community-api/src/postgres-store.js`
  - `services/community-api/src/routes.js`
  - `services/community-api/src/store.js`
  - `services/community-api/src/pagination.js`
  - `services/community-api/src/pagination.test.js`
  - `test-out.txt`

## Target Changes

- 只修改 `pet-app-showcase-site/`，避免碰到 unrelated pagination work。
- 增加更清楚的发布前检查清单：
  - public build。
  - signing policy。
  - release notes。
  - basic regression。
  - human approval。
- 增加面向访客的项目入口：
  - 主站项目详情页。
  - 截图区锚点。
  - 仓库 README 或本地预览说明。
- 保持 APK gate 为 disabled 状态，不添加真实或占位下载链接。
- 保持页面表达为 WIP，不暗示完整生产可用。

## Verification

- 静态文件路径检查：确认 `index.html` 引用的 CSS 和图片存在。
- `git diff --check`。
- 敏感信息扫描限制在 `pet-app-showcase-site/`。
- 不运行全仓库测试，除非改动超出静态展示页。
