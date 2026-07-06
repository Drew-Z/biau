# Internal Assistant Agentic Workspace Implementation Plan

## Planning Gate

- [x] Create Trellis child task under continuous improvement parent.
- [x] Run smart-search research for current Agentic RAG / agent architecture.
- [x] Run second smart-search architecture review for Agentic Workspace vs Agentic Workflow Runtime / LangGraph / Agents SDK / GraphRAG / memory.
- [x] Inspect existing internal assistant, RAG, model-channel, Studio and status boundaries.
- [x] Write final-shape PRD, design and implementation plan.
- [x] Resolve write-permission product decision: first implementation allows `draft-write` only; publish/deploy/admin/external-live actions are blocked from normal chat.
- [x] User review / approval before `task.py start`: user approved entering implementation.

## Phase Transition Gate

- [x] `python ./.trellis/scripts/task.py start ./.trellis/tasks/07-06-internal-assistant-agentic-workspace`
- [x] Status is now `in_progress`; implementation may proceed after loading `trellis-before-dev`.

## Implementation Checklist

1. [x] Load specs before editing:
   - `.trellis/spec/backend/index.md`
   - `.trellis/spec/frontend/index.md`
   - `.trellis/spec/guides/index.md`
   - relevant assistant/RAG/Studio scenarios referenced from those indexes.
2. [x] Add Agent type contracts:
   - `server/src/agentTypes.ts`
   - safe meta shape compatible with `ChatResponse.meta`.
   - explicit workflow step ids: plan, validate, execute, critique, compose, sanitize, persist.
3. [x] Add typed tool registry:
   - `server/src/agentTools.ts`
   - implement `rag.retrieve`, `status.query`, `project.lookup`, `knowledge.search`, `studio.draft`, `memory.search`, `answer.direct`.
4. [x] Add guardrails:
   - `server/src/agentGuardrails.ts`
   - permission checks, scope checks, trace sanitizer, sensitive-output check, citation sufficiency summary.
5. [x] Add Agent Orchestrator:
   - `server/src/agentOrchestrator.ts`
   - stateful Agentic Workflow Runtime.
   - model planner path, deterministic mock planner path, typed step transitions, tool execution budget, bounded critique/retry loop, final answer composition.
   - keep extension slots for future handoffs/subagents/framework adapters without requiring LangGraph/OpenAI Agents SDK now.
6. [x] Replace internal chat main path:
   - `server/src/app.ts`
   - `/chat/internal` calls Agent Orchestrator and persists safe Agent meta.
   - Keep sessions/member auth unchanged.
7. [x] Extend frontend normalizers:
   - `src/data/assistant.ts`
   - normalize Agent meta/tools/guardrails from `unknown`.
8. [x] Upgrade `/assistant` inspector:
   - `src/pages/AssistantPage.tsx`
   - show tool trace, Agent status, RAG/citation sufficiency, model channel and guardrail/fallback.
9. [x] Add no-live smoke/eval coverage:
   - server smoke scenarios for direct writing, project lookup, status query, RAG query and draft-write planning.
   - service-mode isolation checks for Agent routes/tools.
   - UI check for tool trace rendering.
10. [x] Update specs/docs:
    - backend quality guidelines: internal Agent workspace contract.
    - frontend state/diagnostic contract.
    - deployment docs if new server-only env/tool policy appears.

## Validation Commands

Run the relevant set before implementation is considered complete:

```powershell
npm.cmd run prisma:validate
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run assistant:rag-smoke
npm.cmd run assistant:eval
npm.cmd run studio:smoke
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
git diff --check
```

If no schema changes occur, `prisma:validate` still runs as a cheap safety check. No live model/provider/embedding/reranker/production health checks are allowed in this task unless the user gives a real approved task.

## Sensitive Scan

Before commit, scan changed files for:

- API keys and `sk-`-style tokens;
- bearer tokens and invite codes;
- database URLs;
- model/RAG/Qdrant/Supabase/embedding provider endpoints;
- raw tool payload dumps;
- prompts or provider responses;
- member private chat content beyond synthetic smoke examples.

## Risk Points

- Tool traces can accidentally become debug dumps. Keep summaries low-sensitive.
- Model-driven tool planning can be non-deterministic. Tests must use deterministic mock planner and strict schema validation.
- Draft-write tools must not become publish/deploy/admin mutation tools.
- Internal-scope citations must never leak into public route or public assistant bundle.
- Existing session history must continue to load older messages whose meta lacks Agent fields.

## Rollback Points

- Keep `generateAnswer()` and `retrieveAssistantContext()` intact as lower-level helpers.
- Keep old public assistant path untouched.
- If Agent route fails validation, revert only `/chat/internal` orchestration integration while keeping typed tool modules if they are independently safe.
