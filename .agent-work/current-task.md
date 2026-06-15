# Current Task

Date: 2026-06-15
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Codex

## Goal

Continue showcase asset coverage inside WSL by adding desensitized xunqiu migration diagrams and using them on the xunqiu project and case detail pages.

## Scope

- Create public-safe xunqiu module-map, migration-flow, and verification-chain diagrams.
- Add a xunqiu project visual to `src/data/portfolio.ts`.
- Add xunqiu image evidence to `/cases/xunqiu`.
- Preserve existing Legal RAG, Ozon ERP, Pet Workspace, and Godot showcase image mappings.
- Update `docs/showcase-assets.md` to reflect the new xunqiu asset coverage.
- Verify route rendering, image loading, lint, build, and sensitive wording scan in WSL.

## Non-goals

- Do not copy real IPs, domains, accounts, tokens, APK names, package hashes, signing files, database config, SQL files, media URLs, or server paths.
- Do not modify `~/workspace/reference-projects`.
- Do not add new projects.
- Do not use old app screenshots until they are manually reviewed and desensitized.
- Do not push before verification.

## Allowed Paths

- `src/App.tsx`
- `src/data/portfolio.ts`
- `docs/showcase-assets.md`
- `public/images/projects/showcase/xunqiu-*.svg`
- `.agent-work/*`

## Acceptance Criteria

- [x] `/projects/xunqiu` uses a public-safe xunqiu visual.
- [x] `/cases/xunqiu` shows three xunqiu evidence images.
- [x] The new xunqiu diagrams are public-safe and path-free.
- [x] Existing case image routes still work.
- [x] No horizontal overflow appears on desktop/mobile checks.
- [x] Public text does not introduce `面试` / `作品集` wording or sensitive credentials/endpoints.
- [x] `npm run lint` and `npm run build` pass in WSL.

## Verification Plan

- Browser-check `/projects/xunqiu` and `/cases/xunqiu`.
- Run a quick image regression for existing case image routes.
- Run `npm run lint`.
- Run `npm run build`.
- Run a sensitive/public wording scan over `src`, `docs`, `public`, and active `.agent-work` files.
- Commit only after the evidence is clean.
