# Implement: Multi-theme Luminous Motion System

## Steps

1. 移除 stabilized override 对 app pseudo layers 和 `.harbor-environment` 的全局关闭。
2. 为六种主题组合补齐 field/ribbon、beam、spectrum、mist、edge 强度和混合模式 token。
3. 增加移动端 light-cost profile 和 reduced-motion 静态回退。
4. 扩展 `check:ui` 的多层动画、主题差异、移动端和 reduced-motion 契约。
5. 更新 frontend quality spec，禁止用全局 `display:none` 解决动态背景视觉/性能问题。
6. 运行完整前端验证，并截取六种主题组合与手机截图。
7. 对深色 stellar 和浅色 dusk 进行时间间隔像素差验证。

## Validation

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run performance:check
npm.cmd run check:ui
git diff --check
```
