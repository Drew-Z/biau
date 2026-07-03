# Implement

## Checklist

1. Read applicable Trellis specs through `trellis-before-dev`.
2. Add `scripts/check-xunqiu-synthetic.mjs`.
3. Add `xunqiu:synthetic` package script.
4. Update Xunqiu status next-actions in `src/data/statusTargets.ts`.
5. Generate `public/status/xunqiu-synthetic.json`.
6. Run validation and sensitive scan.
7. Commit, push, archive, journal.

## Validation Commands

- `npm.cmd run xunqiu:synthetic`
- Local ephemeral API check for configured-base path.
- `npm.cmd run site:status`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run check:ui`
- `git diff --check`
- Sensitive scan over changed and untracked files.

## Human Gates

- Do not add a real Xunqiu API base URL to repo.
- Do not use real phone/password/token.
- Do not expose APK download links or release artifacts.
- Do not enable scheduled production checks or alerting.

## Rollback

- Remove `scripts/check-xunqiu-synthetic.mjs`.
- Remove `xunqiu:synthetic` script.
- Remove `public/status/xunqiu-synthetic.json`.
- Revert status data wording and regenerate `public/status/site-status.json`.

## Validation Notes

- `npm.cmd run xunqiu:synthetic` passes without `XUNQIU_SYNTHETIC_API_BASE_URL` and writes low-sensitive `unchecked` output.
- A local ephemeral API verified the configured-base path: health returns `UP`, four compatibility endpoints return legacy `status=0`, and APK gate remains `unchecked`.
- `npm.cmd run site:status` merges `public/status/xunqiu-synthetic.json` through the generic `*-synthetic.json` loader.
- `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:ui` pass.
- `git diff --check` and sensitive scan were run before commit.
