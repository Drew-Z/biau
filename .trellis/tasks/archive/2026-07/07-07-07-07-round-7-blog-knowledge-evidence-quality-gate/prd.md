# Round 7 blog knowledge evidence quality gate

## Goal

Add evidence-first checks for public knowledge posts so knowledge accumulation content keeps concrete knowledge points, source/evidence notes, and non-generic structure without model generation.

## Requirements

- R1. Writing mode: `Codex-only scaffold/review`; model channel: `none`; no live model generation or provider check.
- R2. Audit current public blog data, especially `column: "knowledge"` posts and existing blog validation scripts.
- R3. Add a local, deterministic quality gate that catches knowledge posts with weak structure: too few knowledge points, no reusable takeaways/checklist, no source/evidence section, or generic project-only content.
- R4. Keep the gate evidence-first without requiring external network access or current-news checks.
- R5. Do not delete posts or publish hidden drafts in this slice.
- R6. Do not commit private sources, model channels, credentials, local absolute paths, or unpublished internal content.

## Acceptance Criteria

- [x] 已审计公开博客数据和现有 blog 检查脚本。
- [x] 新增或增强一个本地博客知识质量检查。
- [x] 检查覆盖 `知识积累 / Knowledge Notes` 的知识点、来源/证据、复用价值和非泛泛项目复盘边界。
- [x] 相关验证通过。
- [x] 没有调用模型或外部 live provider。
- [x] 提交并推送 `blog-semi`。

## Notes

- This task improves gates and content governance first; actual article rewrites can be separate follow-up tasks.
- Writing mode: `Codex-only scaffold/review`; model channel: `none`.
- No live model generation, provider doctor, or external network research was used in this slice.
