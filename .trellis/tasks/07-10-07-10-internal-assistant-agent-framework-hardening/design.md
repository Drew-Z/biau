# Internal Assistant Agent Framework Hardening Design

## Architecture Boundary

The current internal assistant framework boundary stays unchanged:

- HTTP/auth/session/persistence: `server/src/app.ts`
- public runtime entry: `server/src/agentOrchestrator.ts`
- formal orchestration: `server/src/agentGraph.ts`
- planning adapter: `server/src/agentPlanner.ts`
- typed tools: `server/src/agentTools.ts`
- trace and policy sanitization: `server/src/agentGuardrails.ts`
- frontend-safe metadata: `src/data/assistant.ts`

This task does not replace LangGraph, introduce another agent SDK, or change production deployment topology. The first slice adds a local executable contract check around the existing framework.

## First Slice Design: Agent Framework Contract Check

Add a deterministic script:

```text
server/scripts/agent-framework-contract.ts
```

Expose it through:

```json
"assistant:agent-contract": "tsx server/scripts/agent-framework-contract.ts"
```

The script should import the existing runtime and assert invariants directly. It should not start the Express server unless a later slice needs HTTP route assertions.

## Contract Assertions

The first script should verify:

1. Graph identity:
   - `AGENT_GRAPH_STEPS` equals the expected LangGraph node sequence:
     `input_guard -> plan -> validate_plan -> execute_tools -> compose_answer -> self_check -> persist_trace`.
   - `runInternalAgent()` returns `meta.agent.mode === "agentic-workspace"`.
2. Tool routing:
   - A status/project question with `plannerMode: "mock"` includes `status.query` and `project.lookup`.
   - A draft/project question with `studioDraftMode: "plan-only"` includes `studio.draft` with `draft-write`.
   - A sensitive-input question returns a guarded/policy-safe response and no raw sensitive text.
3. Tool/permission policy:
   - normal chat allows `read` and `draft-write`;
   - unsupported or admin/external permissions remain blocked or filtered by existing guardrails.
4. Artifact safety:
   - safe Studio draft artifacts keep `/studio?draft=<id>` links;
   - mismatched, external, public, approved, or non-draft artifacts are dropped.
5. Metadata safety:
   - serialized `meta`, tool traces, artifacts, and guardrails do not contain secret-like keys, provider endpoints, database URLs, bearer tokens, raw prompts, raw chunks, stack traces, or private dashboard URLs.

## Test Doubles

Use local stubs only:

- `mockAgentPrisma` with:
  - `internalKnowledgeDocument.findMany()`
  - `chatMessage.findMany()`
- `plannerMode: "mock"` for all runtime calls.
- `studioDraftMode: "plan-only"` for draft tests.
- no `.env` reads beyond normal module initialization.
- no real model calls, no live RAG Orchestrator calls, no cloud calls.

The script may reuse helpers already covered by `server:smoke`, such as `buildAgentStudioDraft()`, `buildStudioDraftArtifact()`, and `sanitizeToolTrace()`, but it should focus on framework invariants rather than broad API smoke.

## Failure Output

Use a small local `assert()` helper with clear messages:

```ts
assert(condition, "agent graph should expose the expected LangGraph node sequence")
```

Do not log full meta payloads on failure. If a metadata leak is detected, log only the forbidden token class or field name, not the leaked value.

## Integration With Existing Checks

Initial integration:

- Add the script to `package.json` as `assistant:agent-contract`.
- Run it manually in this task.

Possible later integration:

- Add it to `scripts/verify.mjs` near `assistant:meta-check` once runtime is stable enough and runtime cost is low.

This later integration can be a separate small slice if the first script reveals drift.

## Rollback

The slice is low risk:

- remove `server/scripts/agent-framework-contract.ts`;
- remove `assistant:agent-contract` from `package.json`;
- no database migration, route change, UI change, or public content change is required.
