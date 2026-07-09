# Analytics manual gate handoff

## Goal

Record that the default-off analytics adapter and route_view guard are ready, while Plausible/Umami provider choice remains a manual gate.

## Requirements

- Update `docs/manual-gates.md` with low-sensitive current state for the main-site analytics adapter.
- Keep provider choice, platform setup, site ids, tokens, and injected scripts as manual gates.
- Do not add secrets, dashboard URLs, provider script URLs, or real analytics identifiers.
- Validate manual-gate and observability docs after the update.

## Acceptance Criteria

- [x] Manual gates ledger says the default-off analytics adapter and `route_view` guard are ready.
- [x] Manual queue still says Plausible/Umami must be chosen by the user before production analytics collection.
- [x] `npm.cmd run docs:manual-gates-check` passes.
- [x] `npm.cmd run docs:observability-check` passes.

## Notes

- This is a documentation-only handoff slice.

## Completion Notes

- Updated `docs/manual-gates.md` current state and wake-up queue for the analytics adapter.
- Validation passed: `docs:manual-gates-check`, `docs:observability-check`.
