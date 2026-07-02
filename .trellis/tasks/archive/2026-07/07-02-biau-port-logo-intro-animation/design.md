# 泊岸品牌图标与入场动画优化 - Design

## Visual Direction

采用“b + 港湾 / 端口 + 暖灯”的融合方案：

- `b` 的竖线是岸线、灯塔主干和稳定依靠。
- `b` 的右侧弧线是港湾轮廓，也像船只靠泊的轨迹。
- `b` 内部的短水线表达“泊岸”，使用深海蓝到暖琥珀的细线。
- 暖琥珀点位于右上/右内侧，表达灯塔、归宿和安全感。
- `>` 只通过内部短线/负空间轻微暗示，不做明显命令行符号。

## Code Boundaries

- 新增 `src/components/BiauPortMark.tsx`：
  - 输出可复用 SVG。
  - 通过 `useId()` 生成局部渐变 id，避免多个 SVG 实例的 id 冲突。
  - 提供 `animated` / `className` / `ariaHidden` props。
- 更新 `src/components/Navigation.tsx`：
  - 用 `BiauPortMark` 替换当前内联 logo SVG。
  - 保留导航结构、`nav-brand-section`、`nav-logo`、harbor scene 切换行为和文字。
- 更新 `src/components/HarborIntro.tsx`：
  - 复用 `BiauPortMark animated`。
  - 保留 `.harbor-intro__vessel`、`.harbor-intro__mark`、`harborVesselDock`、`harborMarkLand`、`harborIntroVeil`，减少 UI 检查迁移。
  - 文字浮现为 `BIAU PORT` + `泊岸`。
- 更新 `src/styles/navigation.css` 和 `src/styles/animations.css`：
  - 新 logo 尺寸、hover、scene 变体。
  - 新 intro 的绘制、点亮、缩入导航动画。
- 更新 `public/favicon.svg`：
  - 使用静态 SVG，无脚本、无外链、无复杂 filter。

## Accessibility

- SVG 在导航中作为装饰，链接的 aria-label 继续由 `nav-brand-section` 提供。
- 入场动画 `aria-hidden="true"`，不抢焦点，pointer-events 仍为 none。
- `prefers-reduced-motion: reduce` 继续直接跳过 intro。
- 动画总时长保持在 `check-ui` 的 3 秒阈值内。

## Tradeoffs

- 不用 Lottie/GSAP：时间轴精度稍低，但体积小、可维护、适合静态站第一版。
- 使用 stroke-based logo：小尺寸辨识度好，也便于 CSS 绘制动画。
- 同步 favicon：能增强品牌一致性，但浏览器缓存可能导致线上短时间仍显示旧图标。
