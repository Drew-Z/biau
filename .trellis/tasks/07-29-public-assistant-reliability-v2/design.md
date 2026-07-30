# Technical Design

## 1. Architecture Summary

The existing LangGraph remains authoritative. This task improves the generation
edge and its public projection rather than replacing the graph:

```text
browser widget
  -> Cloudflare same-origin SSE proxy
  -> LangGraph plan/research/generate/verify/finalize
  -> model attempt runner
       -> direct request profile OR evidence-bound request profile
       -> optional provider-capability-gated JSON Schema
       -> bounded retry within one absolute deadline
  -> internal diagnostic
  -> public recovery projection
  -> persistence snapshot + browser decoder + UI metadata
```

Raw provider events remain internal. The first browser-visible answer is still
the verified final projection.

## 2. Contract Ownership

### Internal provider result

`responsesApi.ts` continues to own endpoint selection, Responses/SSE decoding,
relay compatibility, timeout handling, output bounds, and internal diagnostics.
It gains:

- request profile options: `maxOutputTokens` and optional `jsonSchema`;
- attempt timing: total duration and time to first provider activity;
- a stable internal failure category independent of raw exception text.

### Agent attempt state

`publicAssistantAgent.ts` owns attempt count, retryability, remaining deadline,
abortable backoff, and the `recovering` progress event. The model adapter returns
a draft for every handled provider failure; the graph decides whether another
attempt is justified.

The attempt runner uses:

- maximum attempts: 3;
- backoff: bounded 200 ms then 400 ms, with deterministic injection in tests;
- minimum remaining budget before another attempt: the smaller of five seconds
  and the configured per-attempt allowance;
- the existing absolute request AbortSignal as the final authority.

### Public response metadata

`publicAssistantProjection.ts` is the only owner of internal-to-public mapping.
It maps internal diagnostics to:

```ts
type PublicAssistantRecoveryMeta = {
  state: 'none' | 'recovered' | 'degraded'
  attempts: 1 | 2 | 3
  failureClass?: 'not_configured' | 'timeout' | 'network' | 'upstream' | 'empty' | 'invalid'
}
```

`PublicAssistantDisplaySnapshot.meta.recovery` is optional. Existing version-1
snapshots remain valid; the added optional field is normalized on write and read.
Provider/model/endpoint identity and exact HTTP status remain excluded.

`publicAssistantApi.ts` owns the browser decoder and exposes typed recovery
metadata. `PublicAssistantWidget.tsx` only formats the normalized value.

## 3. Route-Specific Generation

`generatePublicAssistantDraft()` selects one of two request builders:

- `direct`: concise product/safety instruction, question, bounded recent history,
  no evidence array, and a smaller output-token budget;
- `research`: current evidence-bound prompt, page context, bounded history, and
  normalized evidence.

Both builders return the same normalized draft contract. Direct drafts require
empty claims. Research drafts still require claims to reference retained evidence.

The code must not duplicate provider transport. Request builders prepare input;
`requestResponsesText()` owns transport and decoding.

## 4. Structured Output Compatibility

Add a server-only enum setting:

```text
ASSISTANT_MODEL_STRUCTURED_OUTPUTS_MODE=off|json-schema
```

Default is `off` for compatibility. `json-schema` supplies the bounded answer
schema through the Responses request's structured-output field. Tests use a
loopback fixture and never call a provider.

The adapter does not automatically guess support and does not change endpoint or
protocol after a schema rejection. Production enablement is a documented manual
gate because the current relay's capability cannot be proven by configuration
presence alone.

## 5. Recovery UX

Extend the progress union with `recovering`. The UI copy is stable and low
sensitivity. A local elapsed timer may update visually after eight seconds but is
not announced repeatedly. The existing stop control remains enabled throughout
provider work and backoff.

Final answer metadata rules:

- first-attempt success: ordinary status, no noisy recovery label;
- later-attempt success: `已自动恢复 · 2/3 次尝试`;
- degraded result: failure-class copy plus duration;
- evidence insufficiency: remains `证据不足`, never a provider failure label.

## 6. Metrics

Keep `METRICS_ENABLED=false` by default. Extend the in-process registry rather
than adding a new telemetry SDK.

Planned low-cardinality metrics:

```text
biau_public_assistant_runs_total{route,outcome}
biau_public_assistant_model_attempts_total{outcome,failure_class}
biau_public_assistant_model_attempt_duration_seconds{outcome,...histogram}
biau_public_assistant_model_first_activity_seconds{outcome,...histogram}
```

Allowed enums are defined in one module and validated before recording. HTTP
duration buckets gain 15, 20, 30, and 45 seconds. No IDs, content, provider,
model, endpoint, exact status code, or arbitrary string becomes a label.

Metrics are recorded after each attempt and after finalization. Metrics failure
must never affect the answer path.

## 7. Evaluation And Tests

All ordinary checks are fixture-only. Add table-driven cases for route, provider
outcome, retry, abort, projection, persistence snapshot, SSE, and UI display.

The release acceptance sequence is:

1. deterministic checks;
2. static site and API deployment;
3. `/health` only;
4. one approved business question;
5. delete the temporary anonymous session;
6. record only low-sensitive outcome and duration evidence.

## 8. Dependency Security

Audit with `--registry=https://registry.npmjs.org`. Apply compatible updates in
a separate commit. Do not combine a provider/graph change and a lockfile-wide
upgrade in one rollback unit. Record residual advisories by runtime reachability,
affected feature, and upstream fix availability.

## 9. Compatibility And Migration

- No Prisma migration is required.
- Existing display snapshots remain readable because recovery metadata is optional.
- Existing clients ignore the new optional metadata.
- Schema output mode defaults off.
- Metrics remain default off.
- Current environment variables continue to work.

## 10. Free-Instance Warm-Up State Machine

The browser widget owns a separate `idle | warming | ready | error` warm-up
state. It is intentionally separate from answer service state so first-open
history effects cannot infer readiness from a presentational status label.

On open, one `AbortController` owns the complete warm-up lifecycle. The widget
requests `/health`; on failure it waits for one bounded, abortable delay and
requests `/health` once more. Success transitions to `ready`; the second failure
transitions to `error` and exposes the existing explicit health retry command.
Closing or unmounting aborts both the request and any pending delay.

The composer textarea remains editable in `warming` and `error`, but all
generation entry points check `warmupState === 'ready'`. Persisted-session
restore also waits for `ready`, retaining its target capability until then. No
question is queued or replayed automatically. A 504 health failure is rendered
as a service-starting condition and does not make a claim about model health.

This design accepts Render Free idle sleep instead of creating artificial
keep-alive traffic. The first visitor pays a visible preparation interval, but
their draft and conversation identity remain stable.

## 11. Rollback

Use independent commits for contracts, generation/retry, UI, metrics, and
dependencies. Rollback can disable schema mode and metrics without a code deploy.
If generation behavior regresses, revert the generation commit while retaining
public-safe diagnostics and contract tests. Deploy only the public API and static
site; do not restart Studio or RAG services.
