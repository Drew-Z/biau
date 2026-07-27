# Public assistant productization design

## Boundaries

- Frontend ownership stays under `PublicAssistantWidget` and `publicAssistantApi`; no global application store is required.
- Public routes remain in the public assistant service mode. Persistence stays in `publicAssistantPersistence`.
- Cloudflare Pages remains a thin same-origin proxy. No database or provider credential reaches the browser.
- Anonymous history is capability-based: a browser submits only the session IDs it already owns. The API does not accept owner IDs and does not enumerate all sessions.

## API Contract

All operations use bounded JSON bodies and return `Cache-Control: no-store`.

- `POST /chat/public/sessions`
  - Input: `{ sessionIds: string[] }`, deduplicated and capped.
  - Output: `{ sessions: SessionSummary[] }` in the same safe subset, ordered by recent activity.
- `POST /chat/public/session`
  - Input: `{ sessionId: string }`.
  - Output: `{ session, turns, truncated }`; only unexpired rows are returned.
- `DELETE /chat/public/session`
  - Input: `{ sessionId: string }`.
  - Output: `{ ok: true }`; missing/expired sessions use a stable not-found result.

The list endpoint is not an account lookup: it intersects the supplied IDs with unexpired database rows. Session IDs stay out of path/query logs.

## Persistence

Add nullable `displaySnapshotJson` to `PublicAssistantTurn`. Version 1 stores only the already-public HTTP projection subset:

- `version`
- allowlisted `claims`
- allowlisted public `citations`
- bounded `suggestions`
- low-sensitive `meta`

Question, answer, mode, route, status, and timestamps remain normalized columns. Secret-shaped or blocked turns store an empty safe snapshot. Existing rows remain readable through a text-only fallback. Session deletion cascades turns and feedback while aggregate rows remain intact.

## Browser State

Use a versioned local registry containing current session ID and recently used session IDs. Enforce identifier validation, deduplication, last-used ordering, and a bounded count. Storage failure degrades to the current in-memory session.

The widget owns:

- compact/fullscreen surface mode
- current session and hydrated messages
- history list state
- request state and classified error
- near-bottom state

Every request captures its session ID. Completion mutates state only when both the active controller and captured session still match.

## UI And Accessibility

- Desktop launcher opens compact. Header controls provide history, new conversation, expand/minimize, and close.
- Mobile media query opens fullscreen immediately; desktop can toggle fullscreen.
- The panel is a modal dialog only in fullscreen. Fullscreen locks document scrolling, handles Escape, focuses the composer, and restores launcher focus on close.
- The panel uses fixed header/body/composer rows. The conversation body is the only vertical scroll container.
- History appears as an adjacent drawer inside the assistant shell, not a nested card. On narrow screens it replaces the conversation body and provides a clear back action.
- A return-to-latest control appears when new content arrives while the user is not near the bottom.

## Failure Model

`PublicAssistantTransportError` carries a stable public code, HTTP status, retry delay, and JSON-fallback eligibility. UI copy maps only stable categories:

- rate limited
- request timeout
- offline or endpoint unreachable
- service execution failed
- expired/missing history
- persistence unavailable

Raw response bodies, URLs, provider identity, and endpoint details are never displayed or persisted.

## Rollout And Rollback

- Schema change is additive and nullable, so old application revisions remain compatible.
- Deploy database migration before or with the public API revision; old turns have text-only history.
- New Cloudflare Functions are additive. The frontend continues to use local fallback when chat execution fails.
- Rollback removes frontend use of history endpoints; the nullable snapshot column may remain without behavioral impact.
