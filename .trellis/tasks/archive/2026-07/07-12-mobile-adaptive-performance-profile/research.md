# Research

## Reference Site

`D:\workspace4Cursor\resourses` 中的参考站使用 `static / balanced / full` 三档评分，综合 reduced-motion、Save-Data、网络类型、内存、CPU 与移动设备特征。

## Adaptation

主站不照搬完整评分器和诊断 UI。当前产品只需要在高成本持续背景与完整体验之间作可靠选择，因此采用 `balanced / static` 两档，减少误判和维护复杂度。

## Non-goals

- 不引入 GSAP 或新运行时依赖。
- 不加入背景音、URL 调试开关或横向手势导航。
- 不因低配设备跳过一次性 BIAU Logo 动画。
## Verification Evidence

- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- `npm.cmd run performance-profile:check` passed, including runtime Save-Data change and 320/390/430px low-power rendering.
- `npm.cmd run check:ui` passed for 14 routes across desktop and mobile viewports.
- 390px full-page static-profile screenshot visually inspected; harbor palette, content hierarchy, mobile tabbar and footer remain intact.
