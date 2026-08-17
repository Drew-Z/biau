# AI Daily production operations design

## Deployment

- Ingest Cron: source collection, broad discovery, and evidence fetch.
- Editorial Cron: generation, flash refresh, approved manual work, and daily composition.
- Existing Studio service: authenticated editorial UI plus isolated public projection routes.
- Existing PostgreSQL: authoritative jobs, evidence, editorial, and projection state.

Broad discovery is provider-separated from model generation. Official RSS/Atom feeds remain the highest-authority path. Optional The News API is the bounded primary with GDELT DOC as fallback; when it is disabled, GDELT becomes the no-key primary. HN Algolia and HotDaily are signal-only. HotDaily contributes original title, URL, and community identity only; generated summaries/value judgments are discarded. Every aggregator or community result is fetched from its original page before it can become selectable evidence.

## Acceptance Method

Configuration readiness is offline and never calls providers. The only live acceptance is a user-approved real edition that produces useful editorial output.

The first live edition is queued from the authenticated Studio workspace after an exact second confirmation. The API validates the current Edition version, evidence floor, production flag, runtime, and approval bundle before returning `202`. A process-local poller consumes only durable `PRODUCTION` work through database leases and checkpoints, so a Render restart does not turn the HTTP request into the job lifetime. The CLI remains an operations adapter over the same execution resolver, not a separate implementation.

## Evidence Selection Policy

- Official feeds remain the highest-authority evidence and continue to win ranking tie-breaks, but an Edition does not require a fixed number of fresh vendor posts. Daily publication must not stop merely because vendors did not publish that day.
- Edition readiness requires at least five score-qualified, original-page `READY` events across at least three independent publisher domains. Community/search signals remain ineligible until their original pages are fetched, dated inside the Edition window, and promoted to ready evidence.
- Generation preserves the source-role boundary already carried by the evidence pack: `official`, `primary_media`, and `secondary_media`. Release, date, price, API, and availability claims require `official` evidence; cross-event trend blocks require evidence from at least two independent domains.
- The News API, GDELT, Hacker News, and HotDaily own broad recall. Curated official RSS/Atom feeds improve authority and fact verification, but source expansion is not a substitute for ranking and claim-level evidence validation.

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
- Structured generation uses SSE with a fixed 8192-token output ceiling. The configured channel timeout is treated as an inactivity budget and is refreshed by response headers and accepted stream chunks, so a long composer response can continue while making progress without allowing an unbounded silent request.
- Real evaluation is optional, serial, and requires `--execute`, an enabled environment gate, and a matching approval id. It writes a Git-ignored proposal that retains aggregate scores/hashes but no prompt, source text, raw output, endpoint, or credential. Static selection and approval commands are offline-only and never call a provider.
- Human approval creates a tamper-evident bundle. Live execution revalidates bundle hashes and runtime provider/failure-domain/model identity, then claims only `PRODUCTION` work. Fixture execution claims only `FIXTURE` work.
- A production channel repair may add a dedicated fixed-upstream relay route instead of overwriting an existing shared route. The route owns one endpoint/key pair, issues at most one upstream request, and has a distinct provider/failure-domain identity. Existing bundles cannot cross that identity boundary; a new proposal, approval bundle, Secret File/hash delivery, deployment, and separately approved real Edition are required.

## Bounded Content-quality Repair

The composer receives a bounded evidence context in addition to extracted claims. The context exposes only the evidence id, source role/tier, publisher, public publisher domain, publication time, and a bounded excerpt. This gives composition enough information to avoid release/date/price/API/availability claims without official support and to omit trend blocks that do not span two independent publisher domains.

After the first composer and verifier outputs pass their schemas, the deterministic validator remains authoritative. One content-quality repair cycle is allowed only when every critical finding belongs to a fixed repairable set: English-only editorial output, contradicted/insufficient claim or block support, missing official evidence, or insufficient independent trend sources. Before the repair call, the server derives the only allowed claims plus explicit excluded-claim, event/event-claim removal, trend removal, and block-rewrite directives. The repair composer receives those directives with the normalized prior composition, verifier reviews, fixed findings, claims, and bounded evidence context; it must return a complete simplified-Chinese replacement composition. A renamed event cannot restore a removed event claim. If no publishable claim remains, the runner makes no repair call and fails closed. Otherwise the replacement is verified once and then goes through the unchanged deterministic validator. A failed repair call, failed verifier call, non-repairable finding, or second rejection stops the workflow without another loop, fallback guess, or relaxed quality floor.

The existing durable stage order remains `EXTRACT_FACTS -> COMPOSE -> VERIFY -> VALIDATE -> DRAFT`. `COMPOSE` keeps the first schema-valid composition. `VERIFY` owns the bounded verify/repair/reverify unit and stores the final composition, final reviews, and all bounded provider attempts. Legacy `VERIFY` checkpoints without a final composition restore against the `COMPOSE` checkpoint; new checkpoints validate the stored final composition before deterministic validation. Prompt behavior is `ai-daily-prompt-v7`, so every v6 or earlier approval bundle is stale and cannot authorize this flow.

## Single-stage Business Diagnostic

Studio exposes a separate, fail-closed stage diagnostic only when `AI_DAILY_STAGE_DIAGNOSTICS_ENABLED=true` and both production generation and business evaluation are disabled. It reuses the approved runtime/bundle resolver without enabling the durable production worker. One process-wide single-flight lock protects the shared channel, and each request selects exactly one of extractor/composer/verifier.

Extractor receives one bounded batch from the current authorized evidence pack. Composer and verifier load the Issue's latest generated revision and pass stored claims/composition through the current generation normalizers before any provider call. The diagnostic disables fallback and schema repair, never invokes the content-quality repair loop, and asserts a maximum of one provider call. It performs no database mutation and returns only role, success/failure, a fixed error category, fixed response-shape diagnostics, a `0|1` call count, and a coarse duration bucket. It is authenticated, manually confirmed, never scheduled, and cannot serve as a provider health probe.

## Rollback

Disable both Cron Jobs, production generation, and the public feed feature flag. Preserve database history and keep manual Studio/offline draft workflows available.

The rollback path is represented by a separate, Git-ignored `ai-daily-rollback-evidence-v1` manifest. It records only bounded acceptance/edition/run bindings, precondition confirmations, fixed action/preservation statuses, a reason enum, and a canonical hash. `init`, `check`, and `seal` are offline-only commands; they do not call Render, Cloudflare, a database, a provider, or a deployed endpoint. The acceptance manifest uses `ai-daily-acceptance-v3`, records `selectionBasis`, and references the sealed rollback evidence by `evidenceId` and `recordHash`, without making a circular hash reference. A missing record remains a manual gate; malformed, mismatched, sensitive, or tampered evidence fails closed.
