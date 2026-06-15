# Current Task

Date: 2026-06-15
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Codex

## Goal

Continue showcase asset coverage inside WSL by adding a desensitized Ozon ERP admin-console/module view and using it on the Ozon ERP case detail page.

## Scope

- Create a public-safe Ozon ERP admin-console diagram covering product center, order sync, collected drafts, approval center, job queue, and audit log.
- Add the admin-console diagram to `/cases/ozon-erp` as an additional evidence image.
- Preserve existing Ozon ERP cover, workflow, data-model diagrams, and other case image mappings.
- Update `docs/showcase-assets.md` to reflect the Ozon ERP admin-console coverage.
- Verify route rendering, image loading, lint, build, and sensitive wording scan in WSL.

## Non-goals

- Do not copy real store names, order IDs, product names, prices, cookies, platform credentials, database URLs, hostnames, ports, backup hashes, bundle paths, or deployment records.
- Do not modify `~/workspace/reference-projects`.
- Do not add new projects.
- Do not redesign the whole case-detail layout.
- Do not push before verification.

## Allowed Paths

- `src/App.tsx`
- `docs/showcase-assets.md`
- `public/images/projects/showcase/ozon-erp-admin-console.svg`
- `.agent-work/*`

## Acceptance Criteria

- [x] `/cases/ozon-erp` shows the existing three evidence images plus the new admin-console diagram.
- [x] The new Ozon ERP diagram is public-safe and path-free.
- [x] Existing case image routes still work.
- [x] No horizontal overflow appears on desktop/mobile checks.
- [x] Public text does not introduce `面试` / `作品集` wording or sensitive credentials/endpoints.
- [x] `npm run lint` and `npm run build` pass in WSL.

## Verification Plan

- Browser-check `/cases/ozon-erp` at desktop and mobile widths.
- Run a quick image regression for existing case image routes.
- Run `npm run lint`.
- Run `npm run build`.
- Run a sensitive/public wording scan over `src`, `docs`, `public`, and active `.agent-work` files.
- Commit only after the evidence is clean.
