# Manual gates assistant admin queue refresh

## Goal

Record the improved internal assistant admin refresh workflow in the manual gates ledger so the user has a clear next manual action after waking up.

## Requirements

- Add a low-sensitive current record for `/assistant/admin` refresh-all and full `verify` success.
- Add the internal assistant member/channel review to the wake-up recommended queue.
- Preserve all secret boundaries: no real admin token, member token, model endpoint, provider key, database URL, RAG URL, or private content.
- Run the manual gates documentation guard.

## Acceptance Criteria

- [x] `docs/manual-gates.md` mentions the internal assistant admin "刷新全部状态" path.
- [x] Wake-up queue includes a clear member/channel review step.
- [x] `npm.cmd run docs:manual-gates-check` passes.

## Notes

- This is documentation-only and records low-sensitive evidence from local checks.

## Completion Notes

- Added an internal assistant admin/member-channel manual gate row.
- Recorded the refresh-all workflow, no-token UI guard, and full `npm.cmd run verify` low-sensitive pass.
- Moved the wake-up queue to start with internal assistant admin quick review, followed by Studio, Legal RAG, ERP, mobile release gates, and analytics/observability.
- Verified `npm.cmd run docs:manual-gates-check`.
