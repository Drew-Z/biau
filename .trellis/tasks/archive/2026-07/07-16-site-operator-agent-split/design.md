# Design: Site Operator and Team Agent Split

## Product Boundaries

| Product | Primary user | Runtime | Owned data | Allowed integration |
|---|---|---|---|---|
| BIAU Site Operator | Site owner | Existing LangGraph.js runtime in `blog-semi` | owner sessions, owner memories, operator traces, Studio draft references | Studio, scoped RAG, status snapshots, repository-derived public-safe knowledge |
| Chatus Team Agent | Invited teammates | Cloudflare Worker + Durable Objects/KV | teammate sessions, memories, quotas, routes, Skills, tools, MCP config | optional read-only BIAU MCP in a later reviewed slice |
| Duoduo Learn | App user | Flutter local-first Agent runtime | learning sources, plans, checkpoints, mastery, exercises, local model settings | explicit future API/contracts only |

The products do not share authentication, databases, cookies, private memories, provider credentials, or deployment state.

## Target BIAU Runtime

The current Agent graph remains the foundation, but its tool catalog becomes site-operator specific:

- `site.inspect`: inspect route, navigation, metadata, curation, and public-content facts.
- `project.inspect`: inspect project evidence, status, links, screenshots, and known gates.
- `content.audit`: evaluate Studio/blog drafts for evidence, duplication, safety, and publication readiness.
- `layout.review`: produce structured UI/layout findings and a proposed implementation slice.
- `status.inspect`: read low-sensitive synthetic and service-health summaries.
- `knowledge.search`: retrieve scoped public/operator knowledge.
- `memory.search` / `memory.write`: owner-only durable preferences and workflow memory.
- `studio.draft`: create only `hidden + review-needed` artifacts.

Git writes, publication, deployment, cloud mutation, credential operations, and arbitrary external tools remain unavailable from normal chat. Future write tools require a separate explicit approval design.

## Owner Surface

- `/operator` is the owner workspace for conversations, plans, tool traces, sources, review artifacts, and pending manual gates.
- `/operator/settings` contains owner-safe settings, memory controls, service diagnostics, and integration readiness. It must not expose reusable service credentials.
- `/api/operator/*` is the only browser-facing private API contract. It is served through the same-origin Cloudflare facade.
- The old private `/assistant` and `/assistant/admin` routes are deleted rather than retained as compatibility surfaces.
- The public assistant widget and its public-safe API remain independent. Any current link labelled as an internal entry is changed to the protected Operator route or removed when it would disclose a private surface unnecessarily.

## Authentication Boundary

The confirmed final design is a same-origin owner surface protected by Cloudflare Access, with a Cloudflare Function/Worker facade calling the Render Site Operator API through a server-held service credential. The browser does not store a reusable Render administrator token, and the Render API rejects direct unauthenticated owner calls.

The facade validates the Access identity supplied by Cloudflare, applies an owner allow policy, strips untrusted identity/service headers from the browser request, and injects its own server-held service credential when forwarding to Render. The Render service validates only the service credential and the sanitized owner identity contract expected from the facade.

Local development uses an explicit local-only owner mode with placeholder credentials and deterministic fixtures. Production must not fall back to the old invitation/member-token path when Access headers are missing.

## Storage Migration

- Preserve only records explicitly identified as the current site owner's `ACTIVE` long-term operator memory.
- Do not migrate ordinary chats, invitations, teammate records, member model channels, teammate usage data, or ambiguous member-scoped records into the owner Agent.
- Stop creating invitations, teammate members, teammate channel assignments, and teammate usage records from the Site Operator UI.
- Replace member-scoped runtime inputs with an owner principal before deleting obsolete schema.
- Keep Studio on its dedicated database and RAG on Qdrant; neither moves into the owner database.
- Perform destructive schema cleanup only after the owner flow and memory migration are verified.

## Chatus Integration

Chatus remains provider-neutral and owns team identity, routing, Skills, tools, remote MCP, quotas, conversations, and memory. A future BIAU MCP server may expose only public project/status/content lookup. Chatus must apply its existing tool allow-list, confirmation, SSRF, timeout, size, and redaction policies.

Active route health calls must become opt-in. The default health view should use configuration readiness, recent real-task success/failure metadata, and infrastructure health without sending synthetic model prompts.

No Chatus source change belongs to this task. Productization and the active-liveness policy correction are owned by `D:\workspace4Cursor\chatus\.trellis\tasks\07-16-team-agent-productization` under the Chatus repository's own Trellis workflow.

## Learn Integration

This task reads Learn only to establish its product boundary. The BIAU catalog can later add a WIP project record with evidence from a stable commit, screenshots, deterministic Flutter tests, and a separate APK release gate. No current dirty files are modified or presented as released functionality.

Because Learn is being developed concurrently, even read-only verification must avoid commands that generate Flutter registrants, lockfiles, build outputs, formatting changes, or snapshots. Public catalog integration waits for a stable user-approved evidence point.

## Migration And Rollback

1. Add the Access-authenticated owner principal, same-origin facade, and `/operator` UI/runtime contract while the old service remains deployable for rollback only.
2. Verify owner authentication, Agent tools, memory, RAG, and Studio draft-write.
3. Remove teammate UI/routes and stop old data writes.
4. Migrate the explicitly identified owner `ACTIVE` memories and archive obsolete member/invite records.
5. Remove the old private `/assistant` surfaces and rename deployment/docs only after the new route is live.

Rollback keeps the previous Render revision and database snapshot available until the owner workflow is accepted. No destructive migration runs before the replacement flow passes deterministic and production low-sensitive checks.
