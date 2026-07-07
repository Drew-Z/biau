# Round 13 status manual gate ledger sync

## Goal

Strengthen the manual gates ledger check so status reliability projects and their human-gated categories stay covered by docs/manual-gates.md.

## Requirements

- R1. Keep `docs/manual-gates.md` as the single public-safe ledger for human-only work.
- R2. Extend the existing manual gates check so it detects drift between `src/data/statusTargets.ts` reliability projects and the ledger.
- R3. Every reliability project rendered on status detail pages must have explicit ledger coverage for its human-gated work.
- R4. New reliability projects without ledger coverage should fail `npm.cmd run docs:manual-gates-check`.
- R5. Do not add live checks, cloud calls, model calls, credentials, or production URLs.

## Acceptance Criteria

- [x] `npm.cmd run docs:manual-gates-check` validates all current reliability projects have ledger coverage.
- [x] The check fails if a reliability project exists without a coverage mapping.
- [x] The check fails if a required ledger coverage phrase is removed.
- [x] `docs/manual-gates.md` documents that status reliability projects are checked against the ledger.
- [x] Required local validation passes.

## Out of Scope

- Adding or changing production monitoring.
- Calling external project APIs.
- Reworking the status page UI.
