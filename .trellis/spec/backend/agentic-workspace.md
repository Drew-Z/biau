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
- Tool traces may include safe artifacts such as `{ kind: "studio-draft", id, slug, title, column, status: "review-needed", visibility: "hidden", reviewRequired: true, href: "/studio" }`. They must not include draft body text, Prisma payloads, review checklist internals, admin tokens, database roles, or API URLs.
- Tool traces and metadata must not contain API keys, base URLs, database URLs, sync tokens, bearer tokens, invite codes, raw prompts, raw provider responses, raw retrieved document bodies, stack traces, or private dashboards.
- Model-driven planning may be used for real internal chat when a member model channel is configured. Smoke/eval tests must use `plannerMode: "mock"` or local deterministic paths and must not probe real providers.

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
