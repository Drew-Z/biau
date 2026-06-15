# Current Task

Date: 2026-06-15
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Codex

## Goal

Continue the public showcase asset work inside WSL by adding a desensitized Pet Workspace App API contract diagram and using it on the Pet case detail page.

## Scope

- Create a public-safe `fantasy-pet-api-contract.svg` diagram.
- Use only concept-level architecture labels from the Pet reference docs.
- Add Pet Workspace image evidence to `/cases/pet-workspace`.
- Preserve the existing Legal RAG and Godot showcase image mappings.
- Update `docs/showcase-assets.md` to reflect the new Pet asset coverage.
- Verify the route, image loading, lint, build, and sensitive wording scan.

## Non-goals

- Do not copy real run JSON, generated assets, logs, cloud endpoints, local paths, provider config, tokens, or admin-only endpoint names.
- Do not modify `~/workspace/reference-projects`.
- Do not add new projects.
- Do not redesign the whole case-detail layout.
- Do not push before verification.

## Allowed Paths

- `src/App.tsx`
- `docs/showcase-assets.md`
- `public/images/projects/showcase/fantasy-pet-api-contract.svg`
- `.agent-work/*`

## Acceptance Criteria

- [x] `/cases/pet-workspace` shows three Pet evidence images.
- [x] The new API contract diagram is public-safe and path-free.
- [x] Existing `/cases/legal-rag` and `/cases/godot-showcase` evidence images still work.
- [x] No horizontal overflow appears on desktop/mobile checks.
- [x] Public text does not introduce `面试` / `作品集` wording or sensitive credentials/endpoints.
- [x] `npm run lint` and `npm run build` pass in WSL.

## Verification Plan

- Browser-check `/cases/pet-workspace` at desktop and mobile widths.
- Run `npm run lint`.
- Run `npm run build`.
- Run a sensitive/public wording scan over `src`, `docs`, and `public`.
- Commit only after the evidence is clean.
