# 项目详情主图原图查看入口

## Goal

为项目详情主图增加打开原图入口，方便访客检查长截图和移动端截图，并补 UI 回归检查。

## Requirements

- 为项目详情页主图提供明确的原图查看入口，方便访客检查长截图、移动端截图和产品界面细节。
- 不改截图资产、不生成图片、不新增真实运营数据或私有地址。
- 主图原图入口应：
  - 使用现有 `project.image` 公开静态路径。
  - 保持图片本身可见，不破坏现有布局和懒加载/响应式图片行为。
  - 使用新窗口打开原图，并保留 `rel="noopener noreferrer"`。
  - 提供可访问名称，键盘用户可达。
- 补充 `scripts/check-ui.mjs` 回归，至少覆盖一个长截图或移动端截图项目，例如 `/projects/xunqiu`。

## Acceptance Criteria

- [x] `ProjectDetailPage` 主图区域可打开当前项目原图。
- [x] 原图入口有可访问名称，且使用 `target="_blank"` 与 `rel="noopener noreferrer"`。
- [x] `scripts/check-ui.mjs` 覆盖项目详情主图原图入口。
- [x] 验证通过：`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui`、`git diff --check` 和敏感信息扫描。

## Notes

- 巡检证据：`pet-workspace`、`xunqiu` 为 1080x2400 竖图，`blog-semi` 为 1440x3253 长截图；当前详情页主图只显示受 `max-height: 520px` 限制的区域。

## Validation Log

- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过；Vite 输出既有动态导入 chunk 提示，不影响构建。
- `npm.cmd run check:ui` 通过，覆盖 8 个路由、2 个视口，并新增 `/projects/xunqiu` 主图原图入口属性检查。
- `git diff --check` 通过，仅输出 Windows 行尾提示。
- 敏感信息扫描仅命中本地 UI 测试地址、CSS `mask-*` 属性片段和父任务 slug，均为误报；未新增真实地址、密钥或私有配置。
