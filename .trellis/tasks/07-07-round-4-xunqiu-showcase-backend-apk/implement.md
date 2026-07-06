# Xunqiu showcase backend and APK consistency implementation plan

## Checklist

- [x] Start the Trellis child task.
- [x] Load relevant BIAU Port specs before editing synthetic/status files.
- [x] Read Xunqiu showcase/backend local rules and scripts.
- [x] Improve `scripts/check-xunqiu-synthetic.mjs` for report preservation, low-sensitive error classes, and sanitized APK gate metadata.
- [x] Run `npm.cmd run xunqiu:synthetic` and inspect the generated report.
- [x] Run `npm.cmd run site:status -- --timeout 20000`.
- [x] Update `src/data/statusTargets.ts` and parent `manual-gates.md` if the evidence needs clearer public wording.
- [x] Run final BIAU Port checks: `xunqiu:synthetic`, `site:status`, `lint`, `build`, `check:ui`, `git diff --check`, sensitive scan.
- [ ] Commit and push BIAU Port changes on `main`.
- [ ] Archive the child task after verification.

## Manual Gates

- Production backend synthetic requires `XUNQIU_SYNTHETIC_API_BASE_URL` pointing at the public `/free_kicker` base.
- Formal APK public release requires signing policy, version notes, checksum, scan/regression evidence, rollback note, and explicit approval.
- Render, R2, database, object storage, and old-backend migration settings remain platform-side only.
