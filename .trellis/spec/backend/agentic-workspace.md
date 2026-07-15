# BIAU Operator Agentic Workspace Runtime

## Scenario: Owner-Only Operator Runtime

### 1. Scope / Trigger

- Trigger: changing `/operator/*`, `server/src/agent*.ts`, Operator prompts, tools, answer metadata, owner memory, private knowledge, Studio draft-write, `/operator`, or `/operator/settings`.
- Goal: preserve a formal LangGraph Agent workspace with deterministic permissions, owner isolation, scoped retrieval, and review-gated writes.

### 2. Signatures

- API: `POST /operator/chat`.
- Runtime entry: `runOperatorAgent()`.
- Principal: `OperatorPrincipal` with stable owner id, verified email/name, role `OWNER`, and optional server-selected model channel.
- UI: `/operator` and `/operator/settings`.
- Browser facade: `/api/operator/*`.

### 3. Contracts

- Render requests require `Authorization: Bearer <OPERATOR_SERVICE_TOKEN>` plus sanitized owner identity headers injected by the trusted facade.
- Browser-provided authorization or owner headers are never trusted or forwarded.
- `OperatorSession`, `OperatorMessage`, `OperatorMemory`, and `OperatorUsageLog` queries always include `ownerId`.
- The route calls `runOperatorAgent()`; route handlers must not recreate planner logic.
- Normal runs permit only `read` and `draft-write` tools.
- `studio.draft` creates only `hidden + review-needed` artifacts.
- Publishing, deployment, Git mutation, cloud mutation, credential operations, arbitrary HTTP/shell/MCP, and live diagnostics are unavailable.
- Tool traces and persisted metadata contain only sanitized summaries, duration, status, permission, citation counts, safe model channel fields, and safe artifact links.

### 4. Error Matrix

- Missing/mismatched service token -> `401 operator-service-auth-required`.
- Missing sanitized identity -> `403 operator-identity-required`.
- Email outside owner allow-list -> `403 operator-identity-not-allowed`.
- Missing database -> `503 database-not-configured` for persistence routes.
- Cross-owner session/memory -> `404`, never leak existence.
- Sensitive or forbidden action -> guarded Agent result with no write.

### 5. Good/Base/Bad

- Good: a content audit uses read tools and returns evidence plus a proposed implementation slice.
- Good: an explicit draft request creates a Studio artifact with `reviewRequired=true`.
- Base: no model provider; deterministic tools and fallback composition still return a concise degraded result.
- Bad: an Operator route accepts an email from request JSON or browser-controlled headers.
- Bad: a trace stores raw private documents, provider URLs, prompts, tokens, stack traces, or database values.
- Bad: the Agent registers a publish/deploy/Git/cloud tool without a separate approval design.

## Scenario: LangGraph Orchestration

### Contracts

- The compiled graph owns the main path: input guard -> plan -> validate -> execute tools -> compose -> self-check -> persist trace.
- Graph nodes use the typed tool registry; they do not query project/status/RAG/Studio data directly.
- Planner output is validated against tool ids, permission, step count, and argument schemas before execution.
- Model planning is optional. Deterministic planning remains available for tests and fallback.
- Grounding is task-dependent: `strict`, `background`, or `none`; retrieval is not forced for every prompt.
- `AgentRunMeta.steps` uses stable node ids and sanitized summaries so frontend replay is deterministic.

### Required Tests

```powershell
npm.cmd run assistant:agent-contract
npm.cmd run assistant:agent-eval
npm.cmd run assistant:meta-check
npm.cmd run assistant:service-modes-smoke
npm.cmd run server:smoke
```

Tests use mock planners/providers or local fallback. Do not send live model prompts.

## Scenario: Owner Durable Memory

### Contracts

- Memory writes require explicit user intent; no silent preference extraction.
- `OperatorMemory.ownerId` is always derived from the authenticated principal.
- `contentHash` deduplicates one owner's memory; it is never returned to the browser.
- Sensitive content, credentials, private endpoints, tokens, and raw provider payloads are rejected.
- API serializers omit internal ownership/hash/source fields.
- Archive/restore accepts only `{ archived: boolean }` and is owner-scoped.

### Migration

- Old records are migration sources only.
- `operator:memory-migration:check` produces a redacted candidate report.
- `operator:memory-migration:apply` accepts only user-approved record ids.
- Ordinary chats, invites, members, model assignments, usage records, ambiguous records, and non-`ACTIVE` memory do not migrate.

## Scenario: Scoped RAG And Qdrant Reconciliation

### Contracts

- Public assistant uses public key/scope; Operator uses private `internal` key/scope.
- The `internal` scope name is a retrieval boundary, not a member-product contract.
- Sync and retrieve responses expose low-sensitive counts/status only.
- Point ids and source checksums must be deterministic so stale Qdrant points can be deleted after a successful replacement sync.
- Cleanup never runs before replacement points are accepted.
- Public retrieval must never return private-scope citations.

### Required Tests

```powershell
npm.cmd run assistant:rag-smoke
npm.cmd run assistant:rag-sync-local
npm.cmd run assistant:eval
```

## Verification

After Operator cross-layer changes:

```powershell
npm.cmd run operator:facade-smoke
npm.cmd run operator:knowledge-check
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
git diff --check
```

Sensitive-scan changed files for real tokens, database URLs, model/vector endpoints, Access values, private content, and local absolute paths.
