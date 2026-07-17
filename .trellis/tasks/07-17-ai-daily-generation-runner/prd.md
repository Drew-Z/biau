# AI Daily generation and durable runner

## Goal

Turn selected evidence into high-quality Chinese flash and daily compositions through structured model roles, deterministic validation, durable jobs, and measurable quality/freshness gates.

## Dependencies

- Requires `07-17-ai-daily-domain-foundation` complete.
- Requires `07-17-ai-daily-ingestion-evidence` to provide selection-versioned evidence packs.
- Produces generated revisions consumed by `07-17-ai-daily-studio-editorial`.

## Requirements

- Implement extractor, composer, and risk-triggered independent verifier roles with primary/fallback slots.
- Composer input is validated fact cards only; it cannot browse or invent URLs.
- Bind every verifiable sentence to stored evidence IDs and reject unknown or unfetched sources.
- Distinguish evidence hard failures, editable `NEEDS_EDITOR_REVIEW` findings, valid revisions, and rejected revisions.
- Add at least 30 evidence-labeled quality cases and enforce the parent quality thresholds.
- Implement `ingest-tick`, `editorial-tick`, manual run, compose, and resume orchestration over durable leases/checkpoints.
- Keep normal editions near 4-7 batched model calls.
- Enforce successful-evidence-to-review-ready p95 <=15 minutes.
- Make no live provider calls until a separately approved business acceptance run.

## Acceptance Criteria

- [ ] Extractor/composer/verifier mocks produce valid evidence-bound schemas.
- [ ] Hard evidence failures cannot create a draft.
- [ ] Non-critical findings create an immutable `NEEDS_EDITOR_REVIEW` revision.
- [ ] Corrected revisions must pass deterministic validation before becoming `VALID`.
- [ ] Quality report meets zero critical errors, 100% citation precision, >=98% coverage, >=85% minor-edit acceptance, and >=4/5 Chinese score.
- [ ] Leases, deadlines, resume, retries, and same-date concurrency are deterministic.
- [ ] Reruns never overwrite human-protected drafts or revisions.

## Validation

```powershell
npm.cmd run ai-daily:provider-check
npm.cmd run ai-daily:composition-check
npm.cmd run ai-daily:quality-check
npm.cmd run ai-daily:runner-check
npm.cmd run server:smoke
```
