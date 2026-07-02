# 泊岸品牌图标与入场动画优化 - Implement

## Steps

- [x] 创建并启动 task，读取当前任务和 frontend spec。
- [x] 新增 `BiauPortMark` SVG 组件。
- [x] 替换导航 logo 内联 SVG，保持导航结构和交互。
- [x] 改造 `HarborIntro` 为新品牌符号入场动画。
- [x] 更新 navigation / animations CSS。
- [x] 更新 `public/favicon.svg`。
- [x] 运行验证并修复失败。
- [ ] 更新任务验收、归档 child、更新父任务和 journal、提交推送。

## Validation

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
git diff --check
```

另外对 changed files 运行敏感信息扫描，人工检查 `key`、`token`、`secret`、`DATABASE_URL`、`Bearer`、`sk-` 等命中。

## Validation Log

- `npm.cmd run lint`：通过。
- `npm.cmd run build`：通过；仅出现既有 Vite/Rolldown dynamic import 警告。
- `npm.cmd run check:ui`：通过，覆盖 8 条路由、2 个视口、首页 intro 动画结束、导航焦点和无横向溢出。
- `git diff --check`：通过。
- changed files 敏感信息扫描：无命中。
- Playwright 截图人工检查：桌面常驻导航、移动端常驻导航、intro 中间态均通过；截图仅作本地验证，未提交。

## Rollback

- `BiauPortMark`、`Navigation`、`HarborIntro`、CSS 和 `favicon.svg` 改动可按本 task diff 独立回退。
- 新实现不更改数据、路由或远程配置。
