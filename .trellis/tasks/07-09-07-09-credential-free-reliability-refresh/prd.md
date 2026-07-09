# Credential-free reliability status refresh

## Goal

Refresh low-sensitive public reliability status artifacts without production credentials or live model calls.

## Requirements

- Run the reliability suite with credential-free defaults.
- Preserve credentialed checks as skipped/gated when local env is not configured.
- Commit only low-sensitive generated status JSON.
- Run status/manual-gate guards after generation.

## Acceptance Criteria

- [x] `npm.cmd run reliability:check -- --timeout 20000 --step-timeout 140000` passes.
- [x] Reliability suite reports no failed steps.
- [x] Credentialed/manual-gated checks are not promoted to online without evidence.
- [x] `npm.cmd run status:contract` passes.
- [x] `npm.cmd run docs:manual-gates-check` passes.

## Notes

- Completed before writing this PRD because this is a status-evidence refresh. Result: `passed=8 failed=0 skipped=1`.
