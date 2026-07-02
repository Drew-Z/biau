# 项目集移动端卡片操作区恢复

## Goal

让 /projects 移动端项目卡片保留紧凑的详情与外链入口，避免 project-footer 被整块隐藏导致外部演示入口不可见。

## Requirements

- On `/projects`, mobile project cards must keep a visible action area instead of hiding `.project-footer`.
- The card body remains a details entry, while the footer keeps a clear details button and up to two external links without triggering the card click.
- The mobile layout must stay compact: no horizontal overflow, no text overlap, and no oversized controls that dominate the card.
- Existing desktop project-card layout, keyboard behavior, analytics event names, and internal/external link safety rules must remain unchanged.
- Do not change project facts, public URLs, download gates, screenshots, assistant knowledge, or blog content in this task.

## Acceptance Criteria

- [x] `/projects` mobile viewport shows project-card footer actions.
- [x] External project links inside cards remain clickable/focusable and do not navigate to the project detail page.
- [x] Project cards still navigate to details when the card body or details button is activated.
- [x] No horizontal overflow or obvious text overlap on mobile project cards.
- [x] `git diff --check`, sensitive-info scan, `npm.cmd run lint`, `npm.cmd run build`, and relevant UI check pass.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
- Verified with `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:ui`, `git diff --check`, stricter sensitive-info scan, and a mobile `/projects` screenshot inspection.
