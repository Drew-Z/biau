# Public assistant provider fallback design

## Boundary

This change is server-only. It extends the public assistant's generation path and
deployment contract without changing the public request/response schema, browser UI,
persistence model, retrieval tools, or search adapters.

## Configuration

The existing `ASSISTANT_MODEL_*` variables remain the primary channel. One optional
fallback provider is configured with:

```text
ASSISTANT_MODEL_FALLBACK_BASE_URL
ASSISTANT_MODEL_FALLBACK_API_KEY
ASSISTANT_MODEL_FALLBACK_MODELS
ASSISTANT_MODEL_FALLBACK_PROVIDER
```

`ASSISTANT_MODEL_FALLBACK_MODELS` is a comma-separated ordered list. Parsing trims,
deduplicates, drops empty/oversized names, and keeps at most two models. The fallback
uses the existing Responses protocol and structured-output mode; no JSON containing
secrets is required.

## Runtime model

`model.ts` owns ordered channel resolution and safe summaries. The primary channel is
attempt 1. When fallback is configured, attempt 2 uses fallback model 1 and attempt 3
uses fallback model 2; with only one fallback model, attempt 3 may retry that same
model when the failure class permits. Without fallback configuration, attempts 2 and
3 continue to use the primary channel.

`PublicAssistantModel.answer()` receives the explicit attempt number. This avoids a
mutable channel cursor in the module singleton and keeps concurrent requests isolated.
The model interface also exposes the relation to the next attempt:

- `independent`: primary to fallback provider;
- `same-failure-domain`: one fallback model to another model on the same provider;
- `same-channel`: compatibility retry on the same channel;
- `null`: no later channel exists.

The Agent remains the single owner of attempt scheduling, backoff, cancellation,
absolute deadline, recovery aggregation, and safe failure classification.

## Failure policy

The next attempt is allowed only when both the failure and channel relation permit it.

| Failure | Independent fallback | Same provider/model domain |
| --- | --- | --- |
| not configured | yes | no |
| 401 / 403 | yes | no |
| 404 / 405 | yes | yes |
| timeout / network | yes | no after entering fallback provider |
| 408 / 425 / 429 / 5xx | yes | yes |
| empty / invalid response | yes | yes |
| 400 / 409 / 413 / 422 | no | no |
| cancellation / policy | no | no |

All permitted attempts keep the existing 200/400 ms abortable backoff and share the
same absolute request deadline. No code path increases the maximum wait.

## Planning and health

Planning uses only the primary channel. Failure falls back to the existing
deterministic planner, avoiding an extra network chain before research begins.

Health uses static configuration only. `modelConfigured` means at least one complete
generation channel exists. It never probes a provider and does not disclose channel
count, order, model, provider, endpoint, or credential state.

## Safety and compatibility

Fallback credentials and endpoints remain in server environment variables. Safe
channel summaries may exist internally for diagnostics, but the HTTP projection,
metrics labels, logs, and client snapshots keep their current identity-free contract.

Incomplete fallback configuration is ignored as unavailable rather than crashing the
service. Existing deployments with no fallback variables retain current behavior.

## Verification

Deterministic fixture servers exercise status, timeout, invalid, and abort behavior.
Checks must not resolve a private endpoint from local environment or send any live
model request. Deployment-contract checks own documentation and Blueprint consistency.

## Rollback

Removing the four fallback variables returns runtime behavior to the existing primary
channel immediately. Code rollback requires no data migration because the change adds
no database state and does not alter public payload schemas.
