# Internal Assistant Productized Agent Workspace Implementation Plan

## Phase 1: Planning

- [x] Create Trellis task.
- [x] Inspect existing LangGraph runtime, tool registry, planner, guardrails, assistant UI, admin UI, metadata normalizers, docs, and specs.
- [x] Write PRD for final productized Agent Workspace direction.
- [x] Write design with boundaries, contracts, and first implementation slice.
- [x] User review / approval before `task.py start`.

## Phase 2: First Slice - Workspace Product Surface Hardening

After user approval and `task.py start`:

1. [x] Load `trellis-before-dev`.
2. [x] Tighten `/assistant` first-screen product UX:
   - shortened the default opening message;
   - removed default citation cards from first load;
   - added an internal assistant run-status strip for mode, model channel, and next action;
   - clarified local fallback vs API/session/member state.
3. [x] Improve Agent inspector readability:
   - replaced the dense Agent bullet list with compact diagnostic cells;
   - rendered tool traces as productized trace cards with safe summaries and metrics;
   - kept Studio artifact links same-site and review-gated;
   - surfaced degraded/fallback/tool-error hints as next actions.
4. [x] Ensure metadata stays normalized through `src/data/assistant.ts`; page components still consume `normalizeAssistantAnswerMeta()` output only.
5. [x] Extend local checks:
   - `check:ui` now asserts concise `/assistant` opening copy;
   - default `/assistant` first load must not render citation cards;
   - Agent inspector panels and the run-status strip must stay visible.
6. [x] Update specs/docs for the reusable first-load UI contract.

### Phase 2 Validation Results

2026-07-10:

```powershell
npm.cmd run assistant:agent-contract # passed
npm.cmd run assistant:meta-check # passed
npm.cmd run assistant:admin-check # passed
npm.cmd run lint # passed
npm.cmd run build # passed
npm.cmd run check:ui # passed, 14 routes x 2 viewports at http://127.0.0.1:5174
```

## Phase 3: Validation

Minimum checks for first slice:

```powershell
npm.cmd run assistant:agent-contract
npm.cmd run assistant:meta-check
npm.cmd run assistant:admin-check
npm.cmd run check:ui
npm.cmd run lint
npm.cmd run build
git diff --check
```

Conditional checks:

```powershell
npm.cmd run assistant:service-modes-smoke
npm.cmd run server:smoke
npm.cmd run assistant:rag-smoke
npm.cmd run assistant:rag-sync-local
```

Run conditional checks if the slice touches route boundaries, backend runtime, RAG, or knowledge sync.

## Phase 4: Follow-Up Slices

Plan and execute later slices one at a time:

- [ ] Agent run replay / richer safe history meta.
- [ ] Internal knowledge source presets and review readiness.
- [x] Local eval cases for status/project/Studio draft workflows.
- [ ] Admin operations polish for RAG and member-channel confidence.
- [ ] Main-site public data sync when product facts change.
- [ ] Manual gate ledger updates for cloud/model/APK/production-only work.

### Phase 4 Slice: Local Agent Evaluation Workbench

Implemented a deterministic internal Agent eval gate:

- Added `server/scripts/agent-eval-workbench.ts`.
- Added `npm.cmd run assistant:agent-eval`.
- Added the eval gate to `scripts/verify.mjs`.
- Covered local no-live cases for:
  - Legal RAG status/project routing;
  - reviewed internal knowledge search;
  - Studio draft `plan-only` behavior;
  - planning plus current-session memory search.
- The script forces local-only runtime env during execution and restores the previous process env snapshot afterward. It does not call real model providers, relays, production RAG services, or external vector databases.

Validation:

```powershell
npm.cmd run assistant:agent-eval # passed, 4 cases
```

## Manual Gates

Record but do not block on:

- production admin/member token verification;
- real model-channel quality evaluation;
- Render/Supabase/Qdrant variable changes;
- real RAG sync against production collections;
- public demo credentials;
- APK release signing and download approval;
- analytics/tracing provider choices;
- GitHub/social preview account-side settings.

## Rollback Points

- UI text/layout changes: revert `src/pages/AssistantPage.tsx` and related CSS/checks.
- Normalizer changes: revert `src/data/assistant.ts` plus meta-check fixture.
- Backend Agent runtime changes: revert runtime files together with spec/check updates.
- Never use destructive git commands; inspect dirty files before staging.
