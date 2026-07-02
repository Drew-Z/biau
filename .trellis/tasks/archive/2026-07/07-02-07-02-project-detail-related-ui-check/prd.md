# 项目详情相关推荐 UI 回归检查

## Goal

为项目详情页相关推荐区域补 Playwright UI 回归，覆盖单类目项目不为空、标题切换和卡片链接。

## Requirements

- 在 `scripts/check-ui.mjs` 中补项目详情相关推荐区域的 Playwright 回归检查。
- 至少覆盖两个过去会空推荐的单类目项目：
  - `/projects/ozon-erp`
  - `/projects/xunqiu`
- 检查点：
  - 推荐区存在，标题为“相关项目”。
  - 推荐卡片数量在 1 到 3 之间。
  - 推荐卡片不链接到当前项目自身。
  - 第一张推荐卡片可点击并导航到另一个项目详情页。
- 不改变公开项目事实、不新增真实统计或私有地址、不改变生产配置。
- 检查脚本必须保持现有 `UI_CHECK_BASE` 约定，不强制启动 dev server。

## Acceptance Criteria

- [x] `scripts/check-ui.mjs` 覆盖 `ozon-erp` 和 `xunqiu` 的相关推荐区域。
- [x] 检查失败时输出能定位到具体项目详情页的错误信息。
- [x] 现有 UI 检查行为不被削弱。
- [x] 验证通过：`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui`、`git diff --check` 和敏感信息扫描。

## Notes

- 这是上一项推荐逻辑优化的防回归补强，属于低风险工程质量任务。

## Validation Log

- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过；Vite 输出既有动态导入 chunk 提示，不影响构建。
- `npm.cmd run check:ui` 通过，覆盖 8 个路由、2 个视口，并新增 `ozon-erp` / `xunqiu` 相关推荐区域检查。
- `git diff --check` 通过，仅输出 Windows 行尾提示。
- 敏感信息扫描仅命中 `scripts/check-ui.mjs` 里的本地回归测试地址和父任务 slug，均为误报；未新增真实地址、密钥或私有配置。
