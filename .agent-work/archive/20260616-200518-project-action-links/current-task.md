# Current Task

Date: 2026-06-16
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Claude Code via cc-provider d, then Codex scoped implementation if needed

## Goal

Fix project detail action buttons so every visible button either navigates to a real route, opens a valid external target, or is removed from the public UI. The immediate suspect is internal `project.links` entries such as `#legal-rag`, `#pet-workspace`, `#ozon-erp`, and `#blog-semi` that currently render but do nothing in `ProjectDetail`.

## Scope

- Audit `src/App.tsx` project/card/detail button handlers.
- Audit `src/data/portfolio.ts` project link entries.
- Make a narrow fix for dead or misleading project action buttons.
- Preserve the current company/product showcase framing.

## Non-goals

- Do not redesign project/case/blog pages.
- Do not add new projects or cases.
- Do not edit reference project directories.
- Do not expose secrets, local paths, real accounts, IPs, API bases, or validation artifacts.

## Allowed Paths

- src/App.tsx
- src/data/portfolio.ts
- .agent-work/current-task.md
- .agent-work/cc-plan.md
- .agent-work/codex-review.md
- .agent-work/verification.md

## Acceptance Criteria

- [x] CC produces a read-only plan before implementation.
- [x] Internal/dead project links are removed or routed to meaningful existing views.
- [x] Game project buttons still open `/games/:slug`.
- [x] Case/detail/project navigation still works.
- [x] Public wording remains Chinese and avoids interview/portfolio framing.
- [x] `npm run lint` and `npm run build` pass.
- [x] Browser QA checks relevant project detail routes on desktop and mobile.
