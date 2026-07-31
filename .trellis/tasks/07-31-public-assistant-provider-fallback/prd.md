# Public assistant provider fallback

## Goal

Add server-only bounded fallback channels for the public assistant Responses model path without provider probing or secret exposure.

## Requirements

- Keep the existing `ASSISTANT_MODEL_*` channel as the primary public-assistant
  Responses generation channel.
- Allow operators to configure one server-only fallback provider with an ordered,
  comma-separated list of at most two model names. The fallback provider owns its
  own base URL and API key; no secret or private endpoint may enter source, logs,
  metrics, health responses, or browser payloads.
- Never enumerate, probe, ping, or send liveness prompts to primary or fallback
  models. Channel readiness is configuration-only; real provider acceptance remains
  an explicitly approved user task.
- Keep planning on the primary model only. A failed model plan must continue to use
  the deterministic planner so fallback latency is reserved for final answer quality.
- Bound answer generation to three attempts across the whole request. Attempt 1 uses
  the primary channel; later attempts use the ordered fallback model list when it is
  configured, otherwise preserve the current same-channel retry behavior.
- All attempts and abortable backoff must share the existing absolute request
  deadline. Adding fallback must not increase the maximum request budget.
- Allow an independent fallback after primary configuration, authentication,
  endpoint, timeout, network, rate-limit, upstream, empty, or invalid-response
  failure. Do not fallback after cancellation, policy refusal, or permanent request
  errors such as 400, 409, 413, or 422.
- Treat multiple models behind one fallback provider as one failure domain. After a
  fallback authentication or network failure, stop instead of trying another model
  on the same provider. Model-specific endpoint/rate-limit/upstream/empty/invalid
  failure may advance to the next configured fallback model.
- Preserve the public recovery schema and current UI behavior. Visitors may see a
  bounded recovery state and safe failure class, but never provider/model/channel
  identity, endpoint, exact upstream status, or raw diagnostics.
- Keep deployments with no fallback variables behaviorally compatible with the
  existing single-channel retry path.

## Acceptance Criteria

- [x] Environment parsing accepts a bounded, deduplicated fallback model list and
      rejects incomplete fallback configuration without throwing or leaking values.
- [x] The model layer deterministically selects the channel for attempts 1-3 and
      reports only safe channel summaries internally.
- [x] Primary 401/403/404/405, timeout/network, 408/425/429/5xx, empty, and invalid
      failures can reach an independent configured fallback within the existing
      deadline.
- [x] Permanent request errors, cancellation, and policy failures do not switch
      channels; fallback auth/network failure does not fan out across same-provider
      models.
- [x] No-fallback deployments keep the current retry count, backoff, deadline, and
      deterministic degradation behavior.
- [x] `/health` remains a configuration-only readiness check, succeeds when at least
      one complete generation channel exists, and never calls or identifies models.
- [x] Fixture checks prove channel order, failure-domain stopping, deadline and abort
      behavior, backward compatibility, and sensitive-field redaction without any
      live provider calls.
- [x] `.env.example`, `render.yaml`, deployment documentation, deployment-contract
      checks, and the public-assistant backend spec describe the same configuration.
- [x] `assistant:public-model-check`, `assistant:public-agent-check`,
      `assistant:public-api-check`, `docs:deployment-check`, `server:build`, `lint`,
      `build`, and `git diff --check` pass.

## Notes

- The known fallback channel uses the Responses protocol and exposes multiple model
  names, but its model catalog is intentionally not queried by this task.
- Multiple fallback models behind the same provider improve model-level resilience;
  they are not described as full multi-provider high availability.
