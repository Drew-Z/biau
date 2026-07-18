# AI Daily Studio editorial workspace design

## Views

- Runs: stages, profile, freshness, counts, backlog, duration, retry/cancel.
- Sources: registry, tier/topic/locale/cadence, health and lag.
- Candidates/Events: evidence, duplicates, cluster membership, scores and overrides.
- Flash Review: public preview, citations, approve/hold/correct/withdraw.
- Edition: selection, claims, verifier/quality findings, revision diff, draft and export navigation.

## State Safety

All writes carry an expected version/timestamp. Flash item approval and lifecycle
actions use `expectedPublicRevision`; correction creation additionally uses
`expectedRevisionSequence` and a source revision id. The repository locks the
item row before checking the version and shared transition guard. A withdrawn
item cannot be implicitly revived by approval, and a held item remains held
until an explicit release. Correction never mutates an approved flash
revision; it clones its evidence snapshot into a new draft revision. Manual
drafts bind to a selection version. Generated revisions cannot overwrite human
drafts. Edition writes lock the issue row and compare `expectedIssueUpdatedAt`
before every mutation. Generated correction uses an issue/source-scoped
idempotency key and appends a new immutable revision while retaining its
`sourceRevisionId`. Revalidation is deterministic and may only move a pending
or blocked revision to `VALID`, `NEEDS_EDITOR_REVIEW`, or terminal `REJECTED`.
Applying a valid revision restarts Content Studio review; published and
archived drafts are protected. The issue's `newEvidenceAvailable` flag is
recomputed from remaining pending/blocked revisions, so an older revision
cannot clear a newer one.

Edition's browser projection exposes bounded content previews and validation
findings only. Citation snapshots are normalized again before draft-body
projection, and the UI fixture keeps an applied historical revision alongside
an actionable pending revision so correction, revalidation, apply, and discard
are exercised without a live provider.

## Dependency Boundary

The UI consumes domain services from prior tasks; it does not reimplement state
transitions in production React code. The localhost UI-check fixture may apply a
small deterministic mirror solely to verify pending/success/error affordances;
it is never used when the Studio API is configured.

## Integration Gate

The route/database contract is intentionally separate from fixture checks. It
must run only with `AI_DAILY_DATABASE_CHECK=1` against a disposable PostgreSQL
database whose name ends in `_test`; production and shared Render/Supabase
databases are never acceptable test targets.
