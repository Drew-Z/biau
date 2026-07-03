# Design

## Data Flow

```text
env/config -> scripts/check-erp-synthetic.mjs -> public/status/erp-synthetic.json
                                                   |
                                                   v
scripts/generate-site-status.ts -> public/status/site-status.json -> /status UI
```

## Synthetic Result Contract

`erp-synthetic.json` contains:

- `checkedAt`
- `apiBaseConfigured`
- `hasCredentials`
- `ok`
- `checks[]`

Each check contains:

- `id`: one of the Ozon ERP reliability check ids in `src/data/statusTargets.ts`.
- `status`: `online`, `degraded`, `offline`, or `unchecked`.
- `httpStatus`
- `durationMs`
- `checkedAt`
- `summary`
- `issues[]`

No response token, account name, role details beyond generic role category, shop, SKU, product, metric, or deployment URL is persisted.

## Script Behavior

1. Normalize `ERP_SYNTHETIC_API_BASE_URL`.
2. If no base URL is configured, write `unchecked` results and exit successfully.
3. Run `GET /api/health`; pass when wrapped `data.status === "ok"`.
4. Run `GET /api/auth/bootstrap`; pass when `needsSetup` and `registrationEnabled` are booleans.
5. Map bootstrap to `ozon-erp-auth` because it proves registration strategy visibility without creating accounts.
6. If credentials are missing, leave login and plugin-sync checks `unchecked`.
7. If credentials are present, `POST /api/auth/login`; pass when token-like fields and a user role exist.
8. Do not call `/api/auth/register`.
9. Write JSON report.
10. `--strict` exits non-zero only when an attempted check is `offline`.

## Status Merge

`generate-site-status.ts` should read both `legal-rag-synthetic.json` and `erp-synthetic.json`. For matching check ids:

- Replace static check status.
- Append evidence with latest synthetic summary.
- Keep static copy for cadence, owner, and description.

If a file is missing or malformed, static planned/unchecked copy remains.

## Safety

- Environment variables are never printed.
- Tokens are never persisted.
- Registration is never attempted by this script.
- Base URL is not persisted in public JSON.
