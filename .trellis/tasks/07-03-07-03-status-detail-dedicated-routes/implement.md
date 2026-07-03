# Implement

## Steps

- [x] Extract shared status payload types, labels, merge helpers, and formatters into a reusable frontend module.
- [x] Update `SiteStatusPage` to use the shared module and route detail buttons to `/status/:projectId`.
- [x] Add `SiteStatusDetailPage` and route wiring in `src/App.tsx`.
- [x] Update `scripts/check-ui.mjs` for dedicated status routes.
- [x] Run `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:ui`.
- [x] Run `git diff --check` and sensitive scan.
- [ ] Update PRD checkboxes and archive after commit.

## Validation

- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed; Vite kept existing ineffective dynamic import warnings.
- `npm.cmd run check:ui`: passed against local preview.
- `git diff --check`: passed with Windows line-ending warnings only.
- Sensitive scan: only the frontend quality spec's own "do not write API keys/tokens" safety text matched; no real secrets were added.

## Rollback

If the route extraction causes unexpected UI regressions, revert the detail page and keep `/status` overview intact; the original anchor behavior can be restored from the previous `SiteStatusPage.tsx` diff.
