# Pet showcase APK release gate implementation plan

## Checklist

- [x] Start the Trellis child task.
- [x] Load relevant BIAU Port specs before editing synthetic/status files.
- [x] Read Pet workspace/subproject rules and identify the public showcase source.
- [x] Run `npm.cmd run pet:synthetic` and inspect the generated report.
- [x] Check whether main-site status/project copy accurately reflects the APK gate.
- [x] If needed, improve script/report/status copy so debug-only artifacts cannot appear as public downloads.
- [x] Run final BIAU Port checks: `pet:synthetic`, `site:status`, `lint`, `build`, `check:ui`, `git diff --check`, sensitive scan.
- [ ] Commit and push BIAU Port changes on `main`.
- [ ] Archive the child task after verification.

## Manual Gates

- User must approve public APK release after reviewing a signed release APK/AAB, version notes, checksum, scan/regression evidence, and rollback path.
- Any signing credentials, private artifact stores, CI worker URLs, or release upload tokens must remain platform-side only.
- If a Pet backend/community API is deployed later, its health/auth smoke and metrics require separate environment configuration.
