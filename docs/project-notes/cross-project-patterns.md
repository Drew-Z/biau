# Cross-Project Engineering Patterns

## Shared Boundaries

All four systems separate an internal working model from a public projection. Chatus projects a session-safe workspace; Anchor projects located source evidence; the public assistant projects verified claims and citations; AI Daily projects approved events and editions. [source-verified] Evidence: E-CROSS-001.

Their runtime shapes differ:

| System | Unit of work | Durable boundary | Public output |
| --- | --- | --- | --- |
| Chatus | conversation turn | member and conversation Durable Objects | invitation-only workspace response |
| Anchor | source-to-practice lifecycle | local SQLite repositories and checkpoints | traceable question and explanation |
| Public assistant | bounded anonymous request | graph state plus optional 30-day persistence | verified claims and citations |
| AI Daily | ingestion and editorial work item | database lease, checkpoint, revision, approval | approved Flash item or static edition |

## Evidence-Bound Design

Anchor and the public assistant both ground output, but at different granularities. Anchor stores chunk IDs and locators with learning objects; the assistant verifies answer claims against citation candidates. AI Daily adds a human gate after model validation, while Chatus focuses on session authority and stream integrity rather than publishing a claim corpus. [source-verified] Evidence: E-CROSS-002.

The common rule is that discovery is not evidence, model output is not approval, and a public projection is not the internal source of truth.

## Deterministic Checks

Each project uses deterministic checks around high-risk boundaries: Chatus protocol and UI fixtures, Anchor question/progress and Playwright cases, public-assistant graph/API/retrieval contracts, and AI Daily state-machine and readiness checks. Live provider calls are separate, explicit, and never smuggled into ordinary documentation or UI validation. [source-verified] Evidence: E-CROSS-003.

## Fail-Closed Comparison

- Chatus stops provider fallback after visible output rather than concatenate two upstream responses.
- Anchor rejects candidates that cannot preserve valid citations or answer support instead of promoting fluent but ungrounded questions.
- The public assistant downgrades to partial or uncertain language when retained evidence cannot support a claim.
- AI Daily refuses production generation when the flag, server-only runtime, approved bundle, or approval state is missing or stale.

The shared fail-closed rule is not “all failures look the same.” Each system identifies the last boundary before an irreversible or misleading public effect and refuses to cross it without the required evidence. [source-verified] Evidence: E-CROSS-002, E-CROSS-004.

## Realtime And Asynchronous Execution

Chatus and the public assistant are request-oriented: users wait for a conversation stream or bounded research answer, so cancellation, visible partial output, latency, and replay safety dominate. Anchor combines an interactive local session with checkpointed learning work, so it can recover without a server lease. AI Daily is asynchronous and editorial: work may outlive one process and pause for human review, so leases, checkpoints, immutable revisions, idempotency, and explicit scheduling gates dominate.

Choosing the wrong model creates different failures. Treating a live stream like a background job can replay visible output; treating an editorial pipeline like one request loses restart and approval state. [source-verified] Evidence: E-CHATUS-004, E-ANCHOR-004, E-PA-002, E-AID-002.

## Failure And Recovery

- Chatus permits provider fallback only before visible output and uses durable conversation state for recovery.
- Anchor rejects or resets malformed local Demo state and uses checkpoints for longer client learning sessions.
- The public assistant bounds research retry to one cycle and degrades to uncertain or local fallback states.
- AI Daily uses durable work, leases, checkpoints, immutable revisions, and feature flags because its workflow crosses process and human-review boundaries.

[source-verified] Evidence: E-CROSS-004.

## Privacy And Public Projection

The systems deliberately avoid different classes of leakage: member and provider data in Chatus, imported documents in Anchor, internal graph/provider fields in the assistant, and evidence bodies/run details in AI Daily. A reusable review question is: “Which fields are necessary for the user's next decision, and which only satisfy internal curiosity?”

## Trade-Offs

- Durable Objects reduce coordination distance for Chatus but introduce actor ownership and migration concerns.
- Local-first SQLite improves Anchor privacy and offline continuity but makes schema and multi-device migration harder.
- Claim verification improves assistant trust but adds latency and can force an uncertain answer.
- Human approval protects AI Daily publication but increases lead time and operational state complexity.
- Static Demos are cheap and deterministic, but they must be labeled so they do not impersonate full products.

## Evidence

Cross-project conclusions are derived from E-CROSS-001 through E-CROSS-004 and the project-specific evidence they reference. They are comparisons, not a claim that all systems share an implementation framework.
