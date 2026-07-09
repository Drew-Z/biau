# Internal Assistant LangGraph Agent Workspace Implementation Plan

## Phase 1: Planning Closure

- [x] Confirm final framework choice: recommended `LangGraph.js`.
- [x] Confirm that breaking changes to the old self-built orchestrator are allowed.
- [x] Review dependency package name/version and TypeScript usage from official docs before implementation.
- [x] Run `task.py start` only after user approves this planning package.

## Phase 2: Dependency And Type Foundation

- [x] Add LangGraph dependency to `package.json`.
- [x] Run install command and commit lockfile changes.
- [x] Define graph state types in a backend-owned module.
- [x] Keep state fields low-sensitive and typed.

Validation:

```powershell
npm.cmd run server:build
npm.cmd run lint
```

## Phase 3: Graph Runtime

- [x] Create `server/src/agentGraph.ts`.
- [x] Move deterministic planner out of `agentOrchestrator.ts` or expose it from `agentPlanner.ts`.
- [x] Implement nodes:
  - `input_guard`
  - `plan`
  - `validate_plan`
  - `execute_tools`
  - `compose_answer`
  - `self_check`
  - `persist_trace`
- [x] Compile graph and expose a graph runner.
- [x] Keep `runInternalAgent()` as thin public entry for `server/src/app.ts`.

Validation:

```powershell
npm.cmd run server:build
npm.cmd run server:smoke
```

## Phase 4: Tool And Guardrail Parity

- [x] Ensure all existing tools still run through `executeAgentTool()`.
- [x] Ensure forbidden permissions stay blocked.
- [x] Ensure `studio.draft` creates only `hidden / review-needed` drafts or plan-only artifacts.
- [x] Ensure model planner fallback remains deterministic for tests.
- [x] Ensure sensitive output is blocked after composition.

Validation:

```powershell
npm.cmd run assistant:meta-check
npm.cmd run assistant:service-modes-smoke
npm.cmd run assistant:rag-smoke
```

## Phase 5: Frontend Agent Inspector

- [x] Update `/assistant` diagnostics panel copy and layout to frame the result as a graph-based Agent run.
- [x] Normalize any new graph/node metadata through `src/data/assistant.ts`.
- [x] Render tool traces, guardrails, retrieval, and Studio draft artifacts without raw payloads.

Validation:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
```

## Phase 6: Open-Source Architecture Documentation

- [x] Add `docs/internal-assistant-agent-workspace.md` or similar.
- [x] Include architecture diagram, graph nodes, typed tools, RAG/Studio/status flow, guardrails, and verification commands.
- [x] Do not include secrets, private endpoints, raw tokens, real model relay URLs, or database URLs.

Validation:

```powershell
npm.cmd run docs:manual-gates-check
npm.cmd run lint
npm.cmd run build
```

## Phase 7: Final Verification

Run:

```powershell
npm.cmd run assistant:index
npm.cmd run assistant:eval
npm.cmd run assistant:kg-check
npm.cmd run assistant:rag-sync-local
npm.cmd run assistant:meta-check
npm.cmd run assistant:admin-check
npm.cmd run prisma:validate
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run assistant:rag-smoke
npm.cmd run cf-assistant:smoke
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
```

If broad changes touch docs/status/project/blog generated artifacts, run full:

```powershell
npm.cmd run verify
```

Result: `npm.cmd run verify` passed after the LangGraph implementation. The run covered assistant indexing, KG check, offline RAG eval with `modelCalls=0`, local RAG sync planning, meta/admin checks, Prisma validate, lint, server build/smoke, service-mode smoke, RAG smoke, Cloudflare function smoke, frontend build, blog checks, deployment/manual-gate/observability docs checks, Studio smoke, project detail evidence, status contract, preview, and UI checks.

## Risk And Rollback

- Risk: LangGraph API mismatch or ESM import friction.
  - Rollback: keep old `agentOrchestrator.ts` in git history; revert dependency and graph file.
- Risk: frontend normalizer rejects new metadata.
  - Rollback: keep `ChatResponse.meta.agent/tools/guardrails` shape conservative; add fields only after normalizer update.
- Risk: draft-write accidentally mutates public content.
  - Rollback: force first implementation to `studioDraftMode: "plan-only"` in tests and keep `studio.draft` review-required.
- Risk: model planner calls real provider in tests.
  - Rollback: smoke scripts must pass `plannerMode: "mock"` and assert no live provider diagnostics.

## Manual Gates

- User approval before installing new dependency and starting implementation.
- Optional future choice: whether to add LangSmith or another tracing provider; not part of this implementation.
- Any real model validation must be a specific approved business task, not a generic liveness prompt.
