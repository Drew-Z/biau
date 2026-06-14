# Current Task

Date: 2026-06-15
Repo: D:\workspace4Codex\blog-semi
Branch: main
Controller: Codex
Builder: Codex

## Goal

Add a first batch of desensitized real project screenshots to the public showcase system, starting with `space-war`, and document the asset coverage plan for later projects.

## Scope

- Use existing public-safe Space War screenshots from the project documentation.
- Add the Space War gameplay image to the project card data.
- Add Space War menu/gameplay/result images to the Godot showcase case detail page.
- Add a lightweight `docs/showcase-assets.md` inventory to track public assets, gaps, and desensitization rules.
- Verify rendered image loading on project and case detail routes.

## Non-goals

- Do not copy private logs, accounts, endpoints, task JSON, build packages, signing files, database config, or production paths.
- Do not modify reference project directories.
- Do not add `douyu`, `yihuan-helper`, or `ques`.
- Do not redesign the whole site or split `App.tsx` in this slice.
- Do not replace existing Legal RAG image evidence.

## Allowed Paths

- `src/App.tsx`
- `src/App.css`
- `src/data/portfolio.ts`
- `docs/showcase-assets.md`
- `public/images/projects/showcase/space-war-*.png`
- `.agent-work/*`

## Acceptance Criteria

- [x] `/projects/space-war` uses the real gameplay image without broken image state.
- [x] `/cases/godot-showcase` shows three Space War evidence images after scrolling to the case image grid.
- [x] Existing Legal RAG case images still render through the same case-detail component.
- [x] No horizontal overflow appears on desktop or mobile checks.
- [x] Public text does not introduce `面试` / `作品集` wording or sensitive credentials/endpoints.
- [x] `npm.cmd run lint` and `npm.cmd run build` pass.

## Verification Plan

- Run rendered browser checks for `/projects/space-war` and `/cases/godot-showcase`.
- Run `npm.cmd run lint`.
- Run `npm.cmd run build`.
- Run a sensitive/public wording scan over `src`, `docs`, and `public`.
- Commit and push only after the verification evidence is clean.
