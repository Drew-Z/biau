# Main site CSS performance hardening

## Goal

在完整保留当前 UI、主题、动画与移动端行为的前提下，将主站入口 CSS 从 247,506 bytes 基线降低至少 10%，并恢复现有性能门禁。

## Dependency

依赖 `08-11-main-site-public-truth` 完成。原因是 CSS 拆分后的最终 UI 回归应针对已经校正的项目、状态和助手知识投影执行，避免两次大范围快照变化混在一起。

## Requirements

- 不提高 `scripts/check-build-performance.mjs` 的 245,000 bytes 预算。
- 删除可证明已被替代的旧/重复规则，按 lazy route/component 拆分明确专属的 CSS。
- 入口 CSS 不超过 222,755 bytes；性能报告同时暴露路由 CSS chunk，避免转移膨胀。
- 不引入新的 UI 框架或运行时 CSS 依赖。
- 保持首页背景、Harbor intro、导航、项目/博客/状态详情、AI Daily、Studio、公开助手及 light/dark/scene 状态行为不变。

## Acceptance Criteria

- [ ] `performance:check` 通过，入口 CSS <= 222,755 bytes，入口 JavaScript 仍在现有预算内。
- [ ] `lint`、`build`、`check:ui:smoke`、`check:ui` 和 `git diff --check` 通过。
- [ ] 320/390/430px 不出现横向页面溢出、导航遮挡、详情不可读或助手全屏错位。
- [ ] 正常动画、reduced motion、CSS fallback、light/dark 和三个 harbor scene 均保持回归覆盖。
- [ ] lazy route 首次进入没有明显 FOUC 或缺失样式。

## Out Of Scope

- 重新设计视觉、修改文案、改写背景渲染算法或替换 React/Vite 架构。
