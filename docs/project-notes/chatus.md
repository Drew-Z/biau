# Chatus Engineering Dossier

## Executive Summary

Chatus is an invitation-only private AI workspace deployed on Cloudflare. It combines a React client, Worker routing, member-scoped and conversation-scoped Agents, durable state, explicit memory, provider coordination, capability policy, and a production-only CI release path. [source-verified] Evidence: E-CHATUS-001, E-CHATUS-002, E-CHATUS-008.

Its central engineering choice is to model a working relationship rather than a stateless completion endpoint. A member owns durable session and memory state; each conversation owns its message and stream lifecycle; provider capacity is coordinated separately. This keeps authorization, recovery, and fallback semantics visible instead of hiding them in one route handler.

## Product Boundary

- The product is a trusted-member web workspace with an optional restricted guest surface, not a public chat SaaS or public API proxy. [source-verified] Evidence: E-CHATUS-001.
- A reachable login page does not imply that an account, access code, guest mode, BYOK, tools, MCP, memory, export, feedback, or upload is publicly available.
- The main site may link the invitation-only entry and describe public architecture, but it must not reveal source location, access material, member records, provider identities, encrypted values, or operational detail.

## Architecture

The React client uses Agent-aware hooks and WebSocket transport for conversation state. The Worker owns asset delivery, route selection, session checks, public-safe API projection, request IDs, and error redaction. [source-verified] Evidence: E-CHATUS-002, E-CHATUS-003.

Three Durable Object responsibilities matter:

- `UserState`: one root Agent per member for conversation index, long-term memory, and cleanup state.
- `TeamAgent`: one Agent per conversation for messages, resumable streams, approvals, editing, regeneration, continuation, and branches.
- `ProviderCoordinator`: concurrency leases for exclusive, bounded, and unlimited provider offerings.

Shared access policy and encrypted managed secrets live in KV. The browser and read APIs do not receive plaintext managed credentials. [source-verified] Evidence: E-CHATUS-002, E-CHATUS-007.

## Core Implementation

- `src/index.ts` exports the Worker and the three Durable Object classes used by the runtime.
- `src/worker.ts` owns public routing, session guards, API projection, request IDs, and error redaction.
- `client/src/components/ChatWorkspace.tsx` connects the React workspace to Agent/WebSocket state and resumable chat behavior.
- Provider routing and stream adapters enforce concurrency leases, protocol normalization, and the no-fallback-after-visible-output rule.

[source-verified] Evidence: E-CHATUS-002, E-CHATUS-003, E-CHATUS-004.

## Core Data Flow

1. A browser establishes a member or restricted guest session.
2. The Worker routes Agent/WebSocket traffic after applying the session boundary.
3. `UserState` resolves the member's conversation index and explicit memory.
4. `TeamAgent` replays the conversation, processes the new turn, and persists stream and branch state.
5. Logical-model routing selects a prioritized provider offering and obtains a concurrency lease.
6. Protocol adapters normalize the selected upstream stream.
7. Visible output, tool state, approval state, and request identity are projected back to the client without exposing provider credentials.

[source-verified] This flow is backed by the route, Agent, provider, and stream contracts. Evidence: E-CHATUS-003, E-CHATUS-004.

## Reliability And Failure Handling

Provider fallback is permitted only before the first visible output. Empty streams, malformed server-sent events, or a stream that only terminates are protocol failures; once text, reasoning, or tool output is visible, Chatus does not concatenate a second provider response. [source-verified] Evidence: E-CHATUS-004.

Conversation edits and branches retain origin relationships. Multi-device mutation uses conflict protection, conditional deletion, tombstones, and an account-level deletion timeline so stale clients cannot silently resurrect removed state. [source-verified] Evidence: E-CHATUS-005.

Every response carries a request ID. User-visible failures show a shortened correlation value, while logs avoid message bodies and credential material. Reliability views use redacted real-task telemetry rather than synthetic completion probes. [source-verified] Evidence: E-CHATUS-007.

## Trade-Offs

- Per-member and per-conversation Durable Objects keep state ownership close to the mutations they serialize, but require explicit actor migrations, conflict rules, and cleanup behavior.
- A single stateless database service would centralize queries, but it would push stream recovery, conversation ordering, and provider leases into broader transactional coordination.
- Explicit text memory is inspectable and revocable, but less automatic than an opaque embedding-based profile and requires deliberate member maintenance.
- Stopping fallback after visible output protects response integrity at the cost of returning a partial failure instead of silently completing from another provider.

[source-verified] Evidence: E-CHATUS-002, E-CHATUS-004, E-CHATUS-005.

## Security And Privacy

- Session access is separated from member capabilities.
- Skills and tools are checked when projected and again when executed; revocation applies to old conversations.
- Managed provider keys are encrypted before KV persistence and are not echoed by UI or read APIs.
- Restricted guests do not inherit member-only BYOK, Skills, MCP, long-term memory, upload, export, or feedback surfaces.
- Public screenshots use deterministic fixtures and synthetic names rather than production members or content.

[source-verified] Evidence: E-CHATUS-006, E-CHATUS-007.

## Verification

The repository separates frontend checks, unit and integration tests, TypeScript checks, and browser suites. Browser coverage spans wide desktop, desktop, boundary, mobile, and touch widths. Server coverage includes routing, Agent runtime, provider routing and leases, stream normalization, tools and approvals, MCP, managed secrets, quotas, client state, admin policy, and deployment configuration. [source-verified] Evidence: E-CHATUS-008.

The portfolio screenshots are fixture evidence, not proof that the current production service is healthy. A real production claim requires the deployment workflow's exact-version smoke or a separately recorded acceptance.

## Delivery Status

The invitation-only entry was reachable and redirected into the React workspace when integrated into the main site. This is a narrow entry observation, not a credentialed capability acceptance. [production-observed] Evidence: E-CHATUS-009.

Production mutation belongs to Chatus's own workflow. The main-site integration is read-only with respect to Chatus and does not enable guests, change provider policy, or deploy the service.

## Code Entrypoints

- Worker exports: `src/index.ts`.
- HTTP/session router: `src/worker.ts`.
- React workspace: `client/src/components/ChatWorkspace.tsx`.
- Frontend, unit, type, browser, and deployment commands: `package.json`.
- Product, provider, memory, access, and release contracts: `README.md`.

[source-verified] Evidence: E-CHATUS-001, E-CHATUS-003, E-CHATUS-008.

## Evidence

Primary evidence: E-CHATUS-001 through E-CHATUS-009. The architecture image on the project page is a public-safe projection of those contracts, while runtime images come from deterministic visual fixtures.

## Interview Focus

Expect questions about why state is split across member, conversation, and provider coordination; why fallback stops after visible output; how revocation reaches existing sessions; why memory is explicit; how WebSocket recovery interacts with durable state; and why production health cannot be inferred from an uncredentialed login page.
