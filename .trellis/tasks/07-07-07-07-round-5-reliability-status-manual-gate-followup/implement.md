# Reliability Status Manual Gate Followup Implementation Plan

## Steps

1. Inspect status data, public status snapshots, reliability scripts, and relevant docs/specs.
2. Pick the smallest improvement that strengthens local reliability or manual gate validation.
3. Implement narrowly in `blog-semi`.
4. Run focused validation:
   - relevant `npm.cmd run *:synthetic`, `site:status`, or `reliability:check`;
   - `npm.cmd run lint`;
   - `npm.cmd run build`;
   - `npm.cmd run check:ui` if visible status UI changes;
   - `git diff --check`;
   - targeted sensitive scan.
5. Update this task with result, validation, and remaining manual gates.
6. Commit and push on `main`.

## Rollback

Revert the small status/script/docs change from this child task. Do not alter platform configuration, production status truth, or private credentials.

## Result

- Added `npm run status:contract` as a deterministic local check for reliability status data.
- The check validates:
  - unique lowercase status target, project, and reliability check ids;
  - every external status target has a `relatedTargetId` reliability check;
  - `public/status/*-synthetic.json` check ids map to `reliabilityProjects`;
  - synthetic statuses stay in `online | degraded | offline | unchecked`;
  - APK gates cannot report `online` while `publicDownloadApproved=false`;
  - synthetic snapshots avoid sensitive-looking field names, URLs, local paths, bearer tokens, and secret-like strings.
- Wired `status:contract` into `npm run verify` after project detail evidence checks.
- Updated observability and quality specs so future status/synthetic changes know to run this gate.

## Validation

- `npm.cmd run status:contract` passed.
- `npm.cmd run verify` passed.

## Manual Gates

- Legal RAG credentialed QA/contract/quality checks still need low-permission demo credentials.
- ERP login/plugin/sync checks still need a low-permission demo account or desensitized fixture.
- Pet/Xunqiu APK public release gates still need signed release artifacts, checksums, scan/regression evidence, rollback notes, and explicit approval.
- Platform observability integrations such as Cloudflare, Render, Aiven/Qdrant, Grafana, Umami/Plausible, Search Console, and ARMS remain user/platform tasks.
