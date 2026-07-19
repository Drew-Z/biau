# AI Daily production operations implementation

## Ordered Work

- [x] Finalize environment-variable and secret inventory.
- [x] Add Render build/start/schedule documentation for both Cron Jobs.
- [x] Add production-readiness configuration command with no network calls.
- [ ] Curate sources/query groups and run offline model evaluation.
- [ ] Configure metrics, diagnostics, retention, and alerts.
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

## Known Follow-up

- `performance:check` still reports the existing global CSS bundle at `243408` bytes against the `240000` byte budget. This slice did not change CSS; obsolete global styles should be removed in a separate performance task rather than raising the budget here.

## Completion Gate

The parent task completes only after the real edition passes and all manual production decisions are recorded.
