# 实施计划：恢复双轴主题与最终参考复审

## 1. 规划与基线

- [x] 记录用户确认的双轴恢复方向和用户独立 status JSON 修改。
- [x] 读取历史三主题实现、单主题提交差异、当前 Stellar 生命周期修复、参考站资源和前端质量规范。
- [x] 复测线上生产 Stellar appearance，确认当前基线 8/8 通过。
- [x] 完成 PRD/设计收敛并启动任务。

## 2. 状态与 profile 恢复

- [x] 恢复 `src/utils/appearance.ts` 的三场景常量、metadata、读写校验、循环和初始 prepaint 合约。
- [x] 恢复 `src/hooks/useHarborScene.ts` 的状态、持久化和原子切换。
- [x] 将 `App.tsx`、`Layout.tsx`、`Navigation.tsx` 接回 scene 状态与可访问切换入口。
- [x] 恢复 `flowPalettes.ts` 的三主题 profile，并让 Flow/Starfield/StellarEffects 按 scene 读取；保留 intro observer。

## 3. Surface 与检查恢复

- [x] 恢复 scene-aware surface tokens，避免重复全屏 owner、固定线条和无归属点阵。
- [x] 更新 `index.html` prepaint 与必要的场景样式，不改变 Stellar 已对齐的背景参数。
- [x] 扩展 `check-ui.mjs`：验证三主题按钮点击、root dataset、localStorage、刷新持久化、profile/owner 一致性。
- [x] 扩展 `check-production-appearance.mjs`：覆盖 6 个组合与移动 containment，单独断言 Stellar effects。

## 4. 质量与部署

- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] `npm.cmd run performance:check`
- [x] `npm.cmd run check:ui:smoke`
- [x] `npm.cmd run check:ui`
- [x] 采集 1440x1000、390x900、430x900 多相位截图并记录审计结果。
- [x] `git diff --check`，确认 status JSON 未暂存。
- [ ] 提交、推送 `origin/main`，部署后重跑生产 appearance 并更新审计记录。

## 风险与回滚点

- 高风险：`appearance.ts`、`useHarborScene.ts`、`index.html`、`flowPalettes.ts`；风险是首帧 scene 不同步或旧 localStorage 污染。
- 中风险：`Navigation.tsx`、surface CSS、UI 检查脚本；风险是按钮无障碍、移动布局或断言时序回归。
- 回滚顺序：先恢复检查兼容层，再恢复 surface/profile，最后恢复 scene state；保留 `b094be55` 的 Flow/Starfield observer。
