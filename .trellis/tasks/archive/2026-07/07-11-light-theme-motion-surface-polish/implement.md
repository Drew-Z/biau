# Implement: Light Theme Motion And Surface Polish

## Steps

1. 调整 `flow-pages.css` 三种浅色场景的颜色端点和 saturation，保持 opacity、speed 和 keyframes 可见。
2. 小幅提高浅色 panel/card alpha，并增加 light-only surface/hover overrides。
3. 统一 `navigation.css` 和 `site-footer.css` 的浅色冷调半透明表面。
4. 扩展 `scripts/check-ui.mjs`，断言 color/mist/edge 动画名、mist/edge 最低可见度和面板上限/下限。
5. 更新 frontend quality spec。
6. 运行 lint/build/performance/UI 检查并截取桌面、手机页面对比。

## Validation

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run performance:check
npm.cmd run check:ui
git diff --check
```

## Rollback Boundary

- 如果背景再次显得静态，优先恢复 saturation/颜色调整，不降低 opacity 或删除动画。
- 如果内容仍不够清楚，只调整 panel/card surface，不继续削弱背景场。
