# Current Task

Date: 2026-06-16
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Claude Code read-only plan, Codex scoped implementation

## Goal

Clean up the `/projects` page interaction hierarchy so project cards and the selected project narrative do not repeat the same actions or use vague button labels. Keep the page focused on clear routes: preview within the project page, independent technical detail pages, business case pages, and game showcase pages.

## Scope

- Audit and adjust `ProjectsView` card actions.
- Audit and adjust `ProjectNarrative` footer actions if they duplicate the selected project side panel.
- Preserve existing route behavior for `/projects/:id`, `/cases/:id`, and `/games/:slug`.
- Keep the current visual design and Chinese company/product showcase tone.

## Non-goals

- Do not redesign the full projects page.
- Do not rewrite project detail content.
- Do not add or remove projects/cases.
- Do not edit reference project directories.
- Do not expose secrets, real accounts, IPs, API bases, or local validation paths.

## Allowed Paths

- src/App.tsx
- src/App.css
- .agent-work/current-task.md
- .agent-work/cc-plan.md
- .agent-work/codex-review.md
- .agent-work/verification.md

## Acceptance Criteria

- [x] CC produces a read-only plan before implementation.
- [x] Project card buttons use clear labels and avoid redundant same-destination actions.
- [x] The selected project narrative no longer repeats the side panel's primary action cluster unnecessarily.
- [x] Selecting a card still updates the preview panel.
- [x] Technical detail, business case, and game showcase routes still work.
- [x] `npm run lint` and `npm run build` pass.
- [x] Browser QA checks `/projects` on desktop and mobile.
