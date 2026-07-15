# PRD: Site Operator and Team Agent Split

## Goal

Refocus the current BIAU internal assistant into the owner-only `泊岸站务 / BIAU Operator` for maintaining the website, content, layout, project catalog, reliability data, and Studio drafts. Keep Chatus as the independent teammate-facing web Agent, and keep Duoduo Learn as an independent learning-Agent App.

## Confirmed Facts

- `blog-semi` already has a LangGraph.js Agent runtime, scoped RAG, project/status/knowledge tools, Studio `draft-write`, durable owner/member memory, and a production UI at `/assistant`.
- The same service also carries invitations, members, per-member model channels, usage administration, and internal knowledge management. Those responsibilities came from the previous teammate-assistant scope.
- `chatus` is already an independent Cloudflare Worker product with access-code users, per-user routes and quotas, provider fallback, BYOK, long-term memory, cloud chats, Skills, bounded tool calling, and remote MCP support.
- Chatus production deploys only through GitHub Actions. Its local `main` is currently four commits ahead of `origin/main`; those changes are not assumed to be deployed.
- Chatus currently documents active route health checks using minimal completions and a scheduled cron. This conflicts with the established policy that arbitrary model liveness probes must not be sent.
- `learn/duoduo` is an independent Flutter repository with an extensive learning-Agent runtime, tools, checkpoints, grounded knowledge, tutoring, interview, programming practice, evaluation, and local-first persistence work in progress.
- `learn/duoduo` currently has a large dirty worktree. This task must not rewrite, clean, stage, or revert those changes.

## Requirements

### R1. Owner-only Site Operator

- The BIAU Agent is a private owner tool, not a teammate chat product.
- Its final product name is `泊岸站务` in Chinese and `BIAU Operator` in English.
- Its owner workspace is `/operator`, its settings and diagnostics surface is `/operator/settings`, and its same-origin browser contract is `/api/operator/*`.
- The old private `/assistant` and `/assistant/admin` pages are removed without compatibility redirects. The public assistant widget remains a separate public product surface.
- Its primary jobs are site content auditing, project-page maintenance, blog and AI Daily planning, layout/UI review, SEO and navigation checks, reliability/status inspection, and review-gated Studio draft creation.
- Product naming, route naming, prompts, empty states, admin copy, documentation, and deployment names must stop describing it as a general internal assistant.

### R2. Safe Website Operations

- Normal Agent runs may read site/repository-derived knowledge, inspect low-sensitive status data, plan changes, and create `hidden + review-needed` Studio drafts.
- The Agent must not directly publish content, deploy services, push Git commits, mutate cloud settings, rotate credentials, or bypass human review.
- Any future repository-write or external-action tool must have an explicit review artifact and confirmation boundary before execution.

### R3. Remove Teammate Responsibilities From BIAU

- Invitations, multi-member onboarding, per-member model routing, teammate quotas, and teammate-facing administration move out of the Site Operator product boundary.
- Only memories explicitly identified as the site owner's `ACTIVE` long-term operator memory are eligible for migration. Ordinary chats, invitations, teammate records, member model channels, teammate usage data, and ambiguous records are not migrated.
- The final UI must not expose obsolete teammate controls merely for compatibility.

### R3.1 Owner Authentication Decision

- The final owner boundary uses Cloudflare Access in front of the private Site Operator surface.
- Browser requests use a same-origin Operator API facade. A server-held credential connects the facade to the Render Site Operator API; no reusable Render administrator token is stored in browser storage.
- Access identity and the service-to-service credential are separate concerns. The browser identity must not be accepted as a substitute for the Render service credential, and the service credential must never be exposed to the browser.
- Cloudflare Access policy configuration remains a documented human platform gate.

### R4. Chatus Owns The Team Agent

- Chatus remains a separately deployed, separately authenticated product with its own data, memories, model routes, quotas, Skills, tools, and MCP configuration.
- BIAU and Chatus must not share databases, session cookies, private memories, model credentials, or admin credentials.
- A future integration may expose a narrow read-only BIAU MCP surface for public project/status knowledge. It must not grant direct site mutation.
- Active model liveness probes and scheduled minimal-completion checks must be disabled by default; route quality should prefer real-task telemetry and passive failure evidence.
- Chatus productization is owned by the independent Trellis task at `D:\workspace4Cursor\chatus\.trellis\tasks\07-16-team-agent-productization`. This BIAU task may define integration contracts, but it must not edit or commit Chatus source.

### R5. Learn Remains A Domain App

- Duoduo Learn remains an independent Flutter learning product and keeps its own Agent runtime and local learning data.
- It may later appear on the BIAU project catalog, status page, and public assistant knowledge as WIP, but this task must not claim production stability or public APK readiness.
- Shared integration, if later needed, should use explicit public contracts rather than copying BIAU or Chatus databases and runtime internals into the App.
- `D:\workspace4Cursor\learn\duoduo` is under concurrent development. This task must not edit, format, generate files, stage, commit, clean, or revert anything in that repository.

### R6. Truthful Migration And Operations

- The final architecture must document service boundaries, authentication, storage ownership, tool permissions, manual gates, deployment steps, and rollback behavior.
- No token, key, database URL, model endpoint, access code, private memory, or unpublished Learn content may be committed or copied into public documentation.
- No model liveness probe may be performed during planning, implementation, or validation.

## Acceptance Criteria

- [x] BIAU presents one owner-only Site Operator product with site-specific language and workflows.
- [x] The Site Operator retains LangGraph planning, scoped retrieval, durable owner memory, status/project/content inspection, and review-gated Studio draft creation.
- [x] Teammate invitation, member-channel, quota, and multi-member administration are absent from the final owner UI and runtime contract.
- [x] Publishing, deployment, Git mutation, cloud mutation, and credential operations remain outside normal Agent permissions.
- [x] Chatus is documented and linked as the teammate-facing Agent without sharing BIAU private state.
- [x] The Chatus active-liveness policy gap and productization work are owned by its independent `07-16-team-agent-productization` task; no Chatus source is modified or committed from this task.
- [x] Learn is represented truthfully as an independent WIP learning-Agent App without modifying or packaging its current dirty worktree.
- [x] Deployment and migration documentation identifies every required human platform action without exposing values.
- [x] Relevant deterministic Agent, backend, UI, documentation, lint, build, and repository checks pass with zero live model calls.

## Out Of Scope

- Publishing a Learn APK or changing its current WIP implementation.
- Merging Chatus, Learn, and BIAU into one repository, database, authentication system, or Agent runtime.
- Automatically approving or publishing Studio content.
- Giving Chatus teammates repository-write or BIAU administrative tools.
- Replacing every existing cloud service before the final target contracts are implemented and verified.
- Editing Chatus code from the BIAU Trellis task.
- Editing, formatting, testing with generated output, staging, or committing the concurrent Learn worktree.
