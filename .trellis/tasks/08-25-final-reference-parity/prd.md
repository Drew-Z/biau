# 参考站最终视觉复审与双轴主题恢复

## Goal

恢复主站被单主题重构移除的双轴外观模型：`light | dark | auto` 负责内容可读性，`dusk | garden | stellar` 独立负责背景视觉与动效。保留已验证的 Stellar 背景参数和 HarborIntro 结束后 Flow/Starfield 生命周期修复，并补足场景按钮、状态持久化、首帧 prepaint、场景 profile 读取及回归检查。

## Confirmed Facts

- 参考站资源位于 `D:/workspace4Cursor/resourses/沐星埠.html` 及其 Flow、Starfield 运行时文件；只借鉴公开可观察的视觉语言，不复制品牌、字体、音效、私有脚本或外部资源。
- 主站当前 `src/utils/appearance.ts` 固定 `STELLAR_SCENE`，`readStoredHarborScene()` 永远返回 Stellar，`applyHarborScene()` 也忽略传入场景；`src/hooks/useHarborScene.ts`、导航场景入口和多场景 profile 已被单主题重构移除。
- 生产检查 `scripts/check-production-appearance.mjs` 当前只覆盖 `light/dark`，并通过注入旧场景值后仍断言 `scene === stellar`，无法发现三主题能力缺失。
- 提交 `54577068` 及其之前的 `src/utils/appearance.ts`、`useHarborScene.ts`、`flowPalettes.ts` 保留了可选择恢复的三主题状态、profile 和持久化实现；不直接回退 `7d4a96aa`，以免丢失后续 intro 背景恢复修复。
- 用户已有 `public/status/blog-semi-synthetic.json` 是并行未提交修改，必须始终排除在本任务编辑、暂存和提交之外。

## Requirements

### R1. 双轴状态与首帧

- 恢复 `HARBOR_SCENES`、场景 metadata、localStorage key、读写校验、循环切换和 `data-harbor-scene` / version；无效旧值安全回退到 `dusk`。
- `index.html` prepaint 必须同时恢复存储的 scene 和 theme，首帧按完整 scene profile 选择背景，而不是把 light/dark 当作场景。
- `light/dark/auto` 仅改变内容表面可读性；scene 选择完整的 Flow、Starfield、StellarEffects 和页面 token。

### R2. 场景 owner 与交互

- Flow、Starfield、StellarEffects、首页 carousel/局部装饰按当前 scene 读取 profile；保留现有 Stellar 的生命周期 observer、Worker/RAF 清理、reduced-motion、hidden、low-power 和 fallback 行为。
- 恢复可访问的场景切换入口，支持键盘 Enter、更新 root dataset 与 localStorage，并在无 View Transition 或 reduced-motion 下正常工作。
- 场景切换不得新增第二个 Canvas、常驻 RAF、全屏固定线条/点阵或无 owner 的伪元素。

### R3. 验证与参考站复审

- UI 检查必须覆盖 3 个 scene × 2 个 resolved appearance，并验证点击场景入口后的 dataset、localStorage、profile version、Flow/Starfield/Stellar scene 一致。
- 生产检查覆盖 6 个 scene/appearance 组合及 320/390/430 移动 containment；Stellar 专属 edge/perimeter 只在 Stellar 生效。
- 恢复完成后重新进行 `1440x1000`、`390x900`、`430x900` 多相位视觉采样，记录可修复差异与有意保留差异。

## Acceptance Criteria

- [ ] 三个场景可通过入口循环切换、刷新持久化，且 `light/dark/auto` 不改变当前 scene。
- [ ] 三个 scene 的 Flow dynamics、Starfield profile、surface token 与 StellarEffects 状态可观察且彼此独立；Stellar 保留接近参考站的深色流体、星场和局部光效。
- [ ] 首次加载、intro 结束、刷新、hidden/resume、reduced-motion、low-power、no-WebGL/no-Worker 均不会永久暂停或切换到错误背景 owner。
- [ ] `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run performance:check`、`npm.cmd run check:ui:smoke`、`npm.cmd run check:ui` 和生产 appearance 检查通过。
- [ ] 提交并推送后，线上复审完成；`public/status/blog-semi-synthetic.json` 未暂存、未提交。

## Out Of Scope

- 不复制参考站 Logo、站名、字体、音效、压缩运行时代码、外部资源、硬件评分或私有调试面板。
- 不重写业务内容、项目数据、博客、状态数据、AI 日报、后端或部署架构。
- 不直接 `git revert` 单主题提交；只选择性恢复双轴状态/profile，并保留已验证的 Stellar intro 生命周期修复。
