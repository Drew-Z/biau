# Design

## State model

- Add an initial restore state: `loading | ready | error`.
- The initial restore runs only when the widget is opened and the current session ID is already known locally.
- Keep a completion fence keyed by the requested session ID so a late response cannot overwrite a new or manually selected conversation.
- Reuse one projection helper for initial restore and history-panel restore.

## Interaction model

- Disable the composer and suggestion buttons while initial restore is loading.
- On restore failure, show an inline notice with retry and new-conversation actions.
- On `session-not-found`, forget the expired ID, create a replacement session, and return to an empty ready state.
- Preserve `truncated` in widget state and render it above the first restored turn.

## Citation navigation

- Give each citation card a deterministic DOM ID scoped by message and citation IDs.
- Render claim citation IDs as buttons only when they map to a citation in the same answer.
- Focusing a source uses `scrollIntoView`, programmatic focus, and a short highlight class cleared by a timer.
- Internal links call a navigation-preparation handler that closes history, widget, and fullscreen state without deleting messages or the session registry.

## Verification

- Extend the Playwright UI fixture with mocked session endpoints and mobile/desktop focus assertions.
- Keep all backend/model checks on local fixtures; no provider liveness calls.
