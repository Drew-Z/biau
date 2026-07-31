# Public assistant provider fallback implementation

## Implementation order

- [x] Extend environment parsing with bounded fallback-provider configuration.
- [x] Extend model-channel resolution with deterministic attempt selection and safe
      next-attempt relation metadata.
- [x] Pass explicit attempt numbers through the public model interface and keep the
      planner primary-only.
- [x] Update Agent retry policy to combine failure class with channel relation while
      preserving the shared deadline, cancellation, and backoff contract.
- [x] Add fixture coverage for independent fallback, same-domain stopping, permanent
      errors, cancellation, deadline exhaustion, no-fallback compatibility, and
      secret-safe projections.
- [x] Update `.env.example`, `render.yaml`, `docs/deployment.md`, deployment-contract
      checks, and `.trellis/spec/backend/public-research-assistant.md`.

## Validation

```powershell
npm.cmd run assistant:public-model-check
npm.cmd run assistant:public-agent-check
npm.cmd run assistant:public-api-check
npm.cmd run docs:deployment-check
npm.cmd run server:build
npm.cmd run lint
npm.cmd run build
git diff --check
```

All checks must use local fixtures only and must not call a live model or enumerate a
provider's model catalog.

## Validation result

Passed on 2026-07-31:

- `npm.cmd run prisma:generate`
- `npm.cmd run assistant:public-model-check`
- `npm.cmd run assistant:public-agent-check`
- `npm.cmd run assistant:public-api-check`
- `npm.cmd run assistant:public-metrics-check`
- `npm.cmd run assistant:public-quality-check`
- `npm.cmd run docs:deployment-check`
- `npm.cmd run server:build`
- `npm.cmd run server:smoke`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`

`npm.cmd run docs:manual-gates-check` still reports the existing `chatus` and
`anchor-learning` ledger coverage gaps. This task did not change those project
mappings and leaves that unrelated baseline issue for its owning task.

## Review gates

- Confirm no secret, endpoint, provider identity, or model identity reaches browser
  payloads, logs, metrics, committed fixtures, or task artifacts.
- Confirm maximum generation attempts remain three across all channels.
- Confirm no configured fallback leaves current production behavior unchanged.
- Confirm health is configuration-only and no verification command performs provider
  liveness work.

## Rollback points

1. Environment/model resolution can be reverted independently before Agent adoption.
2. Agent policy can be reverted without schema or data rollback.
3. Deployment variables are optional; removing them disables the fallback chain.
