# Complete AI Assistant MVP

## Goal

Finish the partially implemented AI assistant feature as a small, verifiable MVP for the BIAU Port product website. The MVP should make the current public assistant, internal assistant workspace, hidden admin page, Express API, Prisma schema, generated knowledge, and deployment notes coherent enough to validate locally and continue iterating through Trellis.

## User Value

- Site visitors can ask a bounded public assistant where to find projects, blog posts, and capability directions without the assistant inventing unsupported claims.
- Internal teammates can redeem an invite, use a simple internal collaboration assistant, and get help navigating site knowledge and delivery checklists.
- The project owner can verify the backend/API path, create invite codes through a minimal hidden admin page, and deploy the service with documented environment variables and checks.

## Background And Current State

This task starts after Trellis bootstrap. The repository already contains a partially implemented assistant feature in the dirty working tree. The work must preserve unrelated user changes and must not reset, overwrite, or silently include other parallel modifications.

Confirmed code facts:

- `src/App.tsx` routes `/assistant` to `AssistantPage` and `/assistant/admin` to `AssistantAdminPage`, and hides `PublicAssistantWidget` on assistant routes.
- `src/components/PublicAssistantWidget.tsx` supports a floating public assistant, local fallback search, optional `VITE_CHAT_API_BASE_URL`, capped input length, citations, suggestions, loading state, and error fallback.
- `src/pages/AssistantPage.tsx` supports an internal assistant workspace with demo sessions, local fallback knowledge search, optional `/chat/internal` API call, localStorage token key `biau-assistant-member-token`, citations, suggestions, and error fallback.
- `src/pages/AssistantAdminPage.tsx` is currently a static shell with demo invite/member rows and no backend integration.
- `server/src/app.ts` defines `/health`, `/auth/redeem-invite`, `/chat/public`, `/chat/internal`, `/admin/summary`, and `/admin/invites`.
- `server/src/model.ts` calls an OpenAI-compatible `/chat/completions` endpoint when `OPENAI_API_KEY` exists and otherwise returns a local fallback answer.
- `server/src/db.ts` lazily creates a Prisma 7 client through `@prisma/adapter-pg`; database-backed routes use `requireDatabase()`.
- `prisma/schema.prisma` includes `Invite`, `Member`, `ChatSession`, `ChatMessage`, `UsageLog`, `MemberRole`, and `MessageRole`.
- `scripts/generate-assistant-knowledge.ts` generates `server/data/public-knowledge.json` from site project/blog data.
- `scripts/verify.mjs` includes assistant index generation, Prisma validation, server build, server smoke, frontend build, blog check, preview, and UI checks.
- `.env.example`, `README.md`, and `docs/deployment.md` already contain assistant-related setup/deployment material.

## Decisions

- D1 MVP priority: prioritize deployable backend/API completion plus stable public/internal assistant fallback behavior. Public and internal chat should be coherent and verifiable before expanding admin features.
- D2 Internal access: include a minimal invite redemption flow in the MVP. `/assistant` should let a member enter an invite code and display name, call `/auth/redeem-invite`, store the returned token in `localStorage`, and show basic member status. Full auth/account management remains out of scope.
- D3 Admin scope: connect the hidden admin page lightly to `GET /admin/summary` and `POST /admin/invites`. The MVP should prove the admin API works and let the owner create invite codes, but should not implement a full management console.
- D4 Validation strategy: require `assistant:index`, `prisma:validate`, `server:build`, `server:smoke`, `lint`, and `build` as split checks, then attempt `npm.cmd run verify` as the final integration gate. Do not hide real failures behind a generic environment excuse.
- D5 Knowledge boundary: use the current sanitized public site knowledge for both public and internal assistant responses. The public assistant should help visitors find site projects, blog posts, and capability directions. The internal assistant can add collaboration-oriented guidance for teammates, but must not claim access to private documents or a complete knowledge base.
- D6 Chat history: keep the current conversation usable and allow backend writes to `ChatSession` / `ChatMessage`, but defer `GET /chat/internal/sessions` and persisted message-history browsing to a later task.

## Requirements

- R1 Public assistant: the floating public assistant must work without a backend via local knowledge fallback, and use `/chat/public` when `VITE_CHAT_API_BASE_URL` is configured.
- R2 Internal assistant: `/assistant` must provide a useful teammate-facing workspace MVP with clear fallback behavior when the API, token, database, or model provider is unavailable.
- R3 Minimal invite onboarding: `/assistant` must support invite redemption without passwords, OAuth, reset flows, multi-account switching, or a full settings area.
- R4 Backend API: the Express API must build and pass smoke tests without requiring real secrets; database-required routes must fail safely when no database is configured.
- R5 Lightweight admin: `/assistant/admin` must connect to existing admin API endpoints for summary counts and minimal invite creation through a manually supplied admin bearer token stored locally.
- R6 Knowledge boundary: the MVP must behave as a bounded site guide and internal collaboration entry point, not as a complete or authoritative knowledge-base Q&A product.
- R7 Low-confidence behavior: when current site content is insufficient, public/internal assistant copy must say so and point users toward relevant pages or future content improvements instead of inventing specifics.
- R8 Data safety: public knowledge, demo data, docs, and UI copy must be sanitized and must not include real secrets, private customer data, internal URLs, or exact sensitive metrics.
- R9 Internal history boundary: internal chat may write sessions/messages to the database, but the MVP must not add full history browsing APIs or a persisted session-list UI.
- R10 Verification: the task is not done until the required split checks pass and full `npm.cmd run verify` is attempted or explicitly blocked with a concrete reason.
- R11 Trellis workflow: this complex task must have `prd.md`, `design.md`, and `implement.md` reviewed before `task.py start`.

## Out Of Scope

- Full account system beyond invite-issued bearer tokens.
- Password login, OAuth, reset flows, or multi-account switching.
- SSE/token streaming.
- Private/internal knowledge-source ingestion, file upload, private document parsing, vector database, RAG chunk admin, or pgvector.
- Full member list management, chat history browsing, delete/disable controls, and export implementation.
- Session list/message-history APIs and persisted history browsing UI.
- Real billing/quota enforcement beyond storing/logging MVP quota fields.
- Real production deployment performed by the agent.

## Acceptance Criteria

- [ ] Public assistant works in local fallback mode and configured API mode, returns bounded answers with citations or clear insufficient-content copy.
- [ ] Internal assistant supports minimal invite redemption, stores the member token locally, displays basic member status, and can send current-session messages using API or fallback behavior.
- [ ] Internal assistant does not imply full persisted history browsing is complete.
- [ ] Hidden admin page accepts/stores an admin token locally, loads summary counts from `GET /admin/summary`, and can create an invite through `POST /admin/invites` with useful success/error feedback.
- [ ] Backend API keeps `/health` and `/chat/public` usable without database/model secrets and returns stable JSON error codes for protected/database-required routes.
- [ ] Knowledge generation remains based on sanitized site project/blog data, with no private source ingestion in this task.
- [ ] `.env.example`, `README.md`, and `docs/deployment.md` are consistent with the final MVP flow and do not expose real secrets.
- [ ] Validation commands run: `npm.cmd run assistant:index`, `npm.cmd run prisma:validate`, `npm.cmd run server:build`, `npm.cmd run server:smoke`, `npm.cmd run lint`, `npm.cmd run build`; `npm.cmd run verify` is attempted as final integration validation.
- [ ] Any remaining limitation is explicit in docs or UI copy and does not pretend unfinished capabilities exist.

## Open Questions

None. Planning decisions above are accepted for this MVP.