# Current Task

Date: 2026-06-16
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Claude Code read-only plan, Codex scoped implementation

## Goal

Make the `/projects` list-page selected project state restorable from the URL without changing the meaning of independent project detail routes. A selected preview such as Pet Workspace should be shareable and survive refresh as `/projects?project=pet-workspace`.

## Scope

- Add a small helper for reading a valid project selection from `window.location.search` on `/projects`.
- Update list-page selection actions to push/replace `/projects?project=<id>`.
- Keep `/projects/:id` as the independent technical detail route.
- Preserve `/cases/:id`, `/games/:slug`, and blog routes.

## Non-goals

- Do not redesign the projects page.
- Do not change project/case/blog content.
- Do not add dependencies.
- Do not edit reference project directories.
- Do not expose secrets, real accounts, IPs, API bases, or local validation paths.

## Allowed Paths

- src/App.tsx
- .agent-work/current-task.md
- .agent-work/cc-plan.md
- .agent-work/codex-review.md
- .agent-work/verification.md

## Acceptance Criteria

- [x] CC produces a read-only plan before implementation.
- [x] Opening `/projects?project=pet-workspace` selects Pet Workspace in the preview panel.
- [x] Clicking project thumbnail cards updates the URL query and preview selection.
- [x] Switching project groups updates the URL query to the first project in the group.
- [x] `/projects/pet-workspace` still opens the independent technical detail page.
- [x] Browser back/forward restores project list selection.
- [x] `npm run lint` and `npm run build` pass.
- [x] Browser QA checks desktop and mobile.
