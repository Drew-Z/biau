# Public assistant recovery controls

## Goal

Make offline and Retry-After recovery states actionable, bounded, and covered by local UI fixtures.

## Requirements

- Track browser `online` / `offline` changes while the widget is mounted.
- An offline request failure must disable retry while the browser remains offline.
- When the browser reports online again, keep the failed prompt and change the notice to an explicit recoverable state without automatically spending another request.
- A `429` response with bounded `Retry-After` must expose a wall-clock countdown and keep retry disabled until the deadline.
- Countdown recovery must tolerate background-tab timer throttling by calculating against the original deadline.
- Apply the same retry gating to chat, health/history retry, and initial-session restore controls.
- Preserve local fallback answers, pending prompts, and the existing cancellation behavior.
- Verification must use local browser/network fixtures only; do not call real model, search, embedding, reranker, or vector providers.

## Acceptance Criteria

- [x] Offline notices disable retry and update to “network restored” after an `online` event.
- [x] Network restoration never automatically replays the failed prompt.
- [x] `Retry-After` notices show remaining seconds and enable retry only at zero.
- [x] Countdown uses a stored deadline and catches up after delayed timer callbacks.
- [x] Initial restore and history retry controls obey the same offline/rate-limit gating.
- [x] UI fixtures cover offline-to-online and `429` countdown behavior.
- [x] Lint, build, UI checks, performance budget, and diff validation pass.

## Notes

- No automatic model or endpoint liveness checks are introduced.
