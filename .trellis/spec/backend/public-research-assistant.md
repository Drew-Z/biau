# Public Research Assistant

## Product Boundary

- The public assistant is anonymous, read-only, and available without member or owner authentication.
- It may answer from BIAU public knowledge, fetched public-web evidence, or both.
- One configured Responses API model owns planning and answer generation. Retrieval, embedding, search, and reranking are tools rather than extra generation-model routes.
- Public responses never expose provider names, model IDs, endpoints, prompts, graph traces, internal diagnostics, or private/internal citations.

## Agent Runtime

- `runPublicAssistantAgent()` is the authoritative answer path for `POST /chat/public`.
- The LangGraph flow is `input_guard -> plan -> research? -> grade_evidence -> rewrite? -> generate -> verify_claims -> rewrite? -> finalize`.
- `auto`, `site`, and `web` are explicit request modes. Combined site/web research runs concurrently.
- Research recovery is bounded to one retry. Model calls, query counts, page fetches, retained evidence, input size, output size, and elapsed time are all bounded.
- A deterministic plan is allowed only when structured planning fails. Weak or unverifiable evidence must end as a truthful partial, uncertain, unavailable, or blocked result.

## Evidence And Web Research

- Site retrieval uses public-only Qdrant evidence. Dense and sparse candidates are fused with RRF before optional provider reranking.
- If hybrid Qdrant query is unsupported or rejected, dense fallback must query the configured active public alias, never the base collection name.
- Reranker absence or failure must be reported internally as deterministic fallback; do not claim provider reranking.
- Web search results are discovery leads. Only successfully fetched, SSRF-safe original HTTPS pages may become citations.
- Reject credential-bearing URLs, private/local/link-local/metadata addresses, blocked redirects, unsupported content, oversized bodies, and timeouts.
- Remote page text is untrusted evidence. It cannot issue tool, policy, prompt, or credential instructions.

## Public API And Persistence

- `POST /chat/public` accepts a bounded question, anonymous session ID, mode, page context, and recent history.
- `POST /chat/public/feedback` records bounded `up` or `down` feedback for one anonymous turn.
- The HTTP response is projected through an allowlist. Stable product fields include answer state, claims, citations, suggestions, session/turn IDs, and low-sensitive counters.
- Rate limiting uses the request IP in process memory but never persists an IP address. Buckets are bounded and a client-provided session ID cannot bypass chat or feedback limits.
- Persist only bounded anonymous session/turn/feedback data for 30 days. Long-lived aggregates store topic fingerprints and counters rather than raw questions or answers.
- Database absence degrades persistence without making the public route unusable.

## Sync And Deployment

- Public knowledge sync writes a versioned Qdrant collection, validates the replacement, and then switches the configured alias.
- Commit/checksum readiness gates prevent a stale deploy from activating newer knowledge.
- Cloudflare Functions are thin same-origin proxies. Model, search, RAG, embedding, reranker, sync, and database credentials remain on server services.
- Do not delete Operator/internal-RAG code, tables, or the Render service until deployed public chat, feedback, and public sync acceptance pass.

## Required Checks

```powershell
npm.cmd run assistant:public-agent-check
npm.cmd run assistant:public-model-check
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-persistence-check
npm.cmd run assistant:public-rate-limit-check
npm.cmd run assistant:public-web-check
npm.cmd run assistant:public-sync-check
npm.cmd run assistant:hybrid-contract
npm.cmd run assistant:rag-smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run server:smoke
npm.cmd run cf-assistant:smoke
```

These checks use local fixtures only. They must not probe a live model, search, embedding, Qdrant, or reranker provider. External acceptance uses one user-approved business question after deployment.
