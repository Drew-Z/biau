# Public Research Assistant

## Product Boundary

- The public assistant is anonymous, read-only, and available without member or owner authentication.
- It may answer from BIAU public knowledge, fetched public-web evidence, or both.
- One primary Responses API channel owns planning. Final answer generation may use one bounded server-only fallback provider with at most two ordered model names. Retrieval, embedding, search, and reranking are tools rather than generation-model routes.
- Planner requests use the bounded non-streaming Responses contract. Answer generation uses `stream: true` and accumulates standard `response.output_text.delta` / `response.output_text.done` / `response.completed` events; the shared decoder also accepts a relay's chat-shaped JSON or SSE `choices` compatibility form without changing protocol or endpoint selection. Raw model deltas remain server-only because the structured answer must pass claim/citation verification before publication.
- The shared Responses adapter owns output limits, total and first-activity timing, response-size limits, JSON/SSE/chat-relay decoding, and the optional `off | json-schema` structured-output capability. Schema mode defaults to `off`; rejection never triggers endpoint or protocol guessing.
- Public responses never expose provider names, model IDs, endpoints, prompts, graph traces, internal diagnostics, or private/internal citations.
- Public `/health` checks generation-channel configuration only. It must never enumerate, probe, ping, or send a liveness prompt to primary or fallback models, and it must not expose channel count or order.

## Agent Runtime

- `runPublicAssistantAgent()` is the authoritative answer path for `POST /chat/public`.
- The LangGraph flow is `input_guard -> plan -> research? -> grade_evidence -> rewrite? -> generate -> verify_claims -> rewrite? -> finalize`.
- In `auto` mode, high-confidence greetings, creative-writing commands, and text transformations use the deterministic `direct` route before planner inference. Direct answers use a dedicated concise request profile with bounded recent history and `PUBLIC_ASSISTANT_DIRECT_MAX_OUTPUT_TOKENS`; the request contains no evidence/citation instructions or empty evidence payload, and direct claims remain empty. Explicit `site` and `web` modes remain authoritative and keep the research/evidence gates.
- `auto` is the default product mode. The compact scope selector exposes `site` and `web` only as explicit user overrides when automatic tool selection is unsuitable; they must not return as equal-weight primary navigation. Combined site/web research runs concurrently.
- Evidence/query rewrite recovery is bounded to one retry. Generation uses one initial primary-channel attempt and at most two retries across the whole configured channel chain. Attempts, abortable 200/400 ms backoff, and per-attempt allowance share one absolute request deadline; an independent fallback chain reserves minimum future-attempt windows without extending that deadline. Cancellation stops active work and all future attempts.
- Generation channel order is passively adaptive per service process: the configured quality order is the cold-start baseline, while real answer attempts build bounded, time-decayed success/failure reputation and first-activity latency. A recently stable channel stays preferred instead of yielding immediately to a repeatedly failing higher-priority channel. Failures still open a bounded in-memory circuit; cooldown expiry grants one real request a half-open lease while concurrent requests continue through known healthy channels. The request freezes its channel order at start so concurrent outcomes cannot reshuffle an active attempt chain. Opening the assistant, `/health`, and ranking functions never call a model or enumerate a provider catalog. Process restarts clear this ephemeral health state, and stale reputation decays back toward configured quality order.
- Production currently enables only the approved `grok-4.5` Responses primary channel. The runtime keeps the bounded independent fallback capability, but no fallback model enters production until its whole channel passes an approved real business task; total generation attempts remain capped at three when fallback is configured.
- When every configured channel is open or already leased for recovery, routing returns no provider candidate and the agent emits its bounded degraded response immediately. It does not deliberately call a channel that is still inside its cooldown.
- Primary configuration/authentication/endpoint, timeout/network, 408/425/429/5xx, empty, or invalid failures may advance to an independent fallback. Permanent request errors, policy refusal, and cancellation never switch channels. Multiple fallback models share one failure domain: authentication or network failure stops that provider, while model-specific endpoint/rate-limit/upstream/empty/invalid failure may advance to the next configured fallback model.
- `PUBLIC_ASSISTANT_ANSWER_TIMEOUT_MS` is the answer-stream idle timeout and resets on provider activity. It must not exceed the absolute `PUBLIC_ASSISTANT_REQUEST_TIMEOUT_MS` run budget.
- A deterministic plan is allowed only when structured planning fails. Weak or unverifiable evidence must end as a truthful partial, uncertain, unavailable, or blocked result.

## Evidence And Web Research

- Production site retrieval uses public-only Supabase pgvector evidence. It combines exact 4096-dimensional cosine search, keyword candidates, and bounded entity/relation expansion before deterministic merging and optional provider reranking.
- Local retrieval and the explicitly selected Qdrant adapter remain deterministic test/rollback paths. The optional Qdrant path must query its configured active public alias and never an internal or unversioned collection.
- Reranker absence or failure must be reported internally as deterministic fallback; do not claim provider reranking.
- Tavily Basic Search is the default pure-search discovery adapter; auto parameters, generated answers, raw content, and images remain disabled. Brave Search and Exa remain optional. Every adapter produces normalized leads only and never replaces the configured generation channel chain.
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

- Version-2 `POST /chat/public` accepts a required UUID `requestId`, bounded question, anonymous session ID, mode, page context, recent history, and a discriminated `new-turn | answer-revision` intent with bounded branch/turn/revision identities. A bounded legacy body is accepted only as a rollout-compatible new-turn request.
- `POST /chat/public/stream` accepts the same payload and returns versioned SSE events: `ready`, public-safe `progress`, heartbeat comments, one verified `result`, or one stable `error`. Its `result` data uses the same allowlisted projection as the JSON route, including the request ID.
- JSON and SSE share one execution coordinator. It claims `PublicAssistantRequest` before Agent execution, replays that Request's allowlist-decoded Revision-bound response, rejects same-ID/different-intent conflicts, and completes the Turn/Revision/Branch/aggregate/Request graph in one fenced transaction.
- Active duplicates return `public-assistant-request-processing` with bounded `Retry-After`. Completed duplicates do not rerun planning, retrieval, generation, persistence, or aggregate updates.
- `POST /chat/public/cancel` binds the request ID to its anonymous session and marks processing/retryable work cancelled. A late executor cannot persist after cancellation.
- `POST /chat/public/feedback` records bounded `up` or `down` feedback for one owned immutable Revision.
- `POST /chat/public/branch` either selects an owned saved Branch or continues from an owned Revision and returns the authoritative normalized Session history projection.
- The version-2 HTTP response is projected through an allowlist. Stable product fields include answer state, claims, citations, suggestions, opaque branch/turn/revision identity, and low-sensitive counters. A legacy response without identity may render ephemerally but must not invent Revision capability.
- The optional public recovery projection is `{ state: 'none' | 'recovered' | 'degraded', attempts: 1 | 2 | 3, failureClass?: 'not_configured' | 'timeout' | 'network' | 'upstream' | 'empty' | 'invalid' }`. `publicAssistantProjection.ts` is the sole internal-to-public mapping boundary; provider identity, endpoint, exact status, and raw diagnostics remain internal.
- Client disconnect propagates as a retryable abort; explicit visitor cancellation also calls the cancellation endpoint. The runner checks the signal before execution and again before fenced completion; an aborted or cancelled turn must not emit or persist a fallback response.
- Rate limiting uses the request IP in process memory but never persists an IP address. Buckets are bounded and a client-provided session ID cannot bypass chat or feedback limits.
- Persist only bounded anonymous session/turn/feedback data for 30 days. Long-lived aggregates store topic fingerprints and counters rather than raw questions or answers.
- A request may carry one JPEG, PNG, or WebP attachment. The browser resizes/compresses it, while the server revalidates data URL, Base64, decoded bytes, and file signature with a 256 KB decoded limit. Original image bytes are request-scoped only; persistence and idempotency retain only the normalized attachment digest, kind, and MIME type.
- When configured, the LangGraph `understand_image` node calls `ASSISTANT_VISION_MODEL` through an already configured fallback channel and treats the bounded result as untrusted observation. Production currently leaves this variable empty until a vision model passes an approved image task. Image text cannot select tools or change policy; missing or failed vision is explicit and never lets a text-only path guess unseen content.
- The in-process typed vision tool is authoritative. MCP may wrap this boundary for future cross-product reuse, but the public service must not add an MCP self-network hop solely to call its own tool.
- Database absence degrades persistence without making the public route unusable.

## Scenario: Public Multimodal Input And Vision Tool

### 1. Scope / Trigger

- Applies whenever anonymous chat accepts image data, the Responses adapter emits `input_image`, or the LangGraph image-understanding node changes.

### 2. Signatures

- `ChatPayload.attachment?: { kind: 'image'; name?: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; dataUrl: string }`.
- `normalizePublicAssistantImageAttachment(value) -> PublicAssistantImageAttachment | null` adds canonical Base64, SHA-256 `digest`, and `byteLength`.
- `understandPublicAssistantImage({ attachment, question, timeoutMs?, signal? }) -> PublicAssistantImageToolResult` uses the configured fallback vision channel.

### 3. Contracts

- The browser accepts one image up to 8 MB, resizes its longest edge to at most 1280 px, and emits at most 256 KB after WebP/JPEG encoding. The server independently enforces the decoded 256 KB limit and file signature.
- The request hash includes only `{ kind, mimeType, digest }`; original bytes, data URL, filename, and visual observation are not persisted or restored from history.
- `ASSISTANT_VISION_MODEL` must resolve to a configured non-primary fallback model. `PUBLIC_ASSISTANT_VISION_TIMEOUT_MS` is bounded to 3-20 seconds and remains inside the absolute assistant request deadline.
- The vision observation is bounded to 4000 characters and labeled as untrusted evidence in planner and answer prompts. It cannot select tools, alter policy, or become a public citation by itself.

### 4. Validation & Error Matrix

- Unsupported MIME, malformed/non-canonical Base64, MIME mismatch, bad magic bytes, empty image, or decoded size overflow -> `400 invalid-public-assistant-image`, no provider call.
- Proxy or Express body overflow -> `413 public-assistant-request-too-large`.
- Missing configured vision channel, timeout, provider rejection, empty output, or invalid output -> explicit degraded image response; do not continue through a text-only guess path.
- Caller abort -> abort the vision request and prevent later generation or persistence.

### 5. Good / Base / Bad Cases

- Good: a compressed screenshot is validated, observed through an approved configured vision model, then the untrusted observation enters the existing plan/research/generate/verify graph.
- Base: a text-only request omits `attachment` entirely and retains its legacy request hash and behavior.
- Bad: persist the data URL, trust instructions rendered inside an image, call an arbitrary image endpoint, or let a text-only fallback claim it saw the image.

### 6. Tests Required

- Image checks assert MIME/signature/size validation, canonicalization, digest-only hashing, legacy no-image hash compatibility, bounded Responses `input_image`, cancellation, timeout, injection isolation, and no model continuation after vision failure.
- Cloudflare checks assert streaming bounded reads, a 512 KB chat/relay request ceiling, retained 32 KB non-chat ceilings, fixed upstream routing, and the configured bounded model allowlist.
- UI checks assert preview/remove, actual encoded Blob MIME, retry/cancel preservation, session-switch clearing, no localStorage image persistence, 44px controls, and compact/fullscreen 320/390/430 containment.

### 7. Wrong vs Correct

Wrong: add an MCP self-call and assume that protocol alone gives a text model vision, or send an unchecked browser data URL directly to a provider.

Correct: keep one typed in-process vision tool, bind it to an approved fallback vision model, validate and bound the image at every hop, then pass only an untrusted observation into the Agent graph. Add an MCP facade later only when another process needs the same tool.

## Scenario: Anonymous History And Product Surface

### 1. Scope / Trigger

- Applies whenever public-assistant session history, display restoration, fullscreen behavior, or the same-origin history proxy changes.
- A public session ID is a bearer capability, not an account identity. The browser may ask only about capabilities it already holds; the service must never expose a global anonymous-session index.

### 2. Signatures

- `POST /chat/public/sessions` with `{ sessionIds: string[] }` returns `{ sessions: PublicAssistantSessionSummary[] }` ordered by recent activity.
- `POST /chat/public/session` with `{ sessionId: string }` returns the active Branch path in chronological order, retained Revision snapshots for each Turn, bounded Branch summaries, and explicit turn/revision/branch truncation flags.
- `POST /chat/public/branch` accepts either `{ sessionId, action: 'select', branchId }` or `{ sessionId, action: 'continue-from-revision', revisionId }` and returns the same authoritative history projection.
- `DELETE /chat/public/session` with `{ sessionId: string }` returns `{ ok: true }`.
- `PublicAssistantAnswerRevision.displaySnapshotJson Json?` stores the nullable, versioned public display projection. Session deletion cascades Branches, Turns, Revisions, and Feedback; aggregate rows are independent.
- Cloudflare exposes matching same-origin routes at `/api/chat/public/sessions`, `/api/chat/public/session`, and `/api/chat/public/branch` without changing the upstream HTTP method.

### 3. Contracts

- The browser keeps a versioned, deduplicated registry of at most 24 session IDs. New capabilities use `crypto.randomUUID()` or at least 128 bits from `crypto.getRandomValues()`; weak timestamp or `Math.random()` fallbacks are forbidden.
- Capabilities are accepted only in bounded JSON bodies, never in path segments or query strings. The list operation intersects at most 24 submitted IDs with unexpired rows; unknown and expired IDs are silently omitted.
- Session history walks backward from the active Branch head through each Turn's `parentRevisionId`, retains at most the latest 100 ancestors, then returns them chronologically. It returns at most 8 Revisions per Turn and 24 Branch summaries with explicit `hasEarlierTurns`, `revisionsTruncated`, and `branchesTruncated` flags. Agent prompt history independently uses only the latest 6 selected ancestors.
- Each returned Turn carries one logical question, its real parent Revision identity, `selectedRevisionId`, and retained immutable Revision snapshots. Sibling revisions and hidden Branch Turns never enter the selected path or Agent history.
- Snapshot version 1 contains only allowlisted claims, public citations, bounded suggestions, and low-sensitive metadata. Recovery metadata is an optional additive field, so older version-1 snapshots without it remain readable. Serialization and hydration both re-run the public allowlist; invalid recovery values are discarded, and unknown versions or invalid shapes degrade to normalized question/answer text. Stored JSON is never returned directly.
- Secret-shaped or blocked turns store an empty safe snapshot. Provider/model identity, endpoints, prompts, credentials, raw diagnostics, raw errors, and internal citations are forbidden snapshot fields.
- Raw sessions, turns, and feedback use the configured 30-day retention period. Deletion and expiry do not delete, decrement, or rewrite `PublicAssistantDailyAggregate`.
- Every history response uses `Cache-Control: no-store`. History requests have an IP rate-limit bucket independent of chat and feedback.
- The Cloudflare proxy constructs a fresh request-header allowlist containing only `Accept` and, when applicable, `Content-Type`. Browser `Authorization`, `Cookie`, forwarding headers, and arbitrary client headers are never forwarded.
- Desktop opens compact and may toggle fullscreen. Mobile opens fullscreen. Only fullscreen is the outer modal; it locks document scrolling, restores launcher focus on close, and tracks `visualViewport` height so the soft keyboard cannot cover the composer.
- The history drawer is a modal layer within the assistant shell. Focus moves into it, Tab remains inside it, and Escape closes the drawer before a later Escape can close the assistant.
- Only the message region scrolls. Automatic following is allowed only while the visitor remains near the bottom; otherwise a return-to-latest action appears.
- First open restores an already persisted current capability before the composer can submit a follow-up. `session-not-found` replaces the expired current capability with a fresh one; transient failure remains explicitly retryable. Starting a new conversation aborts chat and history work, creates a fresh capability, clears hydrated/transient state, and ignores any completion whose controller or captured session no longer matches the active conversation.
- Branch selection and continue-from-revision increment the persisted selection version and atomically replace the browser path with the returned authoritative history. A late completion may save its Branch but cannot steal a newer explicit selection.
- Completed request replay remains bound to the frozen Revision response even after Branch selection changes. The browser refreshes authoritative Session history after replay instead of treating cached Branch-head identity as current mutable state.
- Stable transport errors retain the original prompt, mode, session, normalized history, and request ID for an explicit visitor retry. The local fallback display is never added to the retried payload. Visitor cancellation retains the question but creates a new request ID. Browser offline state and a bounded `Retry-After` deadline gate chat, health/history-list, and initial-restore retry controls; network restoration or deadline expiry updates availability only and never automatically spends another request. Synchronous duplicate activation of an enabled retry control still starts at most one request.
- Claim citation controls may target only citation IDs present in the same allowlisted display snapshot. Internal citation navigation closes the assistant/fullscreen shell without deleting the local capability registry.

### 4. Validation & Error Matrix

- Empty, malformed, oversized, or over-count session input -> stable validation error; no database query using unbounded caller data.
- Unknown/expired ID in session list -> omit it without revealing whether it ever existed.
- Unknown/expired single read or delete -> HTTP 404 with stable `session-not-found`.
- Unknown or cross-session Branch/Turn/Revision capability -> stable not-found response without confirming foreign ownership.
- Invalid branch action or generation intent -> `400 invalid-public-assistant-request`; branch/revision bound -> stable `409` conflict.
- Corrupt ancestry -> stable `409 public-assistant-history-invalid`, never partial raw rows.
- Persistence unavailable -> HTTP 503 with stable `database-not-configured`; chat may still use its documented fallback, but history must not invent persistence.
- Invalid or unsupported display snapshot -> return safe text-only history, not raw JSON and not a 500 response.
- Proxy timeout, unreachable upstream, invalid content type, or oversized body -> stable low-sensitive public error; never include upstream URL or raw upstream body.
- `429` -> preserve the bounded `Retry-After` value for actionable UI copy.

### 5. Good / Base / Bad Cases

- Good: the browser restores one selected Branch, previews sibling Revisions without changing it, explicitly continues from an older Revision, and refreshes into the same saved path.
- Base: an older Revision has no display snapshot; the visitor sees readable question/answer text while the server preserves opaque ancestry and truncation state.
- Bad: a caller submits guessed IDs, flattens sibling Branches into Agent history, trusts stored snapshot JSON, or uses current Branch state to rebuild an older completed replay.

### 6. Tests Required

- Persistence checks assert submitted-ID intersection, expiry, bounded ancestor/revision/branch truncation, snapshot allowlisting, legacy fallback, intent-aware canonical hashing, lease takeover/fencing, immutable Revision numbering and lineage, concurrent Branch forks, explicit-selection fencing, Revision feedback, replay independence, cascade deletion, and aggregate preservation.
- Migration checks assert legacy field parity, completed-cache version-2 backfill, Revision UPDATE rejection, same-session graph ownership, operational allowlists, and whole-session deletion against loopback PostgreSQL only.
- Agent/model checks assert direct/research request profiles, absolute-deadline attempts, abortable provider work/backoff, Responses JSON/SSE/chat-relay decoding, optional schema success/rejection, external abort propagation, and that an aborted response cannot reach persistence. API and rate-limit checks assert methods, bounded schemas, `404`/`503` stable errors, no-store headers, and an independent bounded history bucket.
- Model checks also assert passive reputation ordering, bounded cooldown skip/expiry, single-request half-open recovery, stale-score decay, request-local route freezing, and zero provider calls while ranking.
- Cloudflare checks assert method/body/request-ID preservation, cancellation routing, request/response limits, no-store, `Retry-After`, and removal of browser authorization and cookies.
- UI checks assert automatic rich restoration before follow-up, Revision switching without duplicate questions, revision-scoped content/feedback, Branch select/continue authoritative hydration, replay isolation, explicit truncation, expiry self-healing, transient retry, offline-to-online retry gating without automatic replay, wall-clock `Retry-After` expiry, claim-to-source focus, request/session race isolation, drawer/fullscreen focus ordering, desktop scroll lock, mobile no-autofocus, 44px Revision/Branch controls, and 320/390/430 containment.
- All checks use local fixtures only and must not call a live model, search, embedding, reranker, or vector database provider.
- The table-driven public quality matrix covers `direct`, `site`, `web`, and `combined`, all six public failure classes, recovery, cancellation, injection, secret seeking, citation integrity, follow-up/edit-resend continuity, and older snapshot hydration.

### 7. Wrong vs Correct

Wrong: expose `GET /sessions`, place a capability in the URL, generate it with time plus `Math.random()`, trust stored snapshot JSON, flatten all Revisions into prompt history, infer current history from a replay response, or forward browser headers.

Correct: intersect bounded browser-held capabilities in a JSON body, require cryptographic randomness, rebuild history from the selected Branch ancestry, replay the Request-bound Revision independently, hydrate through the public projection, and give each visible modal layer its own focus and Escape boundary.

## Sync And Deployment

- Production public knowledge sync prepares all 4096-dimensional embeddings, then transactionally replaces public Supabase pgvector documents, chunks, entities, and relations. A failed embedding or database transaction must leave the previous committed public dataset readable.
- The optional Qdrant adapter may still use a validated versioned collection and alias switch, but it is not the production store.
- Commit/checksum readiness gates prevent a stale deploy from activating newer knowledge.
- Cloudflare Functions expose the thin same-origin browser proxy plus two authenticated fixed-upstream Responses egress relay routes: primary and fallback. The chat stream Function and both model relay routes forward bounded SSE without buffering, preserve cancellation, and keep their timeout active until the upstream body closes. Model credentials may live in the relay secret bindings; search, RAG, embedding, reranker, sync, and database credentials remain on their owning server services.
- Deployed public chat, feedback, persistence, and public sync acceptance passed before the Operator/internal-RAG retirement began. Runtime code and configuration are public-only; PostgreSQL retirement, legacy Render Operator service deletion, and obsolete internal-Qdrant collection deletion completed through separate backed-up manual gates.

## Required Checks

```powershell
npm.cmd run assistant:public-agent-check
npm.cmd run assistant:public-image-check
npm.cmd run assistant:public-model-check
npm.cmd run assistant:public-metrics-check
npm.cmd run assistant:public-quality-check
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
npm.cmd run cf-model-relay:check
```

## Scenario: Cloudflare fixed-upstream Responses relay

### 1. Scope / Trigger

- Use this boundary only when an approved model channel works for an approved local business task but rejects the Render production egress.
- Render remains the public Agentic RAG authority; the relay replaces only the network exit used by planner/final Responses calls.

### 2. Signatures

- `relayResponsesRequest(request, env, dependencies?, channel?) -> Promise<Response>` where `channel` is `primary | fallback`.
- Pages routes: `POST /api/model-relay/responses` and `POST /api/model-relay/fallback/responses`
- Cloudflare bindings: `MODEL_RELAY_SHARED_TOKEN`, primary/fallback `MODEL_RELAY_*_UPSTREAM_BASE_URL` and `MODEL_RELAY_*_UPSTREAM_API_KEY`, `MODEL_RELAY_ALLOWED_MODELS`, and optional `MODEL_RELAY_TIMEOUT_MS`.

### 3. Contracts

- The caller presents `Authorization: Bearer <MODEL_RELAY_SHARED_TOKEN>`; the configured token must contain at least 32 characters, and comparison hashes both values and uses a constant-work byte loop.
- The relay constructs exactly one HTTPS `/responses` endpoint from the configured base. No request field or header can select an endpoint.
- Accepted top-level body fields are `model`, `stream`, `max_output_tokens`, `text`, and `input`; `model` must be in the bounded allowlist.
- Upstream headers are rebuilt from scratch with only bearer auth, JSON content type, and JSON/SSE accept negotiation.
- Chat generation and relay request bodies are at most 512 KB so one compressed image can pass end to end; non-generation assistant routes remain at 32 KB. JSON and SSE responses are at most 512 KB; the timeout is bounded to 55 seconds.
- Upstream non-2xx bodies are cancelled and replaced with `model-relay-upstream-rejected`; only the status and a fixed-enum `X-BIAU-Relay-Failure` category cross back to trusted Render diagnostics.

### 4. Validation & Error Matrix

- Missing configuration -> `503 model-relay-not-configured`, no fetch.
- Missing/invalid bearer -> `401 model-relay-unauthorized`, no fetch.
- Non-JSON -> `415 model-relay-json-required`; oversized -> `413 model-relay-request-too-large`.
- Malformed body, unknown fields, or unapproved model -> `400 model-relay-invalid-request`, no fetch.
- Timeout -> `504 model-relay-upstream-timeout`; transport/invalid content -> stable `502`.
- Caller cancellation -> request abort propagates upstream; no retry is created by the relay.

### 5. Good / Base / Bad Cases

- Good: Render sends an approved streaming Responses request, Cloudflare forwards one fixed request, and verified JSON/SSE returns under the shared deadline.
- Base: bindings are absent during code-first rollout, so the route fails closed while the existing direct Render channel remains untouched.
- Bad: a browser, leaked cookie, arbitrary endpoint field, unknown model, or oversized body reaches upstream; fixture tests must prove each is rejected.

### 6. Tests Required

- `npm.cmd run cf-model-relay:check` uses injected fetch fixtures and never resolves or calls a live model URL.
- Assert config/auth/input failures make zero fetch calls, exact fixed endpoint/header reconstruction, JSON/SSE success, error-body redaction, size limits, timeout, and stream cancellation.
- Run `cf-assistant:smoke`, public model/agent checks, `docs:deployment-check`, `lint`, and `build` before deployment.

### 7. Wrong vs Correct

Wrong: expose a generic authenticated proxy, accept caller-provided URLs/models, reuse browser headers, return provider error text, buffer SSE, or put the upstream key in a `VITE_*` variable.

Correct: one secret-authenticated route, one fixed HTTPS Responses upstream, a bounded allowlist containing only approved models, fresh headers, bounded streaming, redacted errors, and Render-owned Agent/RAG behavior.

These checks use local fixtures only. They must not probe a live model, search, embedding, Qdrant, or reranker provider. External acceptance uses one user-approved business question after deployment.
