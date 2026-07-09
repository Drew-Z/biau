# Open-Source Repository Audit

This file tracks the multi-repository README and deployment packaging work for the BIAU Port ecosystem. It records evidence from source files and local validation, not stale README claims.

## Status Table

| Repository | Status | Current Slice | Verification | Manual Gates |
| --- | --- | --- | --- | --- |
| `D:\workspace4Cursor\legal-rag` | First slice complete | README rewritten as a normal open-source project; Docker web build args aligned with public demo hint env variables; committed and pushed on `codex/project-quality-dashboard` at `7d8470c`. | `npm.cmd run typecheck`; `npm.cmd --workspace apps/api run test:unit`; `npm.cmd --workspace apps/api run validate`; `npm.cmd --workspace apps/api run evaluate`; `npm.cmd --workspace apps/api run evaluate:review`; `npm.cmd run build`; `docker compose -f docker-compose.prod.yml config`. | Choose license; configure public repo description/topics; decide whether to publish public demo credentials; production pgvector/model validation requires user-owned env. |
| `D:\workspace4Cursor\blog-semi` | First slice complete | Root README rewritten as an open-source entry point covering the main site, LangGraph internal assistant, Studio, AI Daily, four-service deployment boundary, RAG Orchestrator, checks, and public-safe rules. | README link/image/sensitive-shape checks; `npm.cmd run docs:manual-gates-check`; `npm.cmd run docs:deployment-check`; `git diff --check` only reported LF/CRLF normalization warnings. | Choose license; configure GitHub repo metadata/topics/visibility; optional deploy buttons; production provider secrets stay platform-only. |
| `D:\workspace4Cursor\erp` | First slice complete | README rewritten as an open-source entry point; Docker Compose defaults changed to mock/false Ozon writes; fixed SFTP host/username removed from `deploy:upload`. Committed and pushed on `codex/ozon-plugin-parity` at `3dc9652`. | `python -m py_compile scripts\upload_sftp.py`; `docker compose config`; `npm.cmd pkg get scripts.deploy:upload`; `npm.cmd run test`; `npm.cmd run build`; `git diff --check` only reported LF/CRLF normalization warnings. | Choose license; configure public repo metadata; decide demo account policy; real Ozon/SFTP/database/JWT/encryption secrets stay platform-only. |
| `D:\workspace4Codex\xunqiu` / `D:\workspace4Codex\xunqiu-backend-modern` | Planned | README split should explain app/showcase/backend boundaries, health checks, and release artifacts. | Pending. | APK/release approval, backend production URL, storage/database config. |
| `D:\workspace4Cursor\pet` | Planned | README should describe current workbench state, app showcase, APK release gate, and future release path. | Pending. | Release signing, SHA-256, official APK/AAB upload approval. |
| `D:\workspace4Cursor\game` | Planned | README should package the Playlab/game showcase as a reusable static/game project with asset and hosting notes. | Pending. | Public asset/license review and hosting metadata. |

## Legal RAG Audit Notes

Evidence inspected:

- `AGENTS.md`
- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `.github/workflows/ci.yml`
- `apps/api/.env.example`
- `apps/web/.env.example`
- `.env.docker.example`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `docker-compose.prod.yml`
- `docker-compose.yml`
- `apps/api/src/app.ts`
- `apps/api/src/config/env.ts`
- `apps/web/src/App.vue`
- `docs/architecture.md`
- `docs/deploy-render-supabase.md`
- `CONTEXT.md`
- `docs/assets/screenshots/*`

Confirmed stack:

- Web: Vue 3, Vite, TypeScript.
- API: Express 5, TypeScript, Node 24.
- Shared package: workspace TypeScript domain/API types.
- RAG: deterministic local mock path plus OpenAI-compatible chat/embedding path.
- Vector store: in-memory adapter or PostgreSQL + pgvector.
- Deployment: Docker API, static web build, optional Docker Compose with pgvector PostgreSQL.
- Quality: API validation, RAG eval, contract-review eval, quality panel, trends, CI workflow.

Fixes made in the Legal RAG slice:

- Removed old demo-only positioning from the README and reframed it as a reusable legal-document RAG workbench.
- Replaced concrete old Render demo URLs with provider-neutral deployment guidance and placeholders.
- Added a public-safe README structure: preview, what it does, features, architecture, quick start, configuration, Docker Compose, deployment, project structure, API, testing, roadmap, security, license.
- Documented that `VITE_*` variables are public and that public demo credentials must be low-privilege and revocable.
- Added Docker web build args for `VITE_API_BASE_URL` and `VITE_PUBLIC_DEMO_*` values, then passed them from `docker-compose.prod.yml`.

Known manual gates:

- No license file exists. A license should be chosen before presenting the repository as reusable open-source software.
- Public demo credentials must be explicitly approved and rotated by the maintainer.
- `validate:pgvector` requires a safe local/production PostgreSQL + embedding configuration and was not run in this slice.
- GitHub repository description/topics and optional deploy buttons require account-side changes.
