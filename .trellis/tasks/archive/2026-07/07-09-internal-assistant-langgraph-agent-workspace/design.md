# Internal Assistant LangGraph Agent Workspace Design

## Architecture

Target shape:

```text
POST /chat/internal
  -> auth/session/member guard
  -> runInternalAgent()
    -> LangGraph compiled graph
      -> input_guard
      -> plan
      -> validate_plan
      -> execute_tools
      -> compose_answer
      -> self_check
      -> persist_trace
  -> ChatResponse { answer, citations, meta }
```

The route remains responsible for HTTP concerns: auth, database availability, member/session ownership, message persistence, response status codes. The Agent graph owns planning, tool selection, tool execution, answer composition, guardrails, trace normalization, and safe metadata.

## Module Boundaries

Recommended files:

- `server/src/agentGraph.ts`
  - LangGraph state definition
  - graph nodes
  - graph compilation
  - graph runner adapter
- `server/src/agentPlanner.ts`
  - model planner parser
  - deterministic fallback planner
  - tool id validation helpers
- `server/src/agentOrchestrator.ts`
  - thin compatibility export for `runInternalAgent()` only
  - calls graph runner and returns `InternalAgentRunResult`
- `server/src/agentTools.ts`
  - remains the typed tool registry and executor owner
- `server/src/agentGuardrails.ts`
  - remains permission and sanitization owner
- `server/src/types.ts`
  - add graph/node trace types only if needed for frontend-safe metadata

## Agent State Contract

The graph state should be a typed object with reducer-friendly fields:

```ts
interface AgentGraphState {
  question: string
  member: InternalAgentMemberContext
  sessionId: string
  plannerMode: 'auto' | 'mock'
  studioDraftMode: 'auto' | 'plan-only'
  plan?: InternalAgentPlan
  selectedToolIds: AgentToolId[]
  toolResults: AgentToolExecutionResult[]
  citations: Citation[]
  chunks: RagChunkCitation[]
  contextBlocks: string[]
  generated?: GeneratedAnswer
  guardrails?: AgentGuardrailSummary
  answer?: string
  meta?: InternalAgentRunResult['meta']
}
```

State reducers should append tool results and traces instead of replacing opaque raw payloads. Raw provider responses, prompts, endpoints, secrets, database URLs, and private document bodies are never graph state fields.

## Graph Nodes

### `input_guard`

- Normalizes question.
- Checks empty/sensitive-only requests.
- Seeds default planner mode and draft mode.
- Can short-circuit with a policy-safe response for obvious secret requests.

### `plan`

- Calls model planner when allowed and configured.
- Falls back to deterministic planner when model is unavailable, invalid, or `plannerMode === "mock"`.
- Produces `InternalAgentPlan` with `toolIds`, `intent`, `grounding`, `planner`, and optional fallback reason.

### `validate_plan`

- Applies permission policy through `canUsePermission()`.
- Drops unknown tools.
- Ensures at least `answer.direct` or `knowledge.search` remains.
- Blocks `admin-write` and `external-live` in normal chat.

### `execute_tools`

- Runs selected tools through `executeAgentTool()`.
- Maximum first version: 4 tools per run, matching current behavior.
- Dedupes citations/chunks after execution.
- Preserves safe tool trace summaries only.

### `compose_answer`

- Calls `generateAnswer(question, citations, "internal", ...)`.
- Uses context-backed fallback when model answer is unavailable but tool context is safe.
- Keeps member-specific model channel routing.

### `self_check`

- Calls `summarizeGuardrails()`.
- Blocks sensitive answer output.
- Computes final agent status from guardrails, tool statuses, and model fallback.

### `persist_trace`

- Produces the final sanitized `meta`.
- In first implementation, persistence can continue through existing `ChatMessage.meta`.
- Optional future migration can add `AgentRun` / `AgentStep` tables for richer replay.

## Data Flow

```text
User question
  -> Internal chat route
  -> AgentGraphState
  -> planner result
  -> tool registry
  -> citations/chunks/context blocks
  -> answer composer
  -> guardrails/self-check
  -> sanitized ChatResponse.meta
  -> /assistant diagnostics panel
```

## Compatibility And Migration

Because the current internal assistant is not yet a production-stable public contract, internal implementation compatibility is not required. Keep only public contracts that other code depends on:

- `runInternalAgent(input): Promise<InternalAgentRunResult>`
- `ChatResponse { answer, citations, meta }`
- frontend normalizers in `src/data/assistant.ts`
- service-mode isolation

Breaking changes allowed:

- Remove or rewrite old sequential node constants.
- Move planner logic out of `server/src/model.ts` if it simplifies graph architecture.
- Change internal `AgentRunMeta.steps` from hard-coded workflow steps to graph node summaries, as long as frontend normalization remains safe.
- LangGraph node names cannot also be state channel names. The public graph node should stay `plan`, while the internal state channel uses a non-conflicting implementation name such as `agentPlan`.

## UI Design

Existing `/assistant` diagnostics should evolve from generic answer metadata into an open-source Agent inspector:

- "Graph Runtime": LangGraph / deterministic planner / model planner
- "Execution": nodes completed, tool count, duration
- "Tools": id, label, permission, status, item/citation count, short summary
- "Retrieval": source, store, sufficiency, candidate/citation count
- "Guardrails": passed/warned/blocked, blocked permissions, issues
- "Artifacts": Studio draft card, same-site link only

Keep the current low-sensitive display discipline: no raw JSON dumps, no endpoints, no keys, no prompts.

## Trade-Offs

- LangGraph adds dependency and graph concepts, but gives clearer maintainable architecture and future extension.
- Keeping existing tools reduces risk and lets the task focus on orchestration instead of rebuilding business features.
- Avoiding compatibility with old internal runtime speeds implementation, but tests must prove the public API and UI still work.
- Not adding LangSmith in the first slice keeps secrets/platform setup out of the repo; tracing can be documented as a manual follow-up.

## References

- LangGraph JS official docs: `https://docs.langchain.com/oss/javascript/langgraph/overview`
- LangGraph repository: `https://github.com/langchain-ai/langgraph`
- OpenAI Agents SDK docs: `https://developers.openai.com/api/docs/guides/agents`
- Mastra docs: `https://mastra.ai/`
