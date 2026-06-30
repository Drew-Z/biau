# Complete AI Assistant MVP Design

## Scope

This task finishes the assistant MVP already present in the dirty working tree. It does not redesign the whole site or add a full RAG/private-knowledge system. The implementation should make the current public assistant, internal assistant, hidden admin page, Express API, Prisma schema, generated knowledge, and deployment notes consistent and verifiable.

## Architecture Boundaries

### Frontend

- Route ownership remains in `src/App.tsx`.
- Public floating assistant remains in `src/components/PublicAssistantWidget.tsx`.
- Internal teammate workspace remains in `src/pages/AssistantPage.tsx`.
- Hidden owner/admin surface remains in `src/pages/AssistantAdminPage.tsx`.
- Shared display/data types remain in `src/data/assistant.ts` unless implementation discovers a clear need for a small helper module.
- Use React local state and `localStorage`; do not add a state library.
- Preserve existing CSS class-based styling in `src/styles/flow-pages.css` / `src/App.css`; do not add another UI framework.

### Backend

- Route registration and response shaping remain in `server/src/app.ts`.
- Environment reads remain in `server/src/env.ts`.
- Prisma lifecycle remains in `server/src/db.ts`.
- Token and invite helpers remain in `server/src/auth.ts` / `server/src/crypto.ts`.
- Model-provider behavior remains in `server/src/model.ts`.
- Public knowledge loading/search remains in `server/src/knowledge.ts`.

## Data Sources

The MVP uses sanitized public site data only:

- `src/data/portfolio.ts`
- `src/data/blog.ts`
- `scripts/generate-assistant-knowledge.ts`
- `server/data/public-knowledge.json`

Public and internal assistant responses use the same generated knowledge base. The internal assistant can use teammate-oriented UI copy and prompts, but it must not claim access to private documents, private repositories, source directories, or a complete internal knowledge base.

## API Contracts

### `GET /health`

Response:

```json
{
  "ok": true,
  "service": "biau-assistant-api",
  "database": true,
  "model": "gpt-4.1-mini"
}
```

Must work without database or model provider secrets.

### `POST /chat/public`

Request:

```json
{ "message": "RAG 项目" }
```

Response:

```json
{
  "answer": "string",
  "citations": [
    { "id": "blog:...", "title": "...", "summary": "...", "href": "...", "tags": [], "visibility": "public" }
  ]
}
```

Failure:

- Empty message -> `400 { "error": "missing-message" }`.
- Unexpected failure -> `500 { "error": "assistant-api-error" }`.

### `POST /auth/redeem-invite`

Request:

```json
{ "code": "INVITE-CODE", "name": "成员名" }
```

Response:

```json
{
  "token": "biaum...",
  "member": {
    "id": "string",
    "name": "成员名",
    "role": "MEMBER",
    "dailyQuota": 24
  }
}
```

Failure:

- Missing code -> `400 { "error": "missing-code" }`.
- Invalid/exhausted/expired invite -> `401 { "error": "invalid-invite" }`.
- Missing database -> `503 { "error": "database-not-configured" }`.

### `POST /chat/internal`

Headers:

```text
Authorization: Bearer <member-token>
```

Request:

```json
{ "message": "帮我整理交付检查", "sessionId": "optional-current-session-id" }
```

Response:

```json
{
  "answer": "string",
  "citations": [],
  "sessionId": "string",
  "messageId": "string"
}
```

Failure:

- Missing/invalid token -> `401 { "error": "missing-or-invalid-token" }`.
- Missing message -> `400 { "error": "missing-message" }`.
- Missing database -> `503 { "error": "database-not-configured" }`.

The MVP may persist chat records through the existing write path, but does not add session-list or message-history read endpoints.

### `GET /admin/summary`

Headers:

```text
Authorization: Bearer <admin-token>
```

Response:

```json
{ "members": 0, "invites": 0, "messages": 0, "usage": 0 }
```

Failure:

- Missing/invalid admin token -> `401 { "error": "missing-admin-token" }`.
- Missing database -> `503 { "error": "database-not-configured" }`.

### `POST /admin/invites`

Headers:

```text
Authorization: Bearer <admin-token>
```

Request:

```json
{
  "code": "INVITE-CODE",
  "label": "内部邀请码",
  "role": "MEMBER",
  "dailyQuota": 24,
  "maxUses": 1
}
```

Response:

```json
{ "id": "string", "label": "内部邀请码", "role": "MEMBER", "dailyQuota": 24, "maxUses": 1 }
```

Failure:

- Missing/invalid admin token -> `401 { "error": "missing-admin-token" }`.
- Missing code -> `400 { "error": "missing-code" }`.
- Missing database -> `503 { "error": "database-not-configured" }`.

## Frontend State And Storage

Use localStorage only for MVP access tokens and minimal profile/status:

- `biau-assistant-member-token`: member bearer token.
- `biau-assistant-member`: serialized basic member object if useful for display.
- `biau-assistant-session-id`: current internal chat session id if returned by the API.
- `biau-assistant-admin-token`: admin bearer token for hidden admin page.

LocalStorage values are convenience state, not secure storage. UI copy should treat them as local MVP tokens and provide a clear way to clear/reset them when practical.

## UI Behavior

### Public Assistant

- Keep the public floating assistant available outside `/assistant*` routes.
- Preserve local fallback search when no API base URL is configured.
- In low-confidence/no-hit cases, say the public content is still being organized and suggest browsing relevant project/blog pages.
- Do not provide generic ungrounded chat.

### Internal Assistant

- Show invite redemption when no member token is present.
- On successful redemption, save token/member locally and allow chat.
- If the backend is unavailable, continue to show the current local fallback instead of blank failure.
- When API returns `401` or `503`, explain the missing token/database condition plainly.
- Keep current-session chat visible after sending. Do not imply full persisted history browsing is available.
- The existing demo sessions should be relabeled as examples/templates or simplified so they are not mistaken for real history.

### Hidden Admin Page

- Allow admin token entry/storage.
- Load summary counts from `/admin/summary`.
- Provide minimal invite creation fields: code, label, role, daily quota, max uses.
- Show success/error feedback.
- Do not add member table pagination, history browsing, deletion, disabling, exports, or analytics dashboards.

## Environment Keys

Frontend:

- `VITE_CHAT_API_BASE_URL`: optional API base URL. Missing value enables local fallback mode.

Backend:

- `PORT`: API port, defaults to `8787`.
- `DATABASE_URL`: required for invite/internal/admin routes.
- `CORS_ORIGIN`: frontend origin, defaults to `*`.
- `OPENAI_BASE_URL`: OpenAI-compatible API base, defaults to `https://api.openai.com/v1`.
- `OPENAI_API_KEY`: optional; missing value uses fallback answer generation.
- `OPENAI_MODEL`: model name, defaults to `gpt-4.1-mini`.
- `ADMIN_TOKEN`: required for admin routes.

Do not read or commit real `.env` files.

## Compatibility And Migration

- Existing Prisma schema is sufficient for this MVP; no schema change is expected unless implementation finds a concrete defect.
- Existing migration should stay valid.
- Existing local fallback behavior should remain available so the frontend can be previewed without a running API.
- Existing server smoke contract must keep passing.

## Risk And Rollback

- Risk: frontend claims persisted history exists when it does not. Mitigation: label demo sessions as examples or simplify that UI.
- Risk: public assistant hallucinates because current blog/project content is thin. Mitigation: stronger low-confidence copy and citation-first responses.
- Risk: admin token in localStorage is not secure. Mitigation: document this as an MVP owner-only hidden tool, not a production auth model.
- Risk: database-required routes fail in local no-database mode. Mitigation: preserve `DatabaseNotConfigured` handling and smoke tests for public/no-auth routes.

Rollback shape: revert assistant-specific frontend/page/API changes while preserving generated knowledge and docs if still valid.
