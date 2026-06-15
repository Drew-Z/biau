# Current Task

Date: 2026-06-15
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Codex

## Goal

Continue showcase asset coverage inside WSL by adding a desensitized Pet Workspace human-review decision flow and using it on the Pet Workspace case detail page.

## Scope

- Create a public-safe Pet Workspace review flow diagram covering generated candidates, QA gates, human review, approval/rework/reject decisions, release records, and App API consumption.
- Add the review flow diagram to `/cases/pet-workspace` as an additional evidence image.
- Preserve existing Pet Workspace screenshots/diagrams and other case image mappings.
- Update `docs/showcase-assets.md` to reflect the Pet Workspace review coverage.
- Verify route rendering, image loading, lint, build, and sensitive wording scan in WSL.

## Non-goals

- Do not copy real task packages, candidate source files, model configuration, cloud addresses, prompt content, user data, or raw run logs.
- Do not modify `~/workspace/reference-projects`.
- Do not add new projects.
- Do not redesign the whole case-detail layout.
- Do not push before verification.

## Allowed Paths

- `src/App.tsx`
- `docs/showcase-assets.md`
- `public/images/projects/showcase/fantasy-pet-review-flow.svg`
- `.agent-work/*`

## Acceptance Criteria

- [x] `/cases/pet-workspace` shows the existing three evidence images plus the new review flow diagram.
- [x] The new Pet Workspace diagram is public-safe and path-free.
- [x] Existing case image routes still work.
- [x] No horizontal overflow appears on desktop/mobile checks.
- [x] Public text does not introduce `面试` / `作品集` wording or sensitive credentials/endpoints.
- [x] `npm run lint` and `npm run build` pass in WSL.

## Verification Plan

- Browser-check `/cases/pet-workspace` at desktop and mobile widths.
- Run a quick image regression for existing case image routes.
- Run `npm run lint`.
- Run `npm run build`.
- Run a sensitive/public wording scan over `src`, `docs`, `public`, and active `.agent-work` files.
- Commit only after the evidence is clean.
