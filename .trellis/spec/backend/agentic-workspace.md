# Internal Assistant Agentic Workspace Runtime

## Scenario: Internal Assistant Agentic Workspace Runtime

### 1. Scope / Trigger

- Trigger: changing `POST /chat/internal`, `server/src/agent*.ts`, internal assistant answer metadata, tool selection, internal RAG/status/project/knowledge/Studio/memory tools, or `/assistant` answer diagnostics.
- Goal: keep the internal assistant as an Agentic Workflow Runtime instead of regressing to hard-coded keyword routing or naive retrieve-then-generate RAG.

### 2. Signatures

- API: `POST /chat/internal`
- Backend modules:
  - `server/src/agentTypes.ts`
  - `server/src/agentTools.ts`
  - `server/src/agentGuardrails.ts`
  - `server/src/agentOrchestrator.ts`
- Runtime entry:
  - `runInternalAgent({ question, member, sessionId, prisma, plannerMode? })`
- Required typed tools:
  - `rag.retrieve`
  - `status.query`
  - `project.lookup`
  - `knowledge.search`
  - `studio.draft`
  - `memory.search`
  - `memory.write`
  - `answer.direct`

### 3. Contracts

- `/chat/internal` remains member-token protected and must resolve sessions by `{ id: sessionId, memberId: member.id }`.
- The route must call `runInternalAgent()` for the main answer path; it must not directly call `planAssistantAnswer()` as the internal route-level planner.
- `generateAnswer()` remains the model composer/fallback helper and may still use its local answer plan as a low-level default.
- Normal chat permits only `read` and `draft-write` tools.
- `draft-write` may create or plan review-required drafts only. `studio.draft` may create `ContentDraft` rows through `getStudioPrisma()` only when the user explicitly asks for draft-like work, and created drafts must stay `REVIEW_NEEDED`, `HIDDEN`, and `aiAssistance: "agentic-workspace"`. It must not publish public content, deploy, mutate admin/member/channel/invite settings, or run external live diagnostics.
- `admin-write` and `external-live` tools are forbidden from normal chat unless a separate UI/action and review gate is implemented.
- `ChatMessage.meta` may store only sanitized Agent summaries:
  - `agent`
  - `tools`
  - `guardrails`
  - `retrieval`
  - `modelChannel`
  - `citationCount`
  - `intent`
  - `grounding`
  - `fallbackReason`
- Tool traces may contain ids, labels, permission class, status, duration, counts, short summaries, and coarse error classes only.
- Tool trace summaries that contain secret-like shapes must be replaced with a safe redaction message instead of being truncated and persisted.
- Tool traces may include safe artifacts such as `{ kind: "studio-draft", id, slug, title, column, status: "review-needed", visibility: "hidden", reviewRequired: true, href: "/studio?draft=<id>" }`. Legacy persisted artifacts may keep `href: "/studio"`, but new created-draft artifacts should deep-link by draft id. Artifact links must stay same-site Studio routes and must not include draft body text, Prisma payloads, review checklist internals, admin tokens, database roles, API URLs, or bearer tokens.
- Tool traces and metadata must not contain API keys, base URLs, database URLs, sync tokens, bearer tokens, invite codes, raw prompts, raw provider responses, raw retrieved document bodies, stack traces, or private dashboards.
- Model-driven planning may be used for real internal chat when a member model channel is configured. Smoke/eval tests must use `plannerMode: "mock"` or local deterministic paths and must not probe real providers.
- `memory.write` remains `draft-write` and may persist only an explicitly requested, low-sensitive member memory. The planner and tool executor must both apply the shared consent/candidate helper; normal questions and memory queries must never create memory rows.
- `memory.search` may read only the current member's ACTIVE durable memories plus the current session's bounded message summary. Durable memory content must not be copied into tool traces or `ChatMessage.meta`.

### 4. Validation & Error Matrix

- Missing bearer token -> `401 { error: "missing-or-invalid-token" }`.
- Disabled member -> `403 { error: "member-disabled" }`.
- Missing database with bearer token -> `503 { error: "database-not-configured" }`.
- Unknown or cross-member session -> `404 { error: "session-not-found" }`.
- Model planner unavailable, invalid, or unconfigured -> deterministic mock planner, safe `agent.planner: "mock"`, no raw planner error.
- Tool throws -> tool trace `status: "failed"` with `errorClass: "tool_error"`; route still returns a degraded answer when possible.
- Forbidden permission -> tool trace `status: "blocked"` with `errorClass: "policy_blocked"`; normal chat must not perform the action.
- Sensitive answer output -> guardrail blocks final text and returns a policy-safe message with `reason: "policy_blocked"`.
- No citations for grounded factual answer -> `guardrails.citationSufficiency: "none"` and status may be `warned` or `degraded`; do not invent facts.

### 5. Good/Base/Bad Cases

- Good: status question selects `status.query` plus project/RAG tools, returns public status summaries and safe trace metadata.
- Good: project draft request selects `studio.draft` with `permission: "draft-write"` and produces a review-required plan, not a publish action.
- Good: internal knowledge search returns internal document titles/summaries as `visibility: "internal"` citations without raw private bodies.
- Base: no configured model provider; tools still produce a concise degraded summary and the response records fallback metadata.
- Base: older messages with no Agent metadata still serialize as `meta: null` and load in `/assistant`.
- Bad: `/chat/internal` reintroduces route-level keyword branching and bypasses `runInternalAgent()`.
- Bad: a tool trace stores raw RAG chunks, provider endpoint URLs, request bodies, stack traces, or environment variable values.
- Bad: normal chat publishes a Studio draft, changes member model channels, creates invites, or runs a production model/API diagnostic.

### 6. Tests Required

- `npm.cmd run server:build` after changing Agent runtime modules or `ChatResponse.meta`.
- `npm.cmd run assistant:agent-contract` after changing LangGraph steps, Agent tool permissions, guardrails, Studio draft artifacts, or trace sanitization.
- `npm.cmd run assistant:agent-eval` after changing planner heuristics, tool routing, Agent tool outputs, local eval fixtures, Studio draft plan-only behavior, or internal knowledge/memory tool behavior.
- `npm.cmd run server:smoke` must assert mock planner tool selection and protected internal chat behavior.
- `npm.cmd run assistant:service-modes-smoke` must prove public/rag/studio modes do not expose internal Agent routes.
- `npm.cmd run assistant:rag-smoke` after changing `rag.retrieve` or scoped retrieval behavior.
- `npm.cmd run assistant:eval` after changing retrieval, citation, or grounding behavior.
- `npm.cmd run lint` and `npm.cmd run build` after changing frontend normalizers or `/assistant`.
- `npm.cmd run check:ui` after changing the Agent inspector UI.
- Run `git diff --check` and a sensitive scan over changed files before commit.

### 7. Wrong vs Correct

#### Wrong

```ts
const plan = planAssistantAnswer(question, 'internal')
const context = plan.useRetrieval ? await retrieveAssistantContext(question, 'internal') : null
const generated = await generateAnswer(question, context?.citations ?? [], 'internal')
```

This makes the route own intent branching again and turns RAG into the main flow.

#### Correct

```ts
const agentResult = await runInternalAgent({
  question,
  member,
  sessionId: activeSession.id,
  prisma,
})
```

The route owns auth/session/persistence, while the Agent runtime owns planning, typed tools, guardrails, trace sanitization, and composition.

#### Wrong

```ts
trace.raw = { requestBody, providerResponse, chunks }
```

This can persist prompts, private document text, provider payloads, or endpoints in `ChatMessage.meta`.

#### Correct

```ts
trace = {
  id: 'status.query',
  permission: 'read',
  status: 'completed',
  summary: '状态页快照可用：online=5, degraded=0',
  itemCount: 5,
}
```

The trace is actionable for the UI and safe to persist.

## Scenario: LangGraph Internal Agent Orchestration

### 1. Scope / Trigger

- Trigger: adding or changing `server/src/agentGraph.ts`, `server/src/agentPlanner.ts`, `server/src/agentOrchestrator.ts`, Agent graph node names, `AgentRunMeta.steps`, or `/assistant` graph diagnostics.
- Goal: keep the internal assistant implemented as a formal LangGraph state graph while preserving the existing `runInternalAgent()` public contract and sanitized frontend metadata.

### 2. Signatures

- Dependency: `@langchain/langgraph`.
- Runtime entry remains:

```typescript
runInternalAgent(input: InternalAgentRunInput): Promise<InternalAgentRunResult>
```

- Orchestration modules:
  - `server/src/agentGraph.ts`: LangGraph state annotation, graph nodes, graph compilation, graph runner.
  - `server/src/agentPlanner.ts`: model planner adapter, deterministic planner, tool-id validation.
  - `server/src/agentOrchestrator.ts`: thin compatibility wrapper only.
- Graph node ids:
  - `input_guard`
  - `plan`
  - `validate_plan`
  - `execute_tools`
  - `compose_answer`
  - `self_check`
  - `persist_trace`
- Response projection:
  - `ChatResponse.meta.agent.steps: AgentWorkflowStepId[]`.

### 3. Contracts

- `POST /chat/internal` must still call `runInternalAgent()` and must not know LangGraph node internals.
- The compiled LangGraph graph must execute the main answer path; do not reintroduce a route-level keyword planner or a hand-rolled sequential orchestrator in `agentOrchestrator.ts`.
- Graph nodes may call model planning and answer composition helpers, but tool execution must go through `executeAgentTool()`.
- Graph state must not store API keys, model endpoints, database URLs, bearer tokens, invite codes, raw prompts, raw provider responses, raw private document bodies, stack traces, or private dashboards.
- LangGraph node names cannot also be state channel names. If a node is named `plan`, the state channel must use a non-conflicting name such as `agentPlan`.
- `meta.agent.steps` should expose graph node ids, not old sequential workflow labels.
- Frontend decoders may keep legacy step compatibility for historical messages, but new backend responses should emit graph node ids.

### 4. Validation & Error Matrix

- LangGraph node name equals a state channel name -> runtime graph compile error before smoke tests complete.
- Model planner unavailable, invalid, or unconfigured -> deterministic planner result, safe planner metadata, no raw provider diagnostics.
- Forbidden tool permission -> `executeAgentTool()` returns a blocked trace; normal chat does not perform the action.
- Tool failure -> graph continues when possible and returns a degraded answer with low-sensitive trace metadata.
- Sensitive input or output -> graph returns policy-safe fallback text and `guardrails.status` becomes `blocked`.
- Missing final answer/meta due to unexpected graph failure -> wrapper returns a safe fallback `InternalAgentRunResult`.

### 5. Good/Base/Bad Cases

- Good: `agentOrchestrator.ts` imports `runInternalAgentGraph()` and exports only `runInternalAgent()`.
- Good: `/assistant` shows `LangGraph.js`, graph status, planner type, and graph node labels from normalized metadata.
- Good: deterministic smoke tests use `plannerMode: "mock"` and do not call live model providers.
- Base: old persisted messages with legacy steps still normalize safely in the frontend.
- Bad: graph node functions query project/status/RAG data directly instead of using the typed tool registry.
- Bad: `ChatMessage.meta` stores LangGraph raw state, raw tool payloads, prompts, chunks, endpoints, stack traces, or provider responses.

### 6. Tests Required

- Run `npm.cmd run server:build` after changing graph modules or Agent types.
- Run `npm.cmd run assistant:agent-contract` after changing graph node order, `runInternalAgent()`, tool trace fields, guardrails, or Studio draft artifacts.
- Run `npm.cmd run assistant:agent-eval` after changing deterministic planner cases, tool-routing heuristics, local Agent fixtures, or productized Agent capabilities.
- Run `npm.cmd run server:smoke` to prove `runInternalAgent()` and protected route behavior still work.
- Run `npm.cmd run assistant:service-modes-smoke` after changing service route boundaries or imports.
- Run `npm.cmd run assistant:meta-check` after changing `AgentRunMeta.steps`, tool trace fields, artifacts, or frontend normalizers.
- Run `npm.cmd run assistant:rag-smoke` after changing `rag.retrieve` execution or retrieval metadata.
- Run `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:ui` after changing `/assistant` diagnostics.

### 7. Wrong vs Correct

#### Wrong

```typescript
const GraphState = Annotation.Root({
  plan: Annotation<InternalAgentPlan | undefined>,
})

new StateGraph(GraphState).addNode('plan', planNode)
```

LangGraph rejects this because `plan` is both a state channel and a node name.

#### Correct

```typescript
const GraphState = Annotation.Root({
  agentPlan: Annotation<InternalAgentPlan | undefined>,
})

new StateGraph(GraphState).addNode('plan', planNode)
```

The public graph node remains `plan`, while the internal state channel avoids the reserved name collision.

## Scenario: Member Durable Memory

### 1. Scope / Trigger

- Trigger: changing `AgentMemory`, `/chat/internal/memories`, `server/src/agentMemory.ts`, `memory.search`, `memory.write`, memory planner heuristics, or `/assistant` memory management.
- Goal: provide useful member-level memory without silent writes, cross-member access, sensitive persistence, or raw memory content in Agent traces.

### 2. Signatures

- Candidate owner: `buildAgentMemoryCandidate(question)` in `server/src/agentMemory.ts`.
- Intent check: `hasExplicitMemoryWriteIntent(question)`.
- Member API: `GET /chat/internal/memories?includeArchived=true` and `PATCH /chat/internal/memories/:id` with `{ archived: boolean }`.
- Tool ids remain `memory.search` and `memory.write`.

### 3. Contracts

- A durable write requires an explicit future-facing save instruction such as `请记住...`; ordinary chat and query-only phrases such as `你还记得吗` cannot write.
- Planner selection is not authorization. `memory.write` must rebuild and validate the candidate immediately before persistence.
- Memory rows are scoped by `memberId`; route ownership checks use `{ id, memberId }` and cross-member ids return `memory-not-found`.
- Duplicate normalized content for one member reuses the existing row; saving an archived duplicate restores it.
- Sensitive-looking content, empty content, and overlong content do not create rows.
- `memory.search` reads ACTIVE rows for the current member and bounded current-session summaries. It does not accept another member id from the model or browser.
- Tool traces may expose kind, action class, and counts, but not content, content hash, source message text, member id, token, or database metadata.
- Member API serializers omit `memberId`, `sourceMessageId`, and `contentHash`.
- Member UI supports list, refresh, archive, and restore only. It must not add a direct create form that bypasses Agent consent checks.

### 4. Validation & Error Matrix

- Missing token -> `401 missing-or-invalid-token`.
- Disabled member -> `403 member-disabled`.
- Database missing -> `503 database-not-configured`.
- Missing or cross-member memory -> `404 memory-not-found`.
- Missing boolean archive action -> `400 invalid-memory-action`.
- Sensitive memory request -> blocked `memory.write`, no row created.
- Memory endpoint unavailable in an older deployment -> `/assistant` shows a low-sensitive degraded message and chat remains usable.

### 5. Tests Required

- `prisma:validate` and `prisma:generate` after schema changes.
- `assistant:agent-contract` for explicit write, dedupe, restore, query-only, ordinary-chat, sensitive-write, and trace redaction.
- `assistant:agent-eval` for deterministic no-live planner behavior.
- `server:smoke` for auth and missing-database route boundaries.
- `lint`, `build`, and `check:ui` for member memory normalization and responsive UI.
- Production migration and cross-restart persistence remain a documented manual gate.
