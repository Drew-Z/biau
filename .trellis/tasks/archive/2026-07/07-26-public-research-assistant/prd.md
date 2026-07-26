# Public research assistant final product

## Goal

Replace the current one-shot public RAG widget with the only remaining BIAU assistant: an anonymous, read-only website research agent that can answer from BIAU Port, research the public web, combine both evidence sets, and expose verifiable citations and quality feedback while using one configured generation model.

## Confirmed Background

- The current public route performs one public retrieval followed by one generation call and has no adaptive routing or correction loop (`server/src/app.ts:151`).
- The public frontend is a floating widget with browser-local fallback and document-level citations (`src/components/PublicAssistantWidget.tsx`).
- Qdrant retrieval is public-scope separated, but is dense-only and reports reranking without a real provider rerank stage (`server/src/ragQdrantStore.ts`).
- The internal Operator uses a fixed linear LangGraph plus owner-only tools, memory, knowledge, and Studio draft writes. It is not the target architecture and will be retired after replacement acceptance.
- The repository already includes LangGraph, Qdrant, an OpenAI-compatible embedding path, Cheerio, `ipaddr.js`, and public knowledge V2 chunks.

## Product Requirements

### R1. Public product boundary

- The assistant is anonymous and available on public BIAU Port pages without login, member roles, invitations, or owner identity headers.
- It is read-only. It must not write Studio content, internal knowledge, memory, project data, or invoke privileged/private services.
- It uses exactly one configured generation model. Search, retrieval, embedding, and reranking are tools, not additional generation-model routes.

### R2. User-selectable research scope

- The request supports `auto`, `site`, and `web` modes; `auto` is the default.
- `site` uses only BIAU public knowledge. `web` may use public-web evidence. `auto` chooses direct, site, web, or combined research from the question and current page context.
- The assistant may answer general questions, current-event questions, technical comparisons, and BIAU-specific questions; it must not be artificially restricted to BIAU content.

### R3. Adaptive Agentic RAG

- A public-only LangGraph owns input guard, planning, conditional tool execution, evidence grading, generation, claim/citation verification, bounded retry, and final projection.
- The graph has real conditional edges and at most one evidence-recovery loop. Every run has explicit budgets for model calls, search calls, page fetches, retrieved chunks, elapsed time, and response size.
- Planning uses the configured model with a validated structured result. A deterministic safe plan is used only when planning fails.

### R4. BIAU retrieval quality

- Qdrant public retrieval combines dense semantic and sparse lexical signals, fuses candidates with RRF, and reranks a bounded candidate set with a real configurable reranker.
- If no reranker is configured, metadata must report deterministic fallback truthfully; it must never claim provider reranking occurred.
- Lightweight entity/relation expansion remains available. Neo4j and heavy GraphRAG are not introduced for the current small corpus.

### R5. Public-web research

- The default production search adapter is Tavily Basic Search, selected through server-only configuration; Brave Search and Exa remain optional compatible providers. Every adapter returns discovery leads only. Lack of a search configuration degrades `auto` to site/direct behavior and returns an explicit unavailable state for forced `web` mode.
- Search results are discovery leads. The agent fetches a bounded number of original public pages and extracts evidence before citing them.
- Fetching rejects credentials in URLs, private/local/link-local/metadata addresses, redirects to blocked destinations, unsupported content, excessive bodies, and slow endpoints. Remote page text is untrusted evidence and cannot issue instructions to the agent.

### R6. Evidence and citation contract

- Final answers return typed claims mapped to supporting citation IDs. Each citation identifies source type, canonical URL, title, section or excerpt, publication/update time when known, and evidence status.
- A deterministic verifier rejects missing/unknown citation IDs, private/internal visibility, unsupported factual claims, and citation text that cannot be found in the retained evidence.
- When evidence remains weak after the bounded retry, the assistant responds with an explicit uncertainty or evidence-unavailable result instead of inventing an answer.

### R7. Public conversation experience

- The widget supports multi-turn context inside one anonymous browser session, scope selection, current-page context, suggested follow-ups, visible research progress, precise sources, copy, retry, and thumbs feedback.
- It clearly distinguishes model answer, site evidence, external evidence, partial evidence, degraded local fallback, and policy refusal without exposing provider endpoints, keys, prompts, tool IDs, or internal traces.
- Mobile and desktop layouts remain readable, keyboard accessible, and non-blocking for normal page navigation.

### R8. Anonymous quality operations

- Store random anonymous session ID, bounded question/answer, result state, citation IDs, latency/retrieval counters, and optional feedback for 30 days. Do not store IP addresses, authenticated identity, cookies, secrets, hidden prompts, raw provider payloads, or full fetched page bodies.
- Retain aggregate top-question, unanswered/partial-answer, source-quality, and coverage-gap metrics after raw-turn expiry.
- Detailed quality insights are operational data and are not returned by the public chat API.

### R9. Sync and observability

- Public knowledge sync is versioned, durable, and triggered by the publication/build workflow; the existing manual sync remains a recovery path.
- Health and metrics distinguish model, public RAG, search, reranker, fallback, evidence insufficiency, latency, and rate limiting without performing provider liveness prompts.
- Public requests have server-side input limits, rate limits, timeouts, cancellation propagation, and bounded error categories.

### R10. Internal assistant retirement

- After the replacement passes local and deployed acceptance, remove Operator routes, pages, navigation, Cloudflare facade, owner/member configuration, internal tools/memory, internal knowledge APIs, Operator service definition, and obsolete scripts/docs.
- Add a reviewed migration that removes Operator-only tables only after the replacement persistence migration is deployed. Studio and AI Daily data are untouched.
- The RAG service becomes public-only; internal collection configuration and internal sync credentials are removed after the public collection is verified.

## Acceptance Criteria

- [ ] `auto`, `site`, and `web` requests follow the documented graph routes and budgets; forced web mode fails safely when search is unavailable.
- [ ] BIAU retrieval proves dense+sparse fusion and truthful reranker metadata with deterministic fixtures.
- [ ] Web research cites only fetched, allowed original pages and blocks SSRF, redirect, oversized-body, timeout, and prompt-injection fixtures.
- [ ] Every factual answer claim references retained evidence; weak evidence produces an explicit uncertain/partial response.
- [ ] The current single model is the only generation model used; no liveness-only or catalog-probing request exists.
- [ ] The widget passes public API, accessibility, mobile, citation, feedback, reconnect, degraded, and rate-limit scenarios.
- [ ] Anonymous retention and aggregate coverage-gap behavior pass database-backed tests without retaining prohibited fields.
- [ ] Public knowledge publication triggers versioned sync and exposes low-sensitive status/metrics.
- [ ] Operator and internal-RAG product surfaces are absent after migration, while Studio, AI Daily, public site, and public assistant builds/tests remain green.
- [ ] Deployment documentation identifies the required public service, RAG service, database/search/reranker variables, migration order, rollback point, and manual Render deletion gate.

## Out of Scope

- Multiple generation models, member-specific model routing, personal long-term memory, authenticated end-user accounts, write-capable tools, code execution, internal/private knowledge, Neo4j, and heavy GraphRAG.
- Unbounded autonomous browsing, background research jobs, or claims that a configured provider is live without a user-approved business request.
