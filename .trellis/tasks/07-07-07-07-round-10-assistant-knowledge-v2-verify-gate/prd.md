# Round 10 assistant knowledge V2 verify gate

## Goal

Wire the existing `assistant:kg-check` into the full `verify` gate and update docs/specs so public assistant V2 knowledge graph quality cannot drift outside normal release checks.

## Requirements

- R1. `npm.cmd run verify` must run `assistant:kg-check` immediately after regenerating assistant knowledge.
- R2. Documentation and quality specs that describe `verify` must mention the V2 knowledge graph check.
- R3. Keep the check local and deterministic; do not call model providers, external vector databases, RAG services, cloud platforms, or production APIs.
- R4. Do not change public assistant answer behavior in this task.
- R5. Preserve existing `assistant:index`, `assistant:meta-check`, and other verify steps.

## Acceptance Criteria

- [x] `scripts/verify.mjs` runs `npm.cmd run assistant:kg-check`.
- [x] Relevant docs/specs describe `verify` as covering assistant V2 knowledge graph freshness and retrieval baseline.
- [x] `npm.cmd run assistant:index`, `npm.cmd run assistant:kg-check`, `npm.cmd run verify`, `npm.cmd run lint`, and `npm.cmd run build` pass.
- [x] No secrets, private URLs, model provider details, or production credentials are committed.
- [x] Changes are committed locally; push remains deferred until SSH host key verification is resolved.

## Notes

- `assistant:kg-check` already asserts generated `server/data/public-knowledge-v2.json` is fresh, public, entity/relation typed, and answers a few deterministic citation queries.
- This task only ensures that existing gate is part of the normal release path.

## Result

- Added `assistant:kg-check` immediately after `assistant:index` in `scripts/verify.mjs`.
- Updated backend/frontend quality specs to state that `verify` covers assistant V2 knowledge graph checks.
- Updated deployment and Codex workflow docs so contributors know `assistant:kg-check` is the quick local check for public assistant V2 knowledge structure and retrieval baseline.

## Validation

- `npm.cmd run assistant:index` passed.
- `npm.cmd run assistant:kg-check` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- `npm.cmd run verify` passed and executed `assistant:kg-check` as the second step.
- `git diff --check` passed with only Windows CRLF warnings.
- Secret-like scan over changed and untracked files found no real credentials or connection strings.

## Manual Gates

- Push remains deferred until the GitHub SSH host key verification gate is resolved.
- External vector DB/RAG Orchestrator production sync, live model evaluation, and cloud deployment checks remain human-approved tasks.
