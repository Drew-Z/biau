# Implementation Plan

## Worktree And Isolation

- Branch: `codex/public-assistant-reliability-v2`
- Worktree: `D:\workspace4Cursor\blog-semi-public-assistant-optimization`
- Base: `origin/main` at `70d55305`
- Do not modify or clean the unrelated retry draft in
  `D:\workspace4Cursor\blog-semi-public-route`.

## Ordered Slices

### 1. Establish Cross-Layer Contracts

- [x] Add internal attempt/timing types and the public recovery metadata union.
- [x] Extend public HTTP projection, display snapshot normalization, browser
      decoder, and conversation hydration fixtures.
- [x] Prove older snapshots remain valid before changing generation behavior.
- [x] Update backend/frontend type-safety and public-assistant specs.

Rollback point: contract-only commit with no behavior change.

### 2. Implement The Direct Request Profile

- [x] Split direct and evidence-bound request builders.
- [x] Remove research/evidence instructions and empty evidence payload from direct.
- [x] Add a bounded direct max-output setting to `env.ts`, `.env.example`,
      `render.yaml`, and deployment contract checks.
- [x] Preserve empty direct claims, sensitive-output blocking, bounded history,
      and existing route selection.

Rollback point: direct-profile commit.

### 3. Implement Budget-Aware Recovery

- [x] Add the bounded attempt runner and retry classifier.
- [x] Derive per-attempt allowance from the remaining absolute request budget.
- [x] Make backoff and active provider calls abortable.
- [x] Emit `recovering` without replaying or persisting an intermediate fallback.
- [x] Carry attempts/recovered/failure class to final internal metadata.
- [ ] Reconcile useful ideas from the external draft only through reviewed diffs;
      never overwrite that worktree.

Rollback point: retry commit independent from UI.

### 4. Add Optional Structured Outputs

- [x] Add `off|json-schema` server configuration and validation.
- [x] Add provider-neutral request options to the Responses adapter.
- [x] Define bounded planner and answer schemas in server code.
- [x] Cover success, unsupported schema, malformed stream, relay compatibility,
      empty output, oversized output, and cancellation with loopback fixtures.
- [x] Keep production setting off until the manual capability gate is completed.

Rollback point: capability remains off through environment.

### 5. Finish Recovery UX

- [x] Normalize and render safe recovered/degraded metadata.
- [x] Add `recovering` progress copy and optional non-announced elapsed timer.
- [x] Keep stop, retry, edit/resend, branch/revision, feedback, fullscreen,
      history, focus, and mobile behavior intact.
- [x] Add desktop and 320/390/430 UI fixtures on a dedicated local port.

Rollback point: UI commit; backend optional fields remain compatible.

### 6. Add Model-Path Metrics

- [x] Extend generic HTTP duration buckets through 45 seconds.
- [x] Add low-cardinality run/attempt/first-activity metrics.
- [x] Add fixture-only metrics checks and a changed-file sensitive scan.
- [x] Keep `METRICS_ENABLED=false` in Blueprint and examples.
- [x] Update observability docs/spec with allowed labels and manual scrape gate.

Rollback point: metrics are default-off and isolated from answer behavior.

### 7. Add The Quality Evaluation Matrix

- [x] Add table-driven direct/site/web/combined and failure fixtures.
- [x] Cover injection, secret seeking, cancellation, recovery, citation integrity,
      edit/resend, follow-up history, branch/revision, and old snapshot hydration.
- [x] Ensure no deterministic test can resolve a real provider endpoint.
- [x] Document the single-question production acceptance procedure.

### 8. Triage Dependencies

- [x] Run official-registry production audit and dependency tree inspection.
- [x] Apply non-breaking fixes in a dedicated dependency commit.
- [x] Record residual advisory reachability and upstream constraints.
- [x] Re-run every assistant and full-site gate after lockfile changes.

### 9. Final Documentation And Spec Pass

- [x] Update `docs/deployment.md`, `docs/observability-strategy.md`, and the public
      assistant engineering dossier.
- [x] Update backend public-assistant, observability, logging, quality, and
      frontend component/type-safety contracts.
- [x] Run deployment/doc consistency checks and PRD convergence review.

### 10. Rollout And Acceptance

- [x] Push reviewed commits to `main` in rollback-friendly order.
- [x] Deploy only `biau-public-assistant-api` on Render.
- [x] Allow the static Cloudflare site to build the matching frontend commit.
- [x] Verify API `/health` and current static assistant chunk without a model call.
- [ ] Run exactly one approved business request, inspect only public-safe metadata,
      and delete its temporary session.
- [ ] Record the approved business-request outcome and duration, then close the
      remaining manual gates without recording provider identity or content.

Low-sensitivity deployment and health evidence is recorded in
`research/rollout.md`. The final business-request row remains intentionally open
because no live model call is permitted without explicit approval.

## Required Validation

```powershell
npm.cmd ci
npm.cmd run assistant:public-agent-check
npm.cmd run assistant:public-model-check
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-conversation-check
npm.cmd run assistant:public-persistence-check
npm.cmd run assistant:public-rate-limit-check
npm.cmd run assistant:public-web-check
npm.cmd run assistant:public-sync-check
npm.cmd run assistant:hybrid-contract
npm.cmd run assistant:rag-smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run server:smoke
npm.cmd run cf-assistant:smoke
npm.cmd run docs:deployment-check
npm.cmd run server:build
npm.cmd run lint
npm.cmd run build
npm.cmd run performance:check
```

UI verification must use a server started from this worktree on a unique port:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5187
$env:UI_CHECK_BASE='http://127.0.0.1:5187'
npm.cmd run check:ui
Remove-Item Env:\UI_CHECK_BASE
```

Dependency audit:

```powershell
npm.cmd audit --omit=dev --registry=https://registry.npmjs.org
```

Do not add a live model call to any command above.

## High-Risk Files

- `server/src/publicAssistantAgent.ts`: graph retries, cancellation, deadline.
- `server/src/publicAssistantModel.ts`: direct/research prompts and draft status.
- `server/src/responsesApi.ts`: provider protocol and stream decoder.
- `server/src/publicAssistantProjection.ts`: public privacy boundary.
- `server/src/publicAssistantPersistence.ts`: snapshot compatibility.
- `server/src/metrics.ts`: label cardinality and sensitive-data boundary.
- `src/utils/publicAssistantApi.ts`: browser unknown-to-typed boundary.
- `src/components/PublicAssistantWidget.tsx`: concurrent request and modal UX.
- `scripts/check-ui.mjs`: comprehensive but time-sensitive UI fixture suite.

## Planning Exit Gate

- [x] PRD contains testable requirements and acceptance criteria.
- [x] Design defines ownership, contracts, compatibility, operations, and rollback.
- [x] Implementation is sliced into independent rollback units.
- [x] No repository-answerable product question remains open.
- [x] User approves starting implementation.
