# ERP auth preserves BIAU Port bridge context

## Goal

Preserve the BIAU Port bridge query when switching ERP login/register modes so public demo users keep the correct origin context.

## Requirements

- When a visitor enters the ERP demo from BIAU Port with `?from=biau-port`,
  switching between login and register must preserve that bridge context.
- The change must not alter ERP registration policy, auth roles, token handling,
  or backend behavior.
- The UI should continue to fall back to login when self-registration is locked.
- Do not read or write ERP secrets or production environment files.

## Acceptance Criteria

- [x] `/login?from=biau-port` switched to register keeps
      `/register?from=biau-port`.
- [x] `/register?from=biau-port` switched to login keeps
      `/login?from=biau-port`.
- [x] Registration-locked fallback to login also keeps the BIAU Port context
      when it was present.
- [x] `npm.cmd run build --workspace @erp/web` passes.

## Notes

- This is a lightweight cross-repository fix under the continuous improvement
  parent task.
- Implemented in `D:\workspace4Cursor\erp` commit `654cc79` on branch
  `codex/ozon-plugin-parity`; not pushed until related-repository push policy
  is confirmed.
- Validation run twice successfully: `npm.cmd run build --workspace @erp/web`.
