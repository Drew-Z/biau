# Internal Assistant Agent Framework Hardening Implementation Plan

## Phase 1: Planning

- [x] Create Trellis task.
- [x] Record PRD for the Agent framework hardening direction.
- [x] Inspect current LangGraph runtime, tool registry, planner, guardrails, metadata normalizer, and smoke coverage.
- [x] Write design for the first deterministic contract-check slice.
- [x] User review before `task.py start`.

## Phase 2: First Slice Implementation

After user approval and `task.py start`:

- [x] Add `server/scripts/agent-framework-contract.ts`.
- [x] Reuse existing runtime exports instead of duplicating implementation:
   - `AGENT_GRAPH_STEPS`
   - `runInternalAgent`
   - `sanitizeToolTrace`
   - `buildStudioDraftArtifact`
- [x] Add local-only assertions for:
   - graph node sequence;
   - mock planner status/project tool selection;
   - plan-only Studio draft tool trace;
   - sensitive input guardrail behavior;
   - Studio artifact link sanitizer;
   - metadata sensitive-shape scan.
- [x] Add npm script:
   - `assistant:agent-contract`
- [x] Keep the script deterministic:
   - no live model provider;
   - no live RAG Orchestrator;
   - no cloud or production API;
   - no `.env` value printing.

## Phase 3: Validation

Run:

```powershell
npm.cmd run assistant:agent-contract
npm.cmd run server:build
npm.cmd run assistant:meta-check
git diff --check
```

If the script touches shared backend imports in a way that affects service boundaries, also run:

```powershell
npm.cmd run assistant:service-modes-smoke
```

If frontend metadata normalizers are changed, also run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Validation results on 2026-07-10:

- [x] `npm.cmd run assistant:agent-contract` -> passed.
- [x] `npm.cmd run server:build` -> passed.
- [x] `npm.cmd run assistant:meta-check` -> passed.
- [x] `git diff --check` -> passed; only Git LF/CRLF working-copy warnings.
- [x] `npm.cmd run assistant:service-modes-smoke` -> passed.
- [x] `npm.cmd run server:smoke` -> passed.
- [x] `npm.cmd run lint` -> passed.
- [x] `npm.cmd run build` -> passed.
- [x] `.trellis/spec/backend/agentic-workspace.md` updated with the new contract-check gate and trace-summary redaction rule.

## Phase 4: Documentation And Spec Sync

- Update `docs/internal-assistant-agent-workspace.md` only if the public-safe operator guidance changes.
- Update `.trellis/spec/backend/agentic-workspace.md` if a new executable contract or invariant is discovered.
- Record validation output in this `implement.md`.

## Risks And Guards

- Risk: duplicating smoke coverage too much.
  - Guard: keep this script focused on framework invariants, not HTTP route behavior.
- Risk: accidental live model/RAG calls.
  - Guard: always pass `plannerMode: "mock"` and use local Prisma stubs.
- Risk: leaking metadata while debugging.
  - Guard: failure messages identify field classes, not raw payload values.
- Risk: planning gets stuck.
  - Guard: first slice is intentionally small and can be implemented without user secrets or platform access.

## Manual Gates

None for the first slice.

Later slices may record manual gates for:

- production member-token validation;
- real model-channel quality evaluation through an approved real task;
- Render/Supabase/Qdrant configuration checks;
- external tracing/observability provider setup.
