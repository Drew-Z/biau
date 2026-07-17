# AI Daily generation and durable runner design

## Generation

```text
evidence pack
  -> batched fact extractor
  -> strong Chinese composer
  -> risk classifier
  -> independent verifier for high-risk claims
  -> deterministic citation/wording gate
  -> immutable generated revision
```

Model identifiers remain configuration. Domain contracts are provider-neutral structured schemas.

## Outcomes

- Evidence minimum failure: run `COMPLETED_WITH_GAPS`, issue `NEEDS_MORE_EVIDENCE`.
- Non-critical quality finding: run `COMPLETED`, revision `NEEDS_EDITOR_REVIEW`, issue `EVIDENCE_READY`.
- Valid composition: revision `VALID`; it may create the first hidden assisted draft.
- Infrastructure/database/schema failure: run `FAILED`.

## Runner

Ingestion and editorial commands share PostgreSQL work records, leases, idempotency keys, deadlines, and checkpoint resume. No long work occurs in HTTP requests.
