# Public research assistant technical design

## Architecture

The public assistant becomes a single server-owned product path:

```text
PublicAssistantWidget
  -> POST /chat/public
  -> public-only LangGraph
       input_guard
       -> plan
       -> direct | retrieve_site | search_web | combined
       -> grade_evidence
       -> generate
       -> verify_claims
       -> retry_research (maximum once) | finalize
  -> answer + claims + citations + public-safe run status
  -> anonymous turn/feedback persistence
```

The Express public service is authoritative. Cloudflare Functions become a thin proxy to it, eliminating the duplicate retrieval/generation implementation. Browser-local BIAU search remains the last-resort UI fallback and is explicitly labeled degraded.

## Public graph and budgets

- `PublicAssistantState` contains the normalized request, last six bounded conversation turns, page context, validated plan, site/web evidence, claim draft, verification result, retry count, safe diagnostics, and deadline signal.
- The planner returns `route`, up to three bounded queries, required freshness, and whether direct answering is safe. Unknown tools or fields fail schema validation.
- Conditional edges execute site and web research in parallel for a combined route, then grade one merged evidence set. Evidence recovery may rewrite once; a second insufficiency finalizes as `partial` or `uncertain`.
- Default budgets: 500-character question, six prior turns, three queries, twelve site candidates, eight fused chunks, five web leads, three original-page fetches, one retry, three model calls, and a 25-second total deadline. Environment values may only reduce or moderately raise bounded limits.

## Retrieval and research

- Qdrant stores one public collection with named dense and sparse vectors. Sync creates a versioned replacement collection, validates counts/dimensions, then changes the configured alias; the previous collection is the rollback target.
- Dense and sparse candidates are fused with reciprocal-rank fusion before a bounded reranker call. Provider reranker errors degrade to a deterministic lexical/vector rerank and expose `rerankerMode: fallback`.
- `PublicWebSearchProvider` dispatches to Tavily Basic Search by default and retains Brave Search plus Exa as optional adapters. Every adapter returns the same normalized discovery-lead contract only. Tavily automatic parameters, generated answers, raw content, and images are disabled. `PublicPageFetcher` resolves and pins public IPs, revalidates every redirect, enforces MIME/body/time limits, applies robots policy, canonicalizes URLs, and extracts title, dates, headings, and bounded main text with Cheerio.
- Web content is wrapped as untrusted evidence. Instructions, tool requests, credential prompts, and embedded scripts/styles are discarded and never concatenated into a system message.

## Model and evidence contracts

- A dedicated assistant Responses adapter uses the single selected channel. It omits `temperature`, supports structured planner and answer schemas, propagates abort signals, and returns only stable error classes.
- `PublicAssistantAnswer` contains `status`, Markdown answer, follow-up suggestions, and claims. Each factual claim names one or more evidence IDs.
- Verification is deterministic and fail-closed: cited evidence must exist, be public, match retained excerpts, and cover each factual claim. The verifier may remove unsupported claims or request the one allowed research retry; it cannot silently turn unsupported text into a successful answer.
- Public response metadata reports product-level states (`site`, `web`, `combined`, `direct`, `partial`, `degraded`, `blocked`) rather than internal graph node names, provider endpoints, prompts, or raw errors.

## API and persistence

- `POST /chat/public` accepts `{ message, sessionId?, mode?, pageContext?, history? }` and returns `{ answer, status, claims, citations, suggestions, sessionId, turnId, meta }`.
- `POST /chat/public/stream` is the preferred browser transport. It returns `text/event-stream` with a versioned, public-safe event contract: `ready`, bounded `progress`, heartbeat comments, one terminal `result`, or one terminal `error`. The `result` payload is exactly the allowlisted JSON projection returned by `/chat/public`; raw model deltas, provider payloads, graph node names, prompts, endpoints, and diagnostics never cross this boundary.
- The Responses adapter uses provider streaming for answer generation and accumulates standard `response.output_text.delta` / `response.output_text.done` / `response.completed` events plus the relay's chat-shaped SSE compatibility form. It parses the complete structured JSON only after the provider stream ends, then runs the existing claim/citation verifier before emitting `result`. Provider activity resets the answer idle timeout, while the public request deadline remains the absolute run bound.
- Cloudflare forwards the upstream event stream byte-for-byte, keeps its abort budget active until the body closes, enforces a bounded streamed response size, and propagates downstream cancellation. The browser prefers the stream route and falls back to the JSON route only when the stream endpoint is explicitly unsupported; rate limits, upstream failures, malformed streams, and timeouts never trigger a duplicate model request.
- `POST /chat/public/feedback` accepts one turn ID, `up | down`, and an optional bounded reason enum/comment. It is idempotent per anonymous session and turn.
- New public-assistant tables replace Operator persistence: anonymous session, turn, feedback, and daily aggregate/coverage-gap records. Raw text expires after 30 days; aggregate counters retain normalized topic fingerprints, not original text.
- Rate limiting uses privacy-preserving request buckets and does not persist IP addresses. Detailed insights remain behind a server-only operations token or Studio facade and never share the public response contract.

## Migration, rollout, and rollback

1. Add public persistence and graph behind the existing `/chat/public` contract, deploy with Operator unchanged, and validate site/direct/degraded behavior.
2. Enable search only after server-side Tavily, Brave, or Exa configuration. Run a real user-approved research question rather than a provider liveness test.
3. Sync a new hybrid Qdrant collection and switch the alias after count/dimension/query fixtures pass; retain the old collection alias target for rollback.
4. Deploy the new widget and feedback flow. Observe errors, latency, citation validity, and fallback distribution.
5. Remove Operator/internal-RAG code and deploy the destructive table migration only after the public replacement is accepted. Delete the Render Operator service manually last.

Rollback before step 5 restores the previous public service revision and Qdrant alias. Rollback after step 5 restores application code and schema from the retained database/revision backup; no Studio or AI Daily tables are part of the destructive migration.

## Trade-offs

- Tavily Basic Search is the default production adapter because its recurring entry-level credits, API-key server configuration, and URL/result contract fit the current low-traffic evidence pipeline. Basic mode and explicit disabled auto parameters bound credit cost. Brave and Exa remain optional. No unreliable scraping of public search result pages or generative research model is used as a hidden search fallback.
- Qdrant hybrid plus reranking addresses the current retrieval gap without the operational cost of Neo4j/GraphRAG for 27 documents and roughly 56 chunks.
- Anonymous 30-day retention enables Kapa/GitBook-style coverage analysis while avoiding accounts, profiles, IP retention, and permanent raw-conversation storage.
