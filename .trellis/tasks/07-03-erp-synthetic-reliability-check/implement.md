# Implement

## Checklist

1. Read applicable Trellis specs through `trellis-before-dev`.
2. Add `scripts/check-erp-synthetic.mjs`.
3. Add `erp:synthetic` package script.
4. Update `scripts/generate-site-status.ts` to merge ERP synthetic output.
5. Update Ozon ERP status next-actions in `src/data/statusTargets.ts`.
6. Run validation and sensitive scan.
7. Commit, push, archive, journal.

## Validation Commands

- `npm.cmd run erp:synthetic`
- `npm.cmd run site:status`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run check:ui`
- `git diff --check`
- Sensitive scan over changed and untracked files.

## Human Gates

- Do not add real ERP username/password to repo.
- Do not create a production account.
- Do not enable scheduled production checks or alerting.
- Do not expose demo credentials on `/status`.

## Rollback

- Remove `scripts/check-erp-synthetic.mjs`.
- Remove `erp:synthetic` script.
- Revert status merge changes and regenerate `public/status/site-status.json`.

## Validation Notes

- `npm.cmd run erp:synthetic` passes without `ERP_SYNTHETIC_API_BASE_URL` and writes low-sensitive `unchecked` output.
- A local ephemeral API verified the configured-base/no-credentials path: health and auth bootstrap are attempted; plugin sync remains `unchecked`.
- A local ephemeral API verified the configured-base/credentials path: health, auth bootstrap, and login shape pass; plugin sync remains `unchecked` until a low-sensitive fixture exists.
- `npm.cmd run site:status` merges `public/status/erp-synthetic.json` through the generic `*-synthetic.json` loader.
- `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:ui` pass.
- `git diff --check` passes; sensitive scan found only environment variable names and sanitized token-shape checks, no real secret.
