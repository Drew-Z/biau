# 项目详情移动端长图预览优化

## Goal

限制项目详情页移动端长截图预览高度，并让打开原图入口保持首屏可见，改善 xunqiu 等移动端长图占满首屏的问题。

## Requirements

- Mobile project detail pages must cap long hero screenshot previews so a portrait screenshot cannot consume most of the first viewport.
- The "打开原图" affordance must remain visible when the screenshot preview enters the mobile viewport.
- The hero image link must keep its existing `href`, `target="_blank"`, `rel="noopener noreferrer"`, and accessible label.
- Desktop image behavior must remain unchanged.
- Do not edit screenshots, project facts, links, assistant knowledge, sitemap, or blog content in this task.

## Acceptance Criteria

- [x] `/projects/xunqiu` mobile hero image preview height is capped to a compact viewport-relative size.
- [x] `/projects/xunqiu` mobile "打开原图" affordance is visible within the first viewport.
- [x] `/projects/legal-rag` mobile detail image still loads without horizontal overflow.
- [x] Original image link href/target/rel semantics remain unchanged.
- [x] `git diff --check`, sensitive-info scan, `npm.cmd run lint`, `npm.cmd run build`, and relevant UI check pass.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
- Verified with `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:ui`, `git diff --check`, strict sensitive-info scan, and mobile screenshot inspection for `xunqiu`.
