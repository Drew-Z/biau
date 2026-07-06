# Pet APK Showcase Gate Followup Implementation Plan

## Steps

1. Inspect Pet repo rules, scripts, README, APK/output paths, and git state.
2. Inspect main-site Pet status data, `pet:synthetic`, and current public status snapshot.
3. Choose the smallest safe improvement that prevents debug/stage artifacts from being treated as public releases.
4. Implement in `blog-semi` or Pet depending on the actual gap.
5. Run focused validation.
6. Update task result/manual gates.
7. Commit and push `blog-semi`; commit Pet only if safe and aligned with repo rules.

## Rollback

Revert the narrow status/script/docs/showcase change. Do not delete local APK artifacts or alter signing/release configuration.

## Result

- Inspected Pet workspace README, `gamer/` rules, README, package scripts, and git state.
- Confirmed Pet root is a coordination workspace, while `gamer/` is the app/community Git repo.
- Left `gamer/` untouched because it already had many existing modified files.
- Updated `scripts/check-pet-showcase-synthetic.mjs` so `pet:synthetic` now emits a dedicated `pet-apk-gate` check from the existing sanitized `apkGate` metadata.
- The new check stays `unchecked` until `publicDownloadApproved=true`; it reports that formal release requires signing, checksum, scan/regression evidence, rollback note, and human approval.
- Regenerated `public/status/pet-gamer-synthetic.json` and `public/status/site-status.json` so `/status` can show the latest Pet APK gate evidence instead of relying only on static planned text.

## Validation

- `npm.cmd run pet:synthetic` passed.
- `npm.cmd run site:status` passed with 5/5 public targets online.
- `npm.cmd run status:contract` passed.
- `npm.cmd run verify` passed.

## Manual Gates

- Pet public APK download remains gated. It still needs a formal signed release APK/AAB, SHA-256 or equivalent checksum, version notes, scan/regression evidence, rollback note, and explicit approval.
- `gamer/` had pre-existing dirty files, so this task intentionally avoided editing or committing that repository.
