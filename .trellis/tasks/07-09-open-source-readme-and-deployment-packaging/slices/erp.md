# Ozon ERP Open-Source README Slice

## Scope

Repository: `D:\workspace4Cursor\erp`

Goal: rewrite the ERP repository README as a reusable open-source project entry point, verify claims from the current workspace, and fix low-risk packaging issues that would make a public clone unsafe or confusing.

## Dependencies

- Parent task: `07-09-open-source-readme-and-deployment-packaging`.
- Local repo rules read: `AGENTS.md`.
- Current branch: `codex/ozon-plugin-parity`.

## Evidence Read

- `README.md`
- `package.json`
- `Dockerfile`
- `docker-compose.yml`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/extension/package.json`
- `apps/api/.env.example`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/server.ts`
- `apps/api/src/lib/runtime.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/scripts/smoke.ts`
- `apps/web/vite.config.ts`
- `apps/web/src/views/LoginView.vue`
- `apps/web/src/services/api.ts`
- `apps/web/src/router/index.ts`
- `apps/extension/wxt.config.ts`
- `packages/shared/src/index.ts`
- `scripts/upload_sftp.py`
- `scripts/sync_deploy_upload_next.py`
- `docs/handoff-2026-06-04.md`

## Changes

- Rewrote `README.md` into an open-source project entry point with features, architecture, quick start, configuration, registration/login behavior, scripts, deployment, testing, security, roadmap, and license sections.
- Documented first-owner bootstrap and default-open self-registration, including the fact that new accounts become `operator` users after an Owner exists.
- Changed Docker Compose defaults from real Ozon writes to safe mock mode:
  - `OZON_ADAPTER=mock`
  - `OZON_ENABLE_REAL_WRITE=false`
- Removed fixed SFTP host and username from the root `deploy:upload` script.
- Updated `scripts/upload_sftp.py` so SFTP host, port, username, password, local path, and remote path can come from environment variables or explicit CLI args.

## Validation

Passed:

```powershell
python -m py_compile scripts\upload_sftp.py
docker compose config
npm.cmd pkg get scripts.deploy:upload
npm.cmd run test
npm.cmd run build
git diff --check
```

Test/build detail:

- API tests: 18 files, 153 tests passed.
- Shared tests: 2 files, 4 tests passed.
- Extension release metadata check passed for `1.1.2`.
- WXT extension production build passed.
- Web `vue-tsc -b && vite build` passed.
- Shared package build passed.

Sensitive scan over changed files found no fixed SFTP host/username, bearer token, API key, or secret assignment.

Committed and pushed:

- Branch: `codex/ozon-plugin-parity`
- Commit: `3dc9652 docs: package erp for open-source use`

## Manual Gates

- Choose and add a license before presenting the repository as reusable open-source software.
- Configure GitHub repository description/topics/visibility and optional deploy buttons in GitHub.
- Real Ozon shop credentials, Seller cookies, SFTP credentials, production database URLs, JWT secrets, and encryption keys must remain platform/local-only.
- Public demo should use a dedicated low-privilege account and should not expose real shop credentials.
