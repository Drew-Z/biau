# Public assistant immutable answer revisions

## Goal

Turn deliberate answer regeneration into a first-class, immutable, branch-aware conversation model. Visitors must be able to compare alternative answers, continue from any retained answer, switch between saved branches, refresh the page, and recover the same active path without duplicating questions or mutating earlier answers.

## Background

- The existing `PublicAssistantRequest` state machine already distinguishes one generation intent from transport retries. A retry reuses one `requestId`; a deliberate new generation uses a new UUID.
- The current `PublicAssistantTurn` still combines one user question and one answer in one row. The browser therefore implements regeneration by appending the same user question and another flat answer.
- Anonymous session IDs remain bearer capabilities. Revision and branch APIs must never expose a global session, branch, turn, or revision index.
- Production uses PostgreSQL, while chat must keep its documented direct/fallback behavior when persistence is unavailable. Persisted history, revision, and branch operations may return `database-not-configured` rather than inventing state.

## Product Decisions

- A logical turn is one user question. It owns one or more immutable answer revisions.
- Regeneration never edits or deletes an earlier answer. It creates a new revision with a new generation `requestId`.
- Every regeneration creates a saved branch rooted at the new revision and normally makes that branch active. A newer explicit branch selection wins over a late completion; the generated branch remains recoverable without stealing focus.
- A normal follow-up extends the active branch. If concurrent follow-ups start from the same branch head, both results remain saved; a late completion forks instead of overwriting the winning branch.
- Revision arrows only preview alternatives for one turn. `Continue from this version` activates or creates a branch rooted at that revision. Existing branch selection is a separate explicit control.
- The server persists the active branch. Refresh and another browser holding the same session capability recover that branch path.
- Feedback belongs to one revision, not to the logical turn.
- Aggregate generation counts include every successfully persisted revision. Session/branch turn counts count logical questions on their paths.

## Requirements

### R1. Immutable domain model

- Separate logical questions, answer revisions, and saved branches in PostgreSQL.
- An answer revision stores the public answer projection, evidence display snapshot, status, metrics, aggregate binding, revision ordinal, generation request binding, and optional base revision.
- Committed answer content, revision ordinal, turn ownership, request ownership, and lineage are immutable.
- A branch belongs to one anonymous session and points to one head revision. A session has one active branch pointer.

### R2. Generation semantics

- The request contract must explicitly distinguish `new-turn` and `answer-revision` intents.
- The canonical idempotency hash must include every normalized branch/turn/revision identity field.
- A completed request must bind exactly one immutable revision and replay that same public projection regardless of later branch switches.
- Migrated completed requests must replay a version-2 cache projection with their backfilled branch/turn/revision identity; deployment must not rely on a permissive browser decoder to repair old caches.
- A stale lease, cancelled request, or fenced completion must create neither a turn, revision, branch, aggregate increment, nor feedback.

### R3. Branch-aware context

- A new turn records the exact parent revision used as context.
- The authoritative persisted branch path is reconstructed from the branch head through turn parent-revision links.
- Agent history for persisted sessions must contain only the selected ancestor path. Sibling revisions and turns from other branches must never enter the prompt history.
- Regenerating a turn excludes that turn's previous answer from Agent history while retaining its ancestor context.

### R4. History and branch operations

- Session history returns the active path in chronological order, every retained revision for each path turn, the selected revision on that path, and a bounded branch summary list.
- Visitors can select an existing branch or continue from any returned revision using only capabilities already present in their session response.
- Branch creation and ordinal assignment are serialized per session and bounded. Repeated synchronous activation cannot create duplicate branches.
- Explicit branch selection advances a session selection version. A generation may auto-activate its result only when no newer explicit branch action occurred after that generation was claimed.
- Session list summaries describe the active branch, not all hidden branch turns combined.

### R5. Browser product behavior

- Regeneration adds a revision to the existing question card and does not append another user question.
- Each answer exposes stable previous/next revision controls, `n / total`, and a clear `Continue from this version` command when previewing a non-active revision.
- A branch menu shows bounded branch summaries and switches the visible conversation path without reloading the page.
- Citations, claims, suggestions, metadata, feedback, and recovery state remain revision-specific while switching versions.
- New conversation, session deletion, cancellation, retry, history restoration, fullscreen, focus management, and mobile layout continue to work with structured conversation state.
- A failed Branch selection or continue action remains visible in the main conversation, preserves the current active path, and retries the exact action at most once per visitor command.
- A failed answer regeneration preserves the persisted active/viewed Revision and its controls; only a successful remote completion may append a new Revision.

### R6. Anonymous safety and privacy

- Branch, turn, and revision ownership is validated through the submitted anonymous session capability on every read or mutation.
- Public responses remain allowlisted and `Cache-Control: no-store`; provider/model identity, endpoints, prompts, credentials, raw diagnostics, and private citations remain forbidden.
- Stored legacy or malformed display snapshots degrade to safe text rather than raw JSON or a server error.
- Cloudflare same-origin proxies forward only the existing header allowlist and preserve bounded bodies, request identity, response limits, and `Retry-After`.

### R7. Migration and lifecycle

- One migration backfills every retained legacy turn as revision 1, links completed requests and feedback to that revision, reconstructs the legacy chronological path, and creates one active branch per retained session.
- The migration preserves Session, Turn question metadata, Aggregate rows/counters, timestamps, and retention values; copies legacy answer/snapshot/aggregate fields into Revision; and rewrites completed request caches with version-2 conversation identity before dropping legacy columns.
- New writes use Revision as the only answer source of truth; the final schema must not retain long-term dual-write answer columns on Turn.
- Database ownership checks and application validation prevent a Session, Branch, Turn, Revision, Request, or Feedback from linking across anonymous session capabilities. Revision content updates are rejected at the database boundary after insert.
- Session deletion removes requests and cascades turns, revisions, branches, and feedback without changing historical aggregate rows.
- Retention deletes whole expired session trees. It must not delete a parent revision while leaving a reachable child branch.
- Operational SQL allowlists that protect public-assistant tables must include the revision and branch tables.

### R8. Bounded behavior and degradation

- Return the latest 100 ancestors ending at the active branch head, then order them chronologically. At most 8 revisions per returned turn and 24 branch summaries are returned; `hasEarlierTurns`, revision truncation, and branch truncation are explicit. Agent prompt history independently uses only the latest 6 selected ancestor turns.
- If PostgreSQL is unavailable, first-party chat may still return its existing non-persisted answer, but revision history, branch switching, and persisted feedback must fail explicitly rather than claiming success.
- No deterministic check may call a live model, search, embedding, reranker, Qdrant, or other external AI provider.

### R9. Deployable contract evolution

- Browser requests advertise `contractVersion: 2`. Version-2 server responses keep the existing public answer fields and add the versioned conversation identity projection.
- During the Render/Cloudflare rollout window, the new server accepts a bounded legacy body as a `new-turn` intent, while the new browser safely renders a legacy response without revision controls when conversation identity is absent.
- Old completed request caches are migrated to version 2. Compatibility is at the HTTP projection boundary only; it must not reintroduce legacy Turn answer writes or dual-write persistence.
- Deterministic checks cover old-browser/new-server and new-browser/old-server deployment windows.

## Acceptance Criteria

- [x] A first persisted answer atomically creates one logical turn, revision 1, branch 1, active-branch pointer, aggregate increment, and completed request binding.
- [x] Duplicate transports with one `requestId` execute and persist once; same-ID/different-intent payloads return the stable idempotency conflict.
- [x] Regeneration uses a new `requestId`, preserves the old revision, creates exactly one sibling revision and saved branch, and does not duplicate the user question in history or UI.
- [x] Previous/next controls switch answer, citations, claims, metadata, suggestions, and feedback as one revision snapshot.
- [x] Continuing from an older revision creates or reuses a branch rooted at that revision; the next question contains only that revision's ancestor chain.
- [x] Existing branch selection persists server-side and refresh restores the same active path and revision choices.
- [x] Concurrent completions from one branch head preserve both results on separate branches and never overwrite immutable answers.
- [x] Two concurrent first requests for one empty session become two retained root branches with distinct ordinals; neither valid result is lost.
- [x] A branch selection made while generation is running remains active after late completion; the completed answer is saved on its branch without stealing focus.
- [x] Feedback can differ between sibling revisions and aggregate feedback counters update only for the targeted revision's aggregate.
- [x] Cancellation, lease takeover, stale completion, retention, session deletion, and cached replay preserve all request/revision/branch invariants.
- [x] The migration preserves legacy Session/Turn/Aggregate data, copies every answer/display/aggregate binding into revision 1, relinks Request/Feedback, creates parent/branch pointers, and upgrades completed replay caches without losing public history.
- [x] Revision content and ownership cannot be updated through application write paths or direct SQL after insert, while whole-session deletion still succeeds.
- [x] JSON, SSE, history, branch operations, Cloudflare proxies, browser normalization, and UI fixtures cover valid, malformed, missing, expired, truncated, concurrent, and cross-session cases.
- [x] Branch-action 409/503 failures preserve the active path and expose an exact-action retry; failed regeneration preserves Revision navigation until a successful retry appends the new version.
- [x] Prisma validation/generation, lint, frontend/server builds, public Agent/API/persistence/rate-limit/Cloudflare fixtures, conversation fixture, performance budget, `git diff --check`, and responsive `check:ui` all pass without live provider calls.

## Out Of Scope

- Editing a committed answer or question.
- Token-level stream resume.
- Cross-session branch sharing, public branch URLs, accounts, or multi-user collaboration.
- Branch deletion, branch naming, branch merging, or a full tree visualization.
- Changing the public Agent graph, retrieval ranking, model provider, or search provider.

## Open Questions

None. The product decisions above are the default route approved by the user's request to continue toward the final public-assistant form.
