# Legal RAG Open-Source README Slice

## Scope

Repository: `D:\workspace4Cursor\legal-rag`

Goal: rewrite the Legal RAG repository README as a normal reusable open-source project entry point, verify claims from source/config/scripts, and fix only low-risk deployment packaging gaps found during the README audit.

## Dependencies

- Parent task: `07-09-open-source-readme-and-deployment-packaging`.
- Local repo rules read: `AGENTS.md`.
- Public-safe constraint: do not expose real credentials, model relay URLs, database URLs, admin passwords, private dashboards, or production demo secrets.

## Evidence Read

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

## Changes

- Rewrote `README.md` to remove resume/interview positioning and present Legal RAG as a reusable legal-document RAG workbench.
- Replaced old concrete deployment URLs with provider-neutral deployment instructions and placeholders.
- Documented local mock mode, pgvector mode, Docker Compose, deployment, API, testing, roadmap, security, and license gate.
- Updated `apps/web/Dockerfile` with Vite build args for API base URL and public demo hint variables.
- Updated `docker-compose.prod.yml` to pass those Web build args from the root `.env`.

Committed and pushed:

- Branch: `codex/project-quality-dashboard`
- Commit: `7d8470c docs: package legal rag for open-source use`

## Validation

Passed:

```powershell
npm.cmd run typecheck
npm.cmd --workspace apps/api run test:unit
npm.cmd --workspace apps/api run validate
npm.cmd --workspace apps/api run evaluate
npm.cmd --workspace apps/api run evaluate:review
npm.cmd run build
docker compose -f docker-compose.prod.yml config
```

Not run:

```powershell
npm.cmd --workspace apps/api run validate:pgvector
```

Reason: it requires a user-owned PostgreSQL + embedding configuration and must not be treated as a default local/open-source gate.

## Manual Gates

- Choose and add a license file before presenting the repository as reusable open-source software.
- Configure GitHub repository description/topics/visibility and optional deploy buttons in GitHub.
- Approve any public demo credentials before setting `VITE_PUBLIC_DEMO_PASSWORD`.
- Run `validate:pgvector` only with a safe local/production env controlled by the maintainer.
