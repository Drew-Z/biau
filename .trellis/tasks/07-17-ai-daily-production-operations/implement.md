# AI Daily production operations implementation

## Ordered Work

- [x] Finalize environment-variable and secret inventory.
- [x] Add Render build/start/schedule documentation for both Cron Jobs.
- [x] Add production-readiness configuration command with no network calls.
- [ ] Curate sources/query groups and run offline model evaluation. (site owner confirmed the 2026-07-19 pre-review: 16 approved sources and 4 core query groups are enabled, 9 hold and 5 rejected sources plus 6 non-core query groups remain disabled; source curation is complete, while the separately gated real candidate-model evaluation remains)
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
- Real provider selection, production Cron activation, live edition acceptance, and database deployment remain manual gates; source/query curation is now approved with a bounded enabled subset.
- Studio now exposes a token-protected read-only AI Daily operations snapshot; Studio `/metrics` appends the same low-cardinality data when metrics are explicitly enabled.
- Source health, run/stage state, work backlog/expired leases, bounded quality outcomes, public feed age, and retention-due counts are covered by `ai-daily:operations-check` without a database or network.
- Retention now has a Studio-authenticated, bounded `retention-dry-run-v1` plan with fixed eligibility/block reasons and no mutation path. `ai-daily:retention-check` proves current evidence, public/current-approved Flash, revision history, and approval audit history remain protected.
- `server/data/ai-daily-source-manifest.v1.json` now records 30 reviewed sources and 10 reviewed discovery query groups, with 16/4 approved entries enabled and hold/rejected entries disabled. `ai-daily:manifest-check` validates schema, public URL/domain rules, unique canonical identity, query budgets, review thresholds, and enabled/review consistency without network calls.
- `ai-daily:model-evaluation-check` now validates the 40-case fixture contract for extractor/composer/verifier selection, recomputed case-set hashes, existing quality floors, deterministic ranking, independent failure-domain fallbacks, low-sensitive immutable records, and explicit human approval. It performs zero provider calls and does not close the real candidate-model evaluation gate.
- `docs/ai-daily-source-review-2026-07-19.md` records the public-page source/query pre-review, owner confirmation, extraction and attribution boundaries, and the remaining real-model/edition gates. No model was called by the approval transition.
- The production model slice now has a server-only runtime config, an OpenAI-compatible structured provider without `temperature`, serial three-role business evaluation, tamper-evident proposal/approval artifacts, runtime channel drift checks, and mutually exclusive `--fixture`/`--live` runner profiles. All deterministic checks use loopback or fixture providers and make zero external calls.
- No delete/archive path was added. Explicit mutation design, production alert routing, backups, and rollback validation remain follow-up work.

## Known Follow-up

- The frontend performance follow-up is now closed by the archived `07-19-frontend-css-budget-cleanup` task. Current production output passes at `236074 / 240000` CSS bytes and `354307 / 430000` JS bytes.

## Production Slice Status

- Implemented: runtime channel parsing, provider adapter, serial business evaluator, approval artifacts, production provider binding, runner profile isolation, readiness reporting, and deployment/manual-gate documentation.
- Still manual: execute the approved real business evaluation, review the proposal, create the approval bundle, run one real edition, review/export/deploy it, and only then enable Cron/public feed.
- Guardrail: no automated health check or deploy hook invokes a model; no fixture result can be promoted to production approval.

## Completion Gate

The parent task completes only after the real edition passes and all manual production decisions are recorded.
