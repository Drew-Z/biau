# UI-010：状态页移动入口修复

验证日期：2026-09-07。状态：`fixed / verified`。

## 变更范围

- `src/styles/route-pages.css`：仅在现有 `max-width: 720px` 块内为 `.status-target__actions .btn` 和 `.status-project-card__link` 设置 `min-height: 44px`；桌面 `40px` 不变。
- `scripts/check-ui.mjs`：状态页移动矩阵检查两组入口非空、可见、真实宽高至少 `44px`，且不超出 viewport 水平边界。隐藏或零尺寸链接不得通过过滤被忽略。
- `.trellis/spec/frontend/quality-guidelines.md`：补充上述尺寸与防漏报规则。
- 本记录只交付 UI-010；同文件中已有的导航、轮播、AI Daily、详情返回和博客卡片修复不属于本轮提交范围。

## 浏览器证据

修复前的两组入口均为 `40px` 高。修复后在三主题、触控模拟和 reduced-motion 下，每组测量覆盖 21 个入口检测链接与 8 个项目可靠性链接；桌面不启用触控模拟。

| 宽度 | 三主题最小/最大高度 | 横向溢出 |
| --- | --- | --- |
| 320px | 44 / 44px | 0px |
| 390px | 44 / 44px | 0px |
| 430px | 44 / 44px | 0px |
| 1440px | 40 / 40px | 0px |

12 组的每个链接在滚动居中后均完整位于 viewport 内，中心点命中链接或其子节点。代表性桌面及三种窄屏截图已人工复核，未见按钮文字裁切。截图与日志保留于本轮系统临时目录 `C:\Users\zhang\AppData\Local\Temp\blog-semi-ui-010-20260907-f0960dccb24f4b409e624946484c00df`，不加入公开资源或提交。

## 质量门禁

- `npm.cmd run lint`：通过。
- `npm.cmd run build`：TypeScript 与 Vite 构建通过。
- `npm.cmd run check:ui:smoke`：21 组、0 失败，9419ms。
- `npm.cmd run check:ui`：41 组、17 条主矩阵路由、0 失败，552217ms；含导航三主题/中英文/交互和专项窄屏检查。
- `npm.cmd run performance:check`：CSS `152358 / 222755` bytes，JS `422542 / 430000` bytes；延迟加载 route CSS `141524` bytes。
- `git diff --check` 与当前任务 context 校验：通过。

UI 命令使用新构建的独立预览，PowerShell 中先设置 `$env:UI_CHECK_BASE = 'http://127.0.0.1:5183'`。中断的旧进程不计为成功证据；最终结果来自本次完整重跑。

## 交付边界

用户已确认按上述范围独立本地提交，不推送或部署。公开状态快照、Logo、favicon、已有未跟踪文件、路线图和根目录前导空格目录均保留。持续 UI 总任务保持 `in_progress`，不以本轮通过宣称全站已无 UI 问题。
