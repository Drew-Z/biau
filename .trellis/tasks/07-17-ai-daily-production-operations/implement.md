# AI Daily production operations implementation

## Ordered Work

- [x] Finalize environment-variable and secret inventory.
- [x] Add Render build/start/schedule documentation for both Cron Jobs.
- [x] Add production-readiness configuration command with no network calls.
- [ ] Curate sources/query groups and run offline model evaluation. (versioned 30-source/10-query-group candidate pack and offline manifest contract completed; human source approval and real candidate-model evaluation remain)
- [ ] Configure metrics, diagnostics, retention, and alerts. (low-sensitive diagnostics/metrics and guarded retention dry-run completed; mutation and production alert routing remain)
- [x] Run the full deterministic quality gate.
- [ ] Obtain approval and run one real edition.
- [ ] Review/approve selected flashes and the daily draft, export, deploy, and verify public behavior.
- [ ] Record final runbook, manual gates, and rollback.

## Local Slice Completed

- `AI_DAILY_TIME_ZONE` now derives the edition date in `Asia/Shanghai` by default.
- Ingest deadlines reuse the bounded interval-minus-two-minutes policy and remain shorter than the feed cadence.
- `AI_DAILY_PUBLIC_FEED_ENABLED` is fail-closed by default; the Render blueprint keeps it disabled until the manual public-feed gate passes.
- `ai-daily:production-readiness-check` reports repository readiness and manual gates without network calls.
- `ai-daily:contracts-check` runs the fixture/loopback contract suite; disposable PostgreSQL checks require explicit `--with-database` and `AI_DAILY_DATABASE_CHECK=1`.
- The full production-preview UI gate passes after the flow worker gained a token-correlated reduced-motion acknowledgement instead of relying on fixed test delays.
- Real provider selection, production Cron activation, source approval, live edition acceptance, and database deployment remain manual gates.
- Studio now exposes a token-protected read-only AI Daily operations snapshot; Studio `/metrics` appends the same low-cardinality data when metrics are explicitly enabled.
- Source health, run/stage state, work backlog/expired leases, bounded quality outcomes, public feed age, and retention-due counts are covered by `ai-daily:operations-check` without a database or network.
- Retention now has a Studio-authenticated, bounded `retention-dry-run-v1` plan with fixed eligibility/block reasons and no mutation path. `ai-daily:retention-check` proves current evidence, public/current-approved Flash, revision history, and approval audit history remain protected.
- `server/data/ai-daily-source-manifest.v1.json` now records 30 disabled source candidates and 10 disabled discovery query groups with rationale and per-item review state. `ai-daily:manifest-check` validates schema, public URL/domain rules, unique canonical identity, query budgets, and pending-review fail-closed behavior without network calls.
- No delete/archive path was added. Explicit mutation design, production alert routing, backups, and rollback validation remain follow-up work.

## Known Follow-up

- The frontend performance follow-up is now closed by the archived `07-19-frontend-css-budget-cleanup` task. Current production output passes at `236074 / 240000` CSS bytes and `354307 / 430000` JS bytes.

## Completion Gate

The parent task completes only after the real edition passes and all manual production decisions are recorded.
