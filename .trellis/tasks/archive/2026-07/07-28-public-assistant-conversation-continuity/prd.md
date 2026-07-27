# Public assistant conversation continuity

## Goal

Restore the active anonymous session before follow-up, make truncation explicit, and connect claims and citations without blocking mobile route navigation.

## Requirements

- When the widget first opens, restore the current persisted anonymous session before the composer can submit a follow-up.
- Treat an expired session as recoverable: remove it from the local registry and start a fresh session without exposing stale context.
- Keep history restore failures visible and retryable without blocking a user from deliberately starting a new conversation.
- If the server reports truncated history, explain that only the most recent turns were restored.
- Claim citation identifiers must focus and briefly highlight the matching citation card.
- Navigating to an internal citation must close the widget and leave fullscreen before React Router changes the page.
- Opening the widget on a touch-sized viewport must not automatically open the soft keyboard; desktop keyboard focus remains supported.
- Preserve the existing session registry, answer cancellation, feedback, and safe Markdown behavior.
- Do not call real model, search, embedding, reranker, or vector database providers during verification.

## Acceptance Criteria

- [x] A stored current session is requested once on first widget open and its turns are rendered before follow-up submission is enabled.
- [x] A follow-up after restoration includes the restored conversation history.
- [x] Expired and unavailable session states have distinct, actionable UI behavior.
- [x] Truncated history renders a concise notice in the conversation log.
- [x] Claim citation controls move focus to and highlight the matching citation card.
- [x] Internal citation navigation closes the widget/fullscreen while keeping the session restorable.
- [x] Mobile first-open does not focus the textarea; desktop first-open does.
- [x] Fixture checks cover restore success, truncation, expiration, history failure, citation focus, and internal navigation.
- [x] `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:ui`, and relevant assistant fixture suites pass.

## Notes

- This slice intentionally leaves capability tokens, cross-instance rate limiting, request idempotency, and SSE observability for backend hardening work.
