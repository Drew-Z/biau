# 交付已验证的历史 UI 改进

## Goal

审查并本地交付此前持续 UI 任务留下的 7 个已验证修改文件，建立可追溯的 Stage 1 基线，让下一轮列表状态修复不再与旧 WIP 混合。依赖父任务的 2026-09-08 持续授权和 UI-012 对完整工作区的验证。

## Requirements

- R1：逐项检查差异并对应 UI 行为、常驻回归和质量规范，不改写现有业务源码。
- R2：仅交付下列 7 个文件及本子任务资料：`.trellis/spec/frontend/quality-guidelines.md`、`scripts/check-ui.mjs`、`src/components/RightScrollCards.tsx`、`src/styles/catalog-pages.css`、`src/styles/hero-split.css`、`src/styles/navigation.css`、`src/styles/route-pages.css`。
- R3：暂存文件内容必须与本轮开始时的已测工作区一致。保留其他未跟踪资料、前导空格目录、资产、历史 worktree；不纳入本次提交。
- R4：不推送、不部署、不签名、不修改公开数据或保护快照；本地提交后记录哈希并返回父任务继续评估。

## Acceptance Criteria

- [x] 7 个历史差异的行为、检查和提交边界均完成审查，无非 UI 变更。
- [x] 保存 7 文件与保护快照的 SHA-256；交付前内容保持一致，提交后再复核。
- [x] 核实复用的 UI-012 验证日志；当前脚本语法、diff 和任务上下文校验通过，暂存白名单在提交前校验。
- [ ] 进行独立本地提交、归档本子任务并返回父任务；未归档原持续 UI 任务。

## Out Of Scope

- 不在本任务中修复新发现的 UI 问题或实现 Stage 2；新问题回到父任务评估。
- 不全量暂存工作区，不因文件尚未跟踪就将其视为可删除文件。
