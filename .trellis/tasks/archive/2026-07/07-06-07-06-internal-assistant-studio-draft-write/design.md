# Internal Assistant Controlled Studio Draft Write Design

## Architecture

This task extends the existing Agentic Workflow Runtime. The route remains:

```text
POST /chat/internal
  -> read member/session through assistant DB
  -> runInternalAgent()
       -> planner selects studio.draft
       -> agentTools executes Studio draft write through Studio DB boundary
       -> returns safe trace + draft artifact
  -> persist assistant message/meta in assistant DB
```

Key design decision: **the browser never sends a Studio token for Agent draft writes**. The Agent is a server-side internal route behind member auth, and `studio.draft` uses `getStudioPrisma()` / `requireStudioDatabase()` internally. This keeps `STUDIO_ADMIN_TOKEN` out of `/assistant` and prevents frontend token mixing.

## Module Boundaries

- `server/src/agentTools.ts`
  - owns `studio.draft` execution.
  - imports Studio DB helper and draft payload helpers.
  - returns safe artifact summaries only.
- `server/src/agentTypes.ts`
  - extends tool payload/trace with optional safe artifacts.
- `server/src/types.ts`
  - extends `AgentToolTrace` with optional `artifacts`.
- `server/src/app.ts`
  - sanitizes persisted tool artifacts.
- `src/data/assistant.ts`
  - normalizes safe tool artifacts from `unknown`.
- `src/pages/AssistantPage.tsx`
  - renders artifact summaries in the Agent tool trace.

No Prisma schema change is needed. `ContentDraft` already has all required fields.

## Draft Payload Contract

Created Studio drafts use:

```ts
{
  slug: string
  title: string
  column: 'knowledge' | 'project-notes' | 'resources' | 'ai-daily' | 'build-log'
  tag: string
  detail: string
  readTime: string
  bodyJson: StudioContentBody
  knowledgePoints: string[]
  projectIds: string[]
  status: 'REVIEW_NEEDED'
  visibility: 'HIDDEN'
  aiAssistance: 'agentic-workspace'
  createdBy: `assistant:${member.id}`
  updatedBy: `assistant:${member.id}`
}
```

Safe artifact returned in `ChatResponse.meta.tools[].artifacts[]`:

```ts
{
  kind: 'studio-draft'
  id: string
  slug: string
  title: string
  column: string
  status: 'review-needed'
  visibility: 'hidden'
  reviewRequired: true
  href: '/studio'
}
```

The artifact must not include body text, admin tokens, database role, DB URL, local paths, review checklist internals, or raw Prisma payload.

## Draft Classification

Initial deterministic classification is enough:

- includes `日报` / `ai daily` -> `ai-daily`
- includes `状态` / `可靠性` / `监控` -> `build-log`
- includes `资源` / `分享` / URL-ish resource wording -> `resources`
- includes `项目` / known project alias -> `project-notes`
- otherwise -> `knowledge`

Project inference can reuse public knowledge/project ids when available. If a known project cannot be confidently inferred, the draft still creates with empty `projectIds`.

## Body Generation

Use existing authoring shape from `src/utils/studioDraftBody.ts` as the conceptual template, but avoid importing frontend modules into server if that creates TS rootDir/build issues. If direct import is not compatible with `server/tsconfig.json`, implement a narrow server-side equivalent in `server/src/agentTools.ts` or `server/src/studioDraftBuilder.ts` for only the block types needed:

- heading
- paragraph
- list
- flow

Do not import React/page modules from server.

## Collision Handling

Draft slug is generated from column + compact topic + current date. If create fails with Prisma `P2002`, retry with a bounded suffix:

```text
<slug>
<slug>-2
<slug>-3
```

After bounded retries, degrade to plan-only and return a safe `tool_error` summary.

## Degraded Modes

- Studio DB not configured -> return plan-only context and trace summary `Studio database not configured; draft plan only`.
- Sensitive content detected -> do not write draft; return policy summary.
- Duplicate slug exhaustion -> return plan-only summary.
- Unexpected Prisma error -> tool trace `failed/tool_error`; `/chat/internal` still returns a degraded answer when possible.

## Frontend Rendering

`/assistant` tool trace should show:

- tool label + permission + status;
- artifact line for created draft;
- draft title, column, status, visibility;
- link target to `/studio` only, not a token-bearing API URL.

Do not render raw `bodyJson`, raw draft payload, Prisma record, or API response.

## Compatibility

- Older messages with no artifacts remain valid.
- Existing Studio page behavior and admin token flow remain unchanged.
- Existing Studio API routes remain unchanged.
- Service modes remain:
  - internal mode may create drafts through server-side DB helper when Studio DB is configured.
  - public/rag/studio modes do not expose `/chat/internal`.

## Rollback

If draft creation causes issues, `studio.draft` can be reverted to plan-only behavior in `server/src/agentTools.ts` without touching `runInternalAgent()` or frontend normalizers. Existing created drafts remain normal Studio drafts and can be archived through Studio.
