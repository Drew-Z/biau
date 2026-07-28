# Public assistant direct task routing

## Goal

Prevent high-confidence creative and transformation requests from being misrouted into evidence-gated research.

## Requirements

- In `auto` mode, high-confidence greetings, creative-writing commands, and text-transformation commands must use the direct model route without site/web retrieval or citation requirements.
- The exact production regression `请生成一首古诗` must return the model's direct answer rather than an evidence-insufficient response.
- Explicit `site` and `web` modes must continue to force their selected research route.
- Factual, current, comparative, site, and web research questions must retain the existing Agentic RAG and claim-citation verification flow.
- Credential blocking, sensitive-output rejection, cancellation, idempotency, persistence, and public response redaction must remain unchanged.
- Deterministic validation must use fixtures only and must not call a live model, search, embedding, reranker, or vector provider.

## Acceptance Criteria

- [ ] `auto` creative/transformation requests bypass planner and retrieval calls and produce a direct answer with zero citations.
- [ ] `site`/`web` selection overrides the direct-task classifier.
- [ ] Existing combined research, bounded retry, invalid-citation, credential, cancellation, and idempotency checks still pass.
- [ ] Server build, public Agent/model/API checks, lint, build, and `git diff --check` pass.

## Out Of Scope

- Changing model/provider configuration or testing a live provider.
- Adding a second generation model or a separate intent-classification service.
- Relaxing citation verification for factual research routes.
