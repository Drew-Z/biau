# Public Research Assistant

## Product Boundary

- The public assistant is anonymous, read-only, and available without member or owner authentication.
- It may answer from BIAU public knowledge, fetched public-web evidence, or both.
- One configured Responses API model owns planning and answer generation. Retrieval, embedding, search, and reranking are tools rather than extra generation-model routes.
- Planner requests use the bounded non-streaming Responses contract. Answer generation uses `stream: true` and accumulates standard `response.output_text.delta` / `response.output_text.done` / `response.completed` events; the shared decoder also accepts a relay's chat-shaped JSON or SSE `choices` compatibility form without changing protocol or endpoint selection. Raw model deltas remain server-only because the structured answer must pass claim/citation verification before publication.
- Public responses never expose provider names, model IDs, endpoints, prompts, graph traces, internal diagnostics, or private/internal citations.

## Agent Runtime

- `runPublicAssistantAgent()` is the authoritative answer path for `POST /chat/public`.
- The LangGraph flow is `input_guard -> plan -> research? -> grade_evidence -> rewrite? -> generate -> verify_claims -> rewrite? -> finalize`.
- `auto`, `site`, and `web` are explicit request modes. Combined site/web research runs concurrently.
- Research recovery is bounded to one retry. Model calls, query counts, page fetches, retained evidence, input size, output size, and elapsed time are all bounded.
- `PUBLIC_ASSISTANT_ANSWER_TIMEOUT_MS` is the answer-stream idle timeout and resets on provider activity. It must not exceed the absolute `PUBLIC_ASSISTANT_REQUEST_TIMEOUT_MS` run budget.
- A deterministic plan is allowed only when structured planning fails. Weak or unverifiable evidence must end as a truthful partial, uncertain, unavailable, or blocked result.

## Evidence And Web Research

- Site retrieval uses public-only Qdrant evidence. Dense and sparse candidates are fused with RRF before optional provider reranking.
- If hybrid Qdrant query is unsupported or rejected, dense fallback must query the configured active public alias, never the base collection name.
- Reranker absence or failure must be reported internally as deterministic fallback; do not claim provider reranking.
- Tavily Basic Search is the default pure-search discovery adapter; auto parameters, generated answers, raw content, and images remain disabled. Brave Search and Exa remain optional. Every adapter produces normalized leads only and never replaces the single configured generation model.
- Web search results are discovery leads. Only successfully fetched, SSRF-safe original HTTPS pages may become citations.
- Reject credential-bearing URLs, private/local/link-local/metadata addresses, blocked redirects, unsupported content, oversized bodies, and timeouts.
- Remote page text is untrusted evidence. It cannot issue tool, policy, prompt, or credential instructions.

### Scenario: Public web search provider adapter

#### 1. Scope / Trigger

- Applies when adding, changing, or selecting `PUBLIC_WEB_SEARCH_PROVIDER` for the anonymous public assistant.

#### 2. Signatures

- `researchPublicWeb(queries, signal?, dependencies?) -> PublicWebResearchResult` owns provider dispatch and original-page evidence fetching.
- `PublicWebResearchConfig` carries `provider`, `baseUrl`, `apiKey`, `timeoutMs`, `maxResults`, and `maxPages`.

#### 3. Contracts

- Supported provider values are `tavily`, `brave`, and `exa`; the deployment default is `tavily`.
- Tavily sends `POST <base>/search` with Bearer auth, `search_depth=basic`, `auto_parameters=false`, and all generated-answer/raw-content/image options disabled.
- Brave sends `GET <base>/search` with `X-Subscription-Token`; Exa sends `POST <base>/search` with `x-api-key`.
- Adapters normalize only public HTTPS `title`, `url`, and optional publication time. Search snippets are not retained as citation evidence.
- Provider URL, key, raw payload, and diagnostics remain server-only. Citations are created only after the shared SSRF-safe original-page fetch succeeds.

#### 4. Validation & Error Matrix

- Missing key/base or unsupported provider -> `available=false`, `diagnostic=not_configured`, no search request.
- Caller cancellation -> `diagnostic=aborted`; provider timeout -> `timeout`; transport failure -> `network_error`.
- Non-2xx response -> `http_status`; malformed/empty/unsafe-only results -> `invalid_response`.
- Valid leads whose original pages cannot be retained -> `evidence_unavailable`.

#### 5. Good / Base / Bad Cases

- Good: Tavily returns public leads and fetched original pages become verified or partial web evidence.
- Base: search is unconfigured and `auto` can degrade to site/direct behavior.
- Bad: a provider returns localhost, credential-bearing, HTTP-only, or private-address URLs; none may reach the page fetcher.

#### 6. Tests Required

- `npm.cmd run assistant:public-web-check` must assert each provider endpoint, method, auth header, bounded query/result count, normalization, and unsafe URL rejection using fixtures only.
- `npm.cmd run docs:deployment-check` must keep `render.yaml`, `.env.example`, and deployment documentation on the same default provider/base URL.
- No deterministic check may call a live search or model provider.

#### 7. Wrong vs Correct

Wrong: use Tavily `answer` or `raw_content` directly as a citation, enable `auto_parameters`, or expose its token to Vite/browser code.

Correct: request Basic Search leads with generated content disabled, then fetch and verify the original public page through the shared evidence pipeline.

## Public API And Persistence

- `POST /chat/public` accepts a bounded question, anonymous session ID, mode, page context, and recent history.
- `POST /chat/public/stream` accepts the same payload and returns versioned SSE events: `ready`, public-safe `progress`, heartbeat comments, one verified `result`, or one stable `error`. Its `result` data uses the same allowlisted projection as the JSON route.
- `POST /chat/public/feedback` records bounded `up` or `down` feedback for one anonymous turn.
- The HTTP response is projected through an allowlist. Stable product fields include answer state, claims, citations, suggestions, session/turn IDs, and low-sensitive counters.
- Rate limiting uses the request IP in process memory but never persists an IP address. Buckets are bounded and a client-provided session ID cannot bypass chat or feedback limits.
- Persist only bounded anonymous session/turn/feedback data for 30 days. Long-lived aggregates store topic fingerprints and counters rather than raw questions or answers.
- Database absence degrades persistence without making the public route unusable.

## Sync And Deployment

- Public knowledge sync writes a versioned Qdrant collection, validates the replacement, and then switches the configured alias.
- Commit/checksum readiness gates prevent a stale deploy from activating newer knowledge.
- Cloudflare Functions are thin same-origin proxies. The stream Function forwards the bounded event body without buffering, preserves cancellation, and keeps its timeout active until the upstream body closes. Model, search, RAG, embedding, reranker, sync, and database credentials remain on server services.
- Deployed public chat, feedback, persistence, and public sync acceptance passed before the Operator/internal-RAG retirement began. Runtime code and configuration are public-only; PostgreSQL and external Qdrant deletion remain explicit manual gates with backups.

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
