# Implementation Plan

## Checklist

- [x] Load current manual gates, status target, and frontend state specs.
- [x] Add reliability-project extraction to `scripts/check-manual-gates.mjs`.
- [x] Add explicit ledger coverage requirements for every current reliability project.
- [x] Update `docs/manual-gates.md` with the drift-check convention.
- [x] Run targeted validation, negative checks, lint/build/verify as needed.
- [x] Archive and commit the child task.

## Validation Commands

- `npm.cmd run docs:manual-gates-check`
- Negative check for an unknown reliability project id.
- Negative check for a removed ledger coverage phrase.
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
- `git diff --check`
- Diff-level sensitive scan over changed files.

## Validation Results

- `npm.cmd run docs:manual-gates-check` passed after adding status-project ledger coverage.
- Negative check: temporarily injected `codex-fake-project` into `src/data/statusTargets.ts`; `docs:manual-gates-check` failed with the expected missing coverage mapping error, then the file was restored.
- Negative check: temporarily removed the `Legal RAG 公开 demo 凭据` coverage phrase from `docs/manual-gates.md`; `docs:manual-gates-check` failed with the expected missing coverage phrase error, then the file was restored.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed; Vite reported only the existing ineffective dynamic import warnings.
- `npm.cmd run verify` passed, including the strengthened `docs:manual-gates-check`, status contract, preview, and UI checks.
- `git diff --check` passed.
- Diff-level sensitive scan over changed files returned no matches.
