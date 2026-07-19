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
- The repository-owned golden set has 30 cases across six categories and eight fixed negative tags. Its normalized scenario/outcome/score payload contributes a content fingerprint to every role descriptor version. Business records must exactly match those role-local descriptors; category and negative-tag slice floors block approval even when the global average passes.
- Extractor, composer, and verifier each receive role-specific challenge inputs for every declared negative tag. The evaluator fails before recording a case when the exercised tag set drifts from the golden contract.
- Candidate records bind case descriptors to a recomputed SHA-256 hash and, for business evaluations, bind `executionEvidence.resultSetHash` to the canonical SHA-256 of the complete measured case array. They retain only low-sensitive model/channel aliases, execution metadata, aggregate quality, latency, and usage summaries.
- Primary ordering is acceptance, Chinese editorial score, citation coverage, citation precision, p95 latency, then stable candidate id.
- A fallback must pass every absolute quality floor, remain within five percentage points of the primary acceptance rate, and use a different failure-domain alias.
- Fixture records validate the contract only and cannot be production-approved. Business records require explicit execution evidence, remain pending after selection, and require human approval.

## Runtime Provider And Live Execution

- `AI_DAILY_MODEL_RUNTIME_JSON` is a server-only channel/candidate map. Channels own credentials and failure-domain aliases; candidates bind extractor/composer/verifier ids to channels.
- The provider adapter uses OpenAI-compatible structured chat completion, omits `temperature`, bounds runtime inputs, and exposes only stable error categories. Endpoint compatibility fallback is allowed only after `404/405`; network, timeout, authentication, rate-limit, invalid-response, and `5xx` failures do not resubmit the same model task to another guessed path.
- Real evaluation is serial and requires `--execute`, an enabled environment gate, and a matching approval id. It writes a Git-ignored proposal that retains aggregate scores/hashes but no prompt, source text, raw output, endpoint, or credential.
- Human approval creates a tamper-evident bundle. Live execution revalidates bundle hashes and runtime provider/failure-domain/model identity, then claims only `PRODUCTION` work. Fixture execution claims only `FIXTURE` work.

## Rollback

Disable both Cron Jobs and the public feed feature flag. Preserve database history and keep manual Studio/offline draft workflows available.
