# AI Daily production operations implementation

## Ordered Work

- [x] Finalize environment-variable and secret inventory.
- [x] Add Render build/start/schedule documentation for both Cron Jobs.
- [x] Add production-readiness configuration command with no network calls.
- [ ] Curate sources/query groups and run offline model evaluation. (site owner confirmed the 2026-07-19 pre-review: 16 approved sources and 4 core query groups are enabled, 9 hold and 5 rejected sources plus 6 non-core query groups remain disabled; source curation is complete, while the separately gated real candidate-model evaluation remains)
- [ ] Configure metrics, diagnostics, retention, and alerts. (low-sensitive diagnostics/metrics, six-category failure projection, repository Grafana/Prometheus assets, offline contract checks, and guarded retention dry-run completed; retention mutation plus production scrape/import/notification routing remain)
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
- Operations now projects fixed `config` / `provider` / `evidence` / `quality` / `infrastructure` / `stale-content` signals, exposes the low-cardinality `biau_ai_daily_failure_signals` gauge, and includes repository-owned Grafana dashboard and Prometheus alert templates validated by `ai-daily:observability-contract-check` with no network calls.
- Retention now has a Studio-authenticated, bounded `retention-dry-run-v1` plan with fixed eligibility/block reasons and no mutation path. `ai-daily:retention-check` proves current evidence, public/current-approved Flash, revision history, and approval audit history remain protected.
- `server/data/ai-daily-source-manifest.v1.json` now records 30 reviewed sources and 10 reviewed discovery query groups, with 16/4 approved entries enabled and hold/rejected entries disabled. `ai-daily:manifest-check` validates schema, public URL/domain rules, unique canonical identity, query budgets, review thresholds, and enabled/review consistency without network calls.
- `ai-daily:model-evaluation-check` now validates the 40-case fixture contract for extractor/composer/verifier selection, recomputed case-set hashes, existing quality floors, deterministic ranking, independent failure-domain fallbacks, low-sensitive immutable records, and explicit human approval. It performs zero provider calls and does not close the real candidate-model evaluation gate.
- `docs/ai-daily-source-review-2026-07-19.md` records the public-page source/query pre-review, owner confirmation, extraction and attribution boundaries, and the remaining real-model/edition gates. No model was called by the approval transition.
- The production model slice now has a server-only runtime config, an OpenAI-compatible structured provider without `temperature`, serial three-role business evaluation, tamper-evident proposal/approval artifacts, runtime channel drift checks, and mutually exclusive `--fixture`/`--live` runner profiles. All deterministic checks use loopback or fixture providers and make zero external calls.
- Model evaluation now reads a versioned 30-case golden asset with six required categories and eight required negative slices. Candidate/report schemas bind category and sorted negative tags, business profiles must match the repository case set, and per-slice floors prevent a weak hallucination/citation class from being hidden by the global average. The evaluation/proposal/bundle schemas moved to v2; no real model was called by this migration.
- Business execution evidence now binds `resultSetHash` to the canonical SHA-256 of the complete measured case array; a format-valid stale or substituted hash is rejected with `business-result-set-hash-mismatch`, with a regression test covering post-hash case tampering. No real model was called by this change.
- Golden descriptor versions now carry a normalized full-case content fingerprint, so scenario/outcome/score drift invalidates old proposals even without a manual version bump. Extractor, composer, and verifier also inject and assert every declared negative-tag challenge before a business case can be recorded. Deterministic checks cover both contracts with zero provider calls.
- Production approval delivery now uses an explicit Render Secret File contract: Studio and every future Editorial Cron that executes live work each point `AI_DAILY_MODEL_APPROVAL_FILE` at `/etc/secrets/ai-daily-model-approval.v1.json`, bind the same human-approved canonical hash through `AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH`, and validate file integrity plus runtime identity with `ai-daily:model-approval-check` before live work. The real per-service file upload and hash value remain a human gate; Ingest Cron receives no model credentials.
- The first-edition acceptance manifest contract now binds the approved proposal/bundle, `PRODUCTION` issue/run/date, Studio review and draft version, Publish Export checks, five deployment observations, and rollback readiness. `ai-daily:acceptance-check` covers hash tampering, fixture rejection, cross-stage mismatches, failed export/deployment, sensitive fields, and old schema with zero provider calls; `ai-daily:acceptance` provides `init`, `check`, and `seal` for the Git-ignored local record. Production readiness reports the contract as pass and the real sealed record as a separate manual gate.
- The Studio Render Blueprint now explicitly keeps both metrics switches disabled, and the deployment contract prevents either default from drifting. The Prometheus template raises a dedicated critical alert when the AI Daily operations snapshot remains unavailable for five minutes; the observability contract verifies that rule separately from the six failure categories.
- No delete/archive path was added. Explicit mutation design, production alert routing, backups, and rollback validation remain follow-up work.

## Known Follow-up

- The frontend performance follow-up is now closed by the archived `07-19-frontend-css-budget-cleanup` task. Current production output passes at `236074 / 240000` CSS bytes and `354307 / 430000` JS bytes.

## Production Slice Status

- Implemented: runtime channel parsing, provider adapter, serial business evaluator, approval artifacts, production provider binding, runner profile isolation, Secret File/hash delivery contract, acceptance manifest/CLI and tamper contract, readiness reporting, and deployment/manual-gate documentation.
- Still manual: execute the approved real business evaluation, review the proposal, create the approval bundle, run one real edition, fill and seal the acceptance manifest after Studio review/export/deployment observation, and only then enable Cron/public feed.
- Guardrail: no automated health check or deploy hook invokes a model; no fixture result can be promoted to production approval.

## Completion Gate

The parent task completes only after the real edition passes and all manual production decisions are recorded.
