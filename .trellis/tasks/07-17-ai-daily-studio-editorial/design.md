# AI Daily Studio editorial workspace design

## Views

- Runs: stages, profile, freshness, counts, backlog, duration, retry/cancel.
- Sources: registry, tier/topic/locale/cadence, health and lag.
- Candidates/Events: evidence, duplicates, cluster membership, scores and overrides.
- Flash Review: public preview, citations, approve/hold/correct/withdraw.
- Edition: selection, claims, verifier/quality findings, revision diff, draft and export navigation.

## State Safety

All writes carry expected version/timestamp. Correction never mutates an approved flash revision. Manual drafts bind to a selection version. Generated revisions cannot overwrite human drafts.

## Dependency Boundary

The UI consumes domain services from prior tasks; it does not reimplement state transitions in React helpers.
