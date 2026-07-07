# Design

## Scope

Modify:

- `scripts/check-status-contract.ts`

Optionally update frontend quality/status specs if the implementation reveals a reusable convention.

## Approach

`check-status-contract.ts` already imports the source-of-truth static status data and reads generated files from `public/status`. Extend the existing `checkMergedSiteStatusEvidence()` path so it also compares generated ID sets against source ID sets:

- generated `targets[].id` must equal `siteStatusTargets[].id`;
- generated `reliabilityProjects[].id` must equal `reliabilityProjects[].id`;
- for each generated reliability project, generated `checks[].id` must equal the matching source project's `checks[].id`.

The comparison should be order-insensitive and report missing/extra IDs with a stable label.

## Compatibility

This is an offline contract check only. It does not change the generated JSON format, site UI, live status fetching, synthetic snapshot format, or production monitoring behavior.
