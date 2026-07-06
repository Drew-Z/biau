# Reliability Status Local Evidence Hardening Design

## Scope

Target the main-site reliability observation pipeline:

- `scripts/generate-site-status.ts`
- `scripts/check-status-contract.ts`
- `src/data/siteStatusView.ts` if display helpers are needed
- `src/pages/SiteStatusPage.tsx` / `src/pages/SiteStatusDetailPage.tsx` only if the generator cannot express the new evidence clearly
- `package.json` and `scripts/verify.mjs` if a new check is added

## Design Direction

The smallest useful improvement is to treat synthetic snapshot age as part of the evidence. A check that passed two days ago should not read the same as a check that passed five minutes ago.

Add a deterministic freshness helper in the status generation/check layer:

- parse `checkedAt` from each synthetic check;
- compute age against the current `site:status` generation time;
- classify freshness as fresh / aging / stale / unknown using conservative local thresholds;
- append low-sensitive checked-at and freshness wording to the merged reliability evidence.

Recommended thresholds:

- fresh: <= 24h
- aging: > 24h and <= 72h
- stale: > 72h
- unknown: missing or invalid `checkedAt`

The status value should not automatically become `offline` only because a snapshot is stale. Staleness is evidence quality, not proof the project is broken. If needed, stale evidence can downgrade online synthetic status to `degraded`, but keep planned/manual-gated checks as planned.

## Safety

- Do not fetch extra URLs for freshness; use committed/generated status JSON only.
- Do not include raw URLs, credentials, request bodies, or provider diagnostics in new evidence text.
- Keep all freshness wording about evidence age, not production SLA.

## Compatibility

Existing status JSON can continue to expose `reliabilityProjects` in the same shape because `evidence` is already a string. A future richer UI can add structured fields later, but this slice should avoid a broad data migration.

## Validation

- `npm.cmd run status:contract`
- `npm.cmd run site:status`
- `npm.cmd run check:ui` with preview
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
