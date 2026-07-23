# AI Daily production operations design

## Deployment

- Ingest Cron: source collection, broad discovery, and evidence fetch.
- Editorial Cron: generation, flash refresh, approved manual work, and daily composition.
- Existing Studio service: authenticated editorial UI plus isolated public projection routes.
- Existing PostgreSQL: authoritative jobs, evidence, editorial, and projection state.

## Acceptance Method

Configuration readiness is offline and never calls providers. The only live acceptance is a user-approved real edition that produces useful editorial output.

The first live edition is queued from the authenticated Studio workspace after an exact second confirmation. The API validates the current Edition version, evidence floor, production flag, runtime, and approval bundle before returning `202`. A process-local poller consumes only durable `PRODUCTION` work through database leases and checkpoints, so a Render restart does not turn the HTTP request into the job lifetime. The CLI remains an operations adapter over the same execution resolver, not a separate implementation.

## Acceptance Manifest

- `ai-daily-acceptance-v3` is a low-sensitive, Git-ignored evidence index that records `selectionBasis` and binds the approved proposal/bundle, one `PRODUCTION` issue/run/date, matching Studio review and draft version, Publish Export checks, post-deploy observations, and a sealed rollback-evidence reference.
- The manifest does not replace the database, Studio audit trail, or human decision. It stores hashes, bounded identifiers, statuses, dates, repository paths, and check results only; prompts, source text, article content, raw model output, endpoints, credentials, and raw errors are forbidden.
- `init` creates the local skeleton, `check` reports missing/failed six gates and verifies rollback evidence, and `seal` writes a canonical record hash only when the artifact pair and all six gates pass. Candidate, issue, run, draft, review, export, deployment, and rollback mismatches fail closed.
- The deterministic acceptance contract uses business-shaped fixtures only for schema/tamper coverage. It never promotes a fixture result or calls a provider, search service, database, or deployed endpoint.

## Model Selection Contract

- The initial extractor/composer/verifier mapping may be approved through a zero-call manual static-selection artifact. It records only candidate and runtime identity, explicitly states `manual-static-selection` / `reduced_redundancy`, and claims no measured quality or fallback.
- When quality comparison or independent redundancy is needed, extractor, composer, and verifier candidates are scored independently on one versioned BIAU-owned case set, prompt version, generation schema version, and quality profile.
- The repository-owned golden set has 30 cases across six categories and eight fixed negative tags. Its normalized scenario/outcome/score payload contributes a content fingerprint to every role descriptor version. Business records must exactly match those role-local descriptors; category and negative-tag slice floors block approval even when the global average passes.
- Extractor, composer, and verifier each receive role-specific challenge inputs for every declared negative tag. The evaluator fails before recording a case when the exercised tag set drifts from the golden contract.
- Candidate records bind case descriptors to a recomputed SHA-256 hash and, for business evaluations, bind `executionEvidence.resultSetHash` to the canonical SHA-256 of the complete measured case array. They retain only low-sensitive model/channel aliases, execution metadata, aggregate quality, latency, and usage summaries.
- Primary ordering is acceptance, Chinese editorial score, citation coverage, citation precision, p95 latency, then stable candidate id.
- A fallback must pass every absolute quality floor, remain within five percentage points of the primary acceptance rate, and use a different failure-domain alias.
- Multiple model ids exposed by one provider may be measured in an explicitly opted-in reduced-redundancy comparison. They share one failure domain, remain labeled `reduced_redundancy`, and do not become an independent fallback.
- Fixture records validate the contract only and cannot be production-approved. Business records require explicit execution evidence, remain pending after selection, and require human approval.
- Manual static records have a separate schema and require explicit reduced-redundancy acknowledgement at both proposal and approval; they become production-eligible only after human approval and the first-edition Studio quality gate.

## Runtime Provider And Live Execution

- `AI_DAILY_MODEL_RUNTIME_JSON` is a server-only channel/candidate map. Channels own credentials and failure-domain aliases; candidates bind extractor/composer/verifier ids to channels. The static path requires one candidate per role; the measured path requires 2-3 candidates per role.
- The provider adapter uses the OpenAI-compatible Responses contract for every role, omits `temperature`, bounds runtime inputs, and exposes only stable error categories. Runtime v2 requires `protocol: "responses"`; endpoint compatibility fallback is allowed only after `404/405`, while network, timeout, authentication, rate-limit, invalid-response, and `5xx` failures do not resubmit the same model task to another guessed path.
- Real evaluation is optional, serial, and requires `--execute`, an enabled environment gate, and a matching approval id. It writes a Git-ignored proposal that retains aggregate scores/hashes but no prompt, source text, raw output, endpoint, or credential. Static selection and approval commands are offline-only and never call a provider.
- Human approval creates a tamper-evident bundle. Live execution revalidates bundle hashes and runtime provider/failure-domain/model identity, then claims only `PRODUCTION` work. Fixture execution claims only `FIXTURE` work.

## Rollback

Disable both Cron Jobs, production generation, and the public feed feature flag. Preserve database history and keep manual Studio/offline draft workflows available.

The rollback path is represented by a separate, Git-ignored `ai-daily-rollback-evidence-v1` manifest. It records only bounded acceptance/edition/run bindings, precondition confirmations, fixed action/preservation statuses, a reason enum, and a canonical hash. `init`, `check`, and `seal` are offline-only commands; they do not call Render, Cloudflare, a database, a provider, or a deployed endpoint. The acceptance manifest uses `ai-daily-acceptance-v3`, records `selectionBasis`, and references the sealed rollback evidence by `evidenceId` and `recordHash`, without making a circular hash reference. A missing record remains a manual gate; malformed, mismatched, sensitive, or tampered evidence fails closed.
