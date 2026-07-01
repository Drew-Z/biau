# ERP auth entry polish

## Goal

Improve the Ozon ERP authentication entry so visitors arriving from the main
site can understand whether they should log in, register, or create the first
Owner account, and so the screen feels like a polished SaaS entry point rather
than a plain form.

## Confirmed Facts

- Target repository: `D:/workspace4Cursor/erp`.
- Current branch: `codex/ozon-plugin-parity`.
- API routes already include `/api/auth/bootstrap`, `/api/auth/register`,
  `/api/auth/login`, and `/api/auth/refresh`.
- Production self-registration is controlled by `ERP_REGISTRATION_ENABLED`; when
  unset it is enabled only outside production.
- Web routing already maps `/login` and `/register` to `LoginView.vue`.
- Pinia auth store already supports `setupOwner`, `login`, and `register`.
- `LoginView.vue` already has a two-column visual layout, login/register switch,
  and `from=biau-port` bridge back to the main site.

## Requirements

- R1. Preserve existing backend auth contracts and do not change database schema.
- R2. Do not enable production self-registration by default.
- R3. Add front-end confirmation-password validation for registration and first
  Owner setup.
- R4. Make registration-disabled state explicit: if registration is disabled,
  the `/register` route should route or present the login path with a clear
  message rather than silently confusing the user.
- R5. Improve login/register/owner setup copy, visual hierarchy, background, and
  trust/safety cues without adding a marketing landing page before the form.
- R6. Keep the main-site bridge visible when `from=biau-port` is present.
- R7. Preserve plugin/login synchronization behavior that depends on stored
  tokens and `ERP_LOGIN_CHANGED`.

## Out Of Scope

- Adding email verification, invitations, password reset, OAuth, or admin user
  management.
- Changing user roles, Prisma schema, or production registration policy.
- Deploying ERP or changing production environment variables.

## Acceptance Criteria

- [ ] Login, register, and Owner setup modes remain reachable from the correct
      routes.
- [ ] Registration/Owner setup refuses mismatched confirmation passwords before
      calling the API.
- [ ] Registration-disabled state is understandable from the UI.
- [ ] The screen is responsive on mobile and desktop and does not overflow.
- [ ] Existing auth persistence still stores token, refresh token, user, and
      posts `ERP_LOGIN_CHANGED`.
- [ ] ERP web build passes.
- [ ] Relevant API tests pass or any unrelated failures are recorded.
