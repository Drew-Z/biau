# ERP Registration Demo Followup Implementation Plan

## Steps

1. Inspect ERP project rules, README, package scripts, source files, and git state.
2. Locate registration/bootstrap/login implementation and existing tests or smoke scripts.
3. Pick the smallest safe improvement that helps demo access or status accuracy.
4. Implement in ERP or `blog-semi`, depending on where the real gap is.
5. Run focused validation in the touched repo.
6. Update this task with result, validation, and manual gates.
7. Commit/push `blog-semi`; handle ERP commits only after checking local repo rules and sensitive diff.

## Rollback

Revert the narrow UI/script/docs/status change. Do not alter production configuration or database state.

## Result

- Inspected ERP local rules, README, package scripts, git state, registration runtime, auth routes, registration tests, runtime tests, login/register UI, and auth store.
- Confirmed ERP code state:
  - `ERP_REGISTRATION_ENABLED` unset keeps self-registration open in production and local development.
  - explicit `0`, `false`, `no`, `off`, empty, or unknown values close self-registration.
  - existing-owner registration creates `operator` users, not Owner users.
  - `/auth/bootstrap` exposes low-sensitive `registrationEnabled` for synthetic/status checks.
- Left ERP repository untouched because it is already on `codex/ozon-plugin-parity` and ahead of remote by one commit.
- Improved `blog-semi` `status:contract` so `public/status/erp-synthetic.json` must keep `registrationEnabled`, `registrationStatus`, `registrationSummary`, and `ozon-erp-auth` status consistent.
- Updated observability spec to include ERP registration gates in the status contract expectations.

## Validation

- ERP: `npm.cmd run test --workspace @erp/api -- src/lib/runtime.test.ts src/routes/auth.registration.test.ts` passed.
- Main site: `npm.cmd run status:contract` passed.
- Main site: `npm.cmd run verify` passed.

## Manual Gates

- Production ERP login smoke still needs a low-permission demo account through environment variables.
- Plugin/sync smoke still needs a desensitized fixture or dedicated demo shop; do not use real shop credentials.
- If production registration ever appears closed again, first check `ERP_REGISTRATION_ENABLED`, deployed commit, and `/api/auth/bootstrap` from platform/production context.
