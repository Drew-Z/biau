# Internal RAG Sync And Studio AI Daily Closure Design

## Scope

This task connects four already-built pieces:

- Internal Assistant API: member/admin UI, internal knowledge management, Studio draft-write.
- RAG Orchestrator: Qdrant-backed public/internal retrieval and sync contracts.
- Content Studio: token-gated draft, issue, review, and export workflows.
- AI Daily: source pack, issue detail, draft creation, and publish-export gate.

The task should not introduce a new database, new model provider, new auth system, or new observability platform.

## Current Evidence

- Main site and public assistant health endpoints return low-sensitive `ok=true`.
- Internal assistant health returns `database=true` and `modelConfigured=true`.
- RAG Orchestrator health returns public collection data, but internal collection currently reports `pointCount=0` and `vectorReady=false`.
- Studio API is protected; unauthenticated health returns `missing-studio-token`.
- Project status data already distinguishes online entry checks from gated functional checks.

## Boundaries

- Browser/admin-token actions remain human-owned. The agent can describe exact clicks and expected results but should not receive or print tokens.
- Production env values remain platform-owned. The agent can name variable keys and responsibility, not values.
- Model calls are avoided unless the user approves a real content task.
- Public status must reflect evidence only.

## Implementation Shape

1. Recheck local and public-safe production state.
2. Inspect existing admin/studio code for gaps in internal sync status, Studio health explanations, or AI Daily issue acceptance guidance.
3. Implement the smallest improvement that reduces user confusion, such as:
   - clearer diagnostics for internal collection empty state,
   - clearer Studio token/health instructions,
   - a local check documenting expected internal sync status,
   - status/manual-gate wording updates.
4. Run targeted checks.
5. Provide a manual runbook for the remaining browser/platform steps.

## Rollback

Most expected edits are docs/UI/checks. Revert the specific commit or touched files if the wording or affordance is wrong. No schema or production data migration should be introduced without a separate task.
