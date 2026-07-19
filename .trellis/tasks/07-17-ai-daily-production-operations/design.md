# AI Daily production operations design

## Deployment

- Ingest Cron: source collection, broad discovery, and evidence fetch.
- Editorial Cron: generation, flash refresh, approved manual work, and daily composition.
- Existing Studio service: authenticated editorial UI plus isolated public projection routes.
- Existing PostgreSQL: authoritative jobs, evidence, editorial, and projection state.

## Acceptance Method

Configuration readiness is offline and never calls providers. The only live acceptance is a user-approved real edition that produces useful editorial output.

## Model Evaluation Contract

- Extractor, composer, and verifier candidates are scored independently on one versioned BIAU-owned case set, prompt version, generation schema version, and quality profile.
- Candidate records bind case descriptors to a recomputed SHA-256 hash and retain only low-sensitive model/channel aliases, execution metadata, aggregate quality, latency, and usage summaries.
- Primary ordering is acceptance, Chinese editorial score, citation coverage, citation precision, p95 latency, then stable candidate id.
- A fallback must pass every absolute quality floor, remain within five percentage points of the primary acceptance rate, and use a different failure-domain alias.
- Fixture records validate the contract only and cannot be production-approved. Business records require explicit execution evidence, remain pending after selection, and require human approval.

## Rollback

Disable both Cron Jobs and the public feed feature flag. Preserve database history and keep manual Studio/offline draft workflows available.
