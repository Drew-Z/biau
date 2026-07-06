# ERP registration and demo usability design

## Scope

This child task covers the ERP demo entry, registration visibility, auth bootstrap diagnostics, and the BIAU Port status/project copy that depends on those facts. It may touch `D:\workspace4Cursor\erp` and `D:\workspace4Cursor\blog-semi`, but only for small, reversible changes that improve public demo usability or reliability observation.

## Boundaries

- ERP code remains the source of truth for registration behavior.
- BIAU Port status JSON remains low-sensitive and must not store credentials, database URLs, deployment backend links, or raw provider output.
- Public demo access can mention self-registration and low-privilege roles, but cannot publish admin credentials.
- Production verification that needs platform variables, service redeploys, production logs, or real demo accounts is a manual gate.

## Current Evidence

- Backend registration defaults are already aligned with the product intent: unset `ERP_REGISTRATION_ENABLED` means registration is open; explicit disabled or unknown values close it.
- New registered users become `operator` after an Owner exists.
- Frontend routing and LoginView already expose `/register` when bootstrap returns `registrationEnabled=true`.
- The main-site synthetic script cannot currently confirm production registration because no API base is configured in this session.

## Technical Design

1. Harden ERP-side verification before changing behavior:
   - Run focused API tests for registration defaults and role safety.
   - Run web build/type checks to catch LoginView regressions.
   - Inspect current LoginView state before editing; only change UI copy or affordance if the problem is reproducible.

2. Improve main-site observability when possible:
   - Keep `erp:synthetic` as the public-safe source for health/bootstrap/login status.
   - If the public ERP entry URL can imply an API base safely, add a documented fallback only if it does not expose a private endpoint and does not require credentials.
   - Preserve the current behavior that login/plugin checks stay `unchecked` without demo credentials.

3. Synchronize copy:
   - Project detail and status wording should distinguish three states: code supports registration, production bootstrap confirms open, or production remains unchecked/closed.
   - Manual gates should tell the user exactly what to configure or verify.

## Rollback

- Revert any ERP UI or test changes in the ERP repo independently from BIAU Port changes.
- If a synthetic fallback incorrectly marks production state, revert the script and regenerate `public/status/*.json`.
- Public status should degrade to `unchecked`, not invent a green result.
