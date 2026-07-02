# ERP 生产真实注册开启设计

## Boundary

- `erp` owns the real auth behavior, registration route tests, and deployment/runbook wording.
- `blog-semi` owns the public project detail and assistant knowledge wording.
- Real deployment remains outside this task; enabling requires setting environment variables on the target host after code/docs are merged.

## Auth Contract

- `GET /api/auth/bootstrap` returns `{ needsSetup, registrationEnabled }`.
- `POST /api/auth/register` only accepts registration when `isSelfRegistrationEnabled()` is true.
- In production, `ERP_REGISTRATION_ENABLED=true` is the explicit public registration switch.
- First account remains `owner` for empty systems; after an owner exists, public registrations become `operator`.

## Safety Shape

- Keep production default closed unless the env var is explicit.
- Keep password minimum and username pattern validation.
- Keep auth rate limiting for bootstrap/register/login/refresh.
- Do not commit real passwords or deployment secrets.

## Public Copy

- Main site should say production registration has been approved and is controlled by a deployment switch.
- Main site should also explain that registered users start as operator/collaborator accounts, while owner/admin permissions remain controlled.
