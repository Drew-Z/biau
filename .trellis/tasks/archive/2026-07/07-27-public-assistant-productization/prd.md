# Public assistant productization

## Goal

Turn the public research assistant into a coherent website product surface: visitors can start and resume anonymous conversations, switch between compact and fullscreen use, read long answers without layout collisions, and understand recoverable service failures without exposing provider internals.

## Confirmed Facts

- The public assistant is anonymous and public-only. It must not depend on member or owner authentication.
- The browser currently persists one session ID but not messages. PostgreSQL already retains bounded public sessions, turns, and feedback for 30 days.
- The current message region is not a scroll container, so long output can paint over suggestions and the composer.
- The public API health route and basic proxy path are available; failures during a real question are currently collapsed into one generic local fallback state.
- Work is isolated in `D:\workspace4Cursor\blog-semi-public-assistant` on `codex/public-assistant-productization`; unrelated changes in the original worktree are out of scope.

## Requirements

- R1. Provide anonymous history for sessions created in the same browser. The browser owns a bounded registry of random session IDs; the server must never expose an enumerable global session list.
- R2. Allow a visitor to open, continue, and delete a retained conversation. Deleting raw history does not rewrite anonymous aggregate statistics.
- R3. A new-conversation command must abort any active request, create a fresh anonymous session, clear transient state, and prevent a late response from the previous session entering the new conversation.
- R4. Persist a versioned, public-safe display snapshot for new assistant turns so citations, claims, suggestions, metadata, and feedback can be restored. Older rows without a snapshot must degrade to question/answer text.
- R5. Keep all session capabilities in JSON request bodies rather than URLs. History and deletion responses must use `Cache-Control: no-store`, bounded input, rate limiting, expiry checks, and allowlisted output.
- R6. Desktop opens as the existing compact assistant and can enter or leave fullscreen. Mobile opens directly as a fullscreen dialog with safe-area handling and without competing with the bottom tab bar.
- R7. Fullscreen behavior must include dialog semantics, Escape close, focus restoration, background scroll lock, and icon buttons with accessible names.
- R8. Only the message region scrolls. Long messages, citations, history hydration, and the soft keyboard must not overlap the composer. Auto-scroll occurs only when the visitor is near the bottom; otherwise provide a return-to-latest control.
- R9. Add low-sensitive transport diagnostics for rate limiting, timeout, offline/unreachable, stream fallback, expired history, and upstream execution failure. Never expose provider, endpoint, credentials, prompts, or raw errors.
- R10. Cloudflare Pages Functions must proxy the new history operations through the same-origin `/api` surface without forwarding browser authorization or cookies.
- R11. Database absence may keep chat fallback usable, but history operations must return a stable unavailable response instead of inventing persistence.
- R12. No model, search, embedding, reranker, or vector database liveness probes are permitted during deterministic validation.

## Acceptance Criteria

- [x] A visitor can create at least two conversations, open either one after refresh in the same browser, continue it, and delete it.
- [x] A browser that does not possess a session ID cannot enumerate or retrieve it through the public history API.
- [x] New turns restore rich public citations and claims; old snapshot-less turns restore readable text without crashing.
- [x] Starting a new conversation during generation aborts the prior request and no late prior answer appears.
- [x] Desktop compact/fullscreen and mobile fullscreen expose history, new conversation, expand/minimize, and close controls with accessible labels.
- [x] At 320, 390, and 430 CSS pixels, long answers remain readable, the composer stays visible, and there is no horizontal overflow or message/composer overlap.
- [x] Escape closes the dialog, focus returns to the launcher, and background scrolling is locked only while the fullscreen dialog is open.
- [x] Recoverable failures show an actionable, non-secret explanation and retry affordance; 429 respects `Retry-After` when supplied.
- [x] Public API, persistence, service-mode, Cloudflare Function, lint, build, and targeted UI checks pass without live provider probes.
- [x] Only files in the isolated worktree and this task scope are committed.

## Out Of Scope

- Login-based or cross-device history synchronization.
- Internal assistant or AI Daily changes.
- Provider/model/search configuration changes or live model testing.
- Rewriting anonymous daily aggregates when a visitor deletes raw conversation history.
