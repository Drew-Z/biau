# Current Task

Date: 2026-06-16
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Claude Code via `cc`

## Goal

Remove unused draft article data and unused `pending` project status so future public-copy scans do not keep reporting non-rendered backlog wording.

## Scope

- Confirm `articles` is not imported or rendered.
- Remove the unused `articles` export from `src/data/portfolio.ts`.
- Remove unused `pending` from `ProjectStatus` and `statusLabels` if no project uses it.
- Remove UI color branches that only exist for the removed `pending` status.

## Non-goals

- Do not change visible project content, layout, routing, screenshots, or styles.
- Do not add or remove real blog posts.
- Do not edit reference project directories.
- Do not change active project statuses.

## Allowed Paths

- src/data/portfolio.ts
- src/App.tsx
- .agent-work/current-task.md
- .agent-work/cc-plan.md
- .agent-work/codex-review.md
- .agent-work/verification.md

## Acceptance Criteria

- [x] Previous task artifacts are archived.
- [x] CC provider selection uses short `OK` smoke tests before long prompts.
- [x] `cc` produces a read-only plan before implementation.
- [x] Codex records a narrowed review before implementation.
- [x] `articles` export is removed only if it is unused.
- [x] `pending` project status is removed only if no project uses it.
- [x] Public-copy scan no longer reports `待补图` / `待整理` from live source files.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.
- [x] Browser QA confirms project cards still render.
- [x] Changes are committed, pushed, and production QA is recorded.

## Verification Plan

- Run `rg` to prove `articles` and `pending` are unused before editing.
- Run targeted scans for `待补图` and `待整理`.
- Run `npm run lint`.
- Run `npm run build`.
- Browser-check `/projects` and `/` locally at desktop/mobile widths.
- After push and Cloudflare deployment, verify production routes and record the result.
