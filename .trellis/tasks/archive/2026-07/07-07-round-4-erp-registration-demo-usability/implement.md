# ERP registration and demo usability implementation plan

## Checklist

- [x] Start the Trellis child task.
- [x] Load applicable BIAU Port specs before editing main-site files.
- [x] Read ERP local rules and inspect package scripts before editing ERP files.
- [x] Run focused ERP auth tests to confirm registration defaults and operator role.
- [x] Run ERP web build/type checks to confirm login/register UI still compiles.
- [x] Add or adjust code only if evidence shows a real local gap:
  - Prefer tests/smoke/docs/status improvements over broad UI rewrites.
  - Do not add public credentials.
- [x] Run `npm.cmd run erp:synthetic` in BIAU Port and regenerate `site:status` if status data changes.
- [x] Update parent manual gates for production-only actions.
- [x] Run minimal final checks for touched repos.
- [ ] Commit ERP repo changes if any; commit and push BIAU Port changes on `main`.
- [ ] Archive the child task after verification.

## Validation Commands

ERP repo:

```bash
npm.cmd run test --workspace @erp/api -- auth.registration runtime
npm.cmd run build --workspace @erp/web
```

BIAU Port repo:

```bash
npm.cmd run erp:synthetic
npm.cmd run site:status -- --timeout 20000
npm.cmd run lint
npm.cmd run build
```

## Manual Gates

- Confirm production `ERP_REGISTRATION_ENABLED` is unset or explicitly enabled if self-registration should be visible.
- Confirm the deployed ERP service contains the registration-open commits.
- If login smoke is desired, create a low-privilege, rotatable demo account and provide it only through environment variables, not repository files.
- If plugin/sync smoke is desired, provide a desensitized fixture or mockable demo path; do not use real store credentials.
