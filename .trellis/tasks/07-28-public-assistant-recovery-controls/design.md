# Design

## Retry metadata

- `AssistantIssue` retains the bounded `retryAfterSeconds` and a client wall-clock `retryAvailableAt` derived when the response is received.
- A low-frequency interval recalculates remaining seconds from the deadline. It updates only while any visible issue has a positive retry delay.
- Retry availability is a pure derived predicate combining online state and remaining delay.

## Network state

- Initialize from `navigator.onLine` and subscribe to browser `online` / `offline` events.
- Offline remains user-controlled: restoration changes copy and enables retry but never replays automatically.
- The retained issue still owns the original prompt/mode, so the existing retry path can resume the same request.

## Surface behavior

- Main notice, initial-restore notice, and history drawer use the same retry predicate and countdown label.
- New conversation remains available even when restore is offline or rate-limited.
- Local fallback content remains visible while recovery controls change.
