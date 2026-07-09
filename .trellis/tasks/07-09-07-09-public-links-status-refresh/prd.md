# Public links status evidence refresh

## Goal

Refresh the low-sensitive public-link status snapshot after the live public link check passed.

## Requirements

- Run `public-links:check` with `--write-status public/status/public-links-synthetic.json`.
- Keep the generated status payload low-sensitive: counts, status, summary, issue classes only; no full public link list.
- Regenerate site status so the status page can consume the latest public-link evidence.
- Run status/document guards needed for changed generated status data.

## Acceptance Criteria

- [x] `public/status/public-links-synthetic.json` reflects the latest successful public-link check.
- [x] `npm.cmd run public-links:check -- --write-status public/status/public-links-synthetic.json` passes.
- [x] `npm.cmd run site:status` passes.
- [x] `npm.cmd run status:contract` passes.
- [x] `npm.cmd run docs:manual-gates-check` passes.

## Notes

- This task may perform public HEAD/GET checks, but does not call models, read secrets, or store URLs in the generated status payload.

## Completion Notes

- Refreshed `public/status/public-links-synthetic.json`: `34/34` public project links returned expected responses, `failedCount=0`.
- Regenerated `public/status/site-status.json`: 5 targets, `online=5`, `degraded=0`, `offline=0`, `unchecked=0`.
- Confirmed the public-link status payload stores only low-sensitive counts, status, duration, summary, and issues.
- Verified `public-links:check -- --write-status`, `site:status`, `status:contract`, and `docs:manual-gates-check`.
