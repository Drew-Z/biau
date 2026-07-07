# Round 12 manual gates ledger

## Goal

Create a public-safe manual gate ledger for cloud, credentials, live model checks, observability, APK release, and production verification items, with a deterministic docs check.

## Background

- Manual gates are currently mentioned across deployment, observability, Studio / AI Daily, status, and synthetic-check docs.
- The long-running goal explicitly says manual platform, credential, live model, and APK publication steps should be recorded without blocking local work.
- A single public-safe ledger will make it easier for the user to handle manual tasks later and for future agents to avoid accidental live checks or secret exposure.

## Requirements

- R1. Add a central public-safe manual gate ledger under `docs/`.
- R2. The ledger must cover cloud/platform setup, credentials, live model tasks, Studio / AI Daily, reliability/observability, project demo gates, and APK/release gates.
- R3. The ledger must describe recommended local evidence or next action without containing real keys, URLs, passwords, tokens, private dashboards, or exact production metrics.
- R4. Existing docs that already mention manual gates should link to the central ledger.
- R5. Add a deterministic docs check and include it in the default verification path.

## Acceptance Criteria

- [x] `docs/manual-gates.md` exists and contains required gate categories.
- [x] `docs/observability-strategy.md`, `docs/site-monitoring.md`, and `docs/studio-ai-daily-production-readiness.md` link to the ledger.
- [x] A local script fails if the ledger loses required categories, loses cross-links, or gains secret-looking content.
- [x] `npm.cmd run docs:manual-gates-check` passes.
- [x] `npm.cmd run verify` includes the manual gate check.
- [x] No real credentials, private endpoints, or local absolute paths are added.

## Out of Scope

- Performing any manual gate.
- Changing cloud dashboards, scheduled jobs, production env vars, or deployment settings.
- Running live model/provider checks.

## Results

- Added `docs/manual-gates.md` as the public-safe cross-project human-action queue.
- Added `scripts/check-manual-gates.mjs` and `npm.cmd run docs:manual-gates-check`.
- Wired `docs:manual-gates-check` into `npm.cmd run verify`.
- Linked the ledger from observability, site monitoring, and Studio / AI Daily production readiness docs.
- Expanded `docs:observability-check` to assert the observability-related ledger content.

## Verification

- `npm.cmd run docs:manual-gates-check`
- `npm.cmd run docs:observability-check`
- `npm.cmd run verify`
- `git diff --check`
- Diff-level sensitive scan for newly added secret-like values: no matches.
