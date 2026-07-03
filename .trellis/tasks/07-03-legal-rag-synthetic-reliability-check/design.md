# Design

## Data Flow

```text
env/config -> scripts/check-legal-rag-synthetic.mjs -> public/status/legal-rag-synthetic.json
                                                        |
                                                        v
scripts/generate-site-status.ts -> public/status/site-status.json -> /status UI
```

## Synthetic Result Contract

`legal-rag-synthetic.json` contains:

- `checkedAt`
- `apiBaseConfigured`
- `ok`
- `hasCredentials`
- `checks[]`

Each check contains:

- `id`: one of the Legal RAG reliability check ids already defined in `src/data/statusTargets.ts`.
- `status`: `online`, `degraded`, `offline`, or `unchecked`.
- `httpStatus`
- `durationMs`
- `checkedAt`
- `summary`
- `issues[]`

No response body text is persisted except short sanitized summaries.

## Script Behavior

1. Normalize `LEGAL_RAG_API_BASE_URL`.
2. If no base URL is configured, write `unchecked` results and exit successfully.
3. Run `GET /api/health`.
4. Run `GET /api/auth/status`.
5. If auth is enabled and credentials are missing:
   - mark protected synthetic checks as `unchecked`.
   - do not exit non-zero.
6. If credentials are available:
   - `POST /api/auth/login`, store only cookie name/value pairs in memory.
   - `POST /api/ingestion-jobs/seed`, poll `GET /api/ingestion-jobs/:id` if job id exists.
   - `POST /api/rag/query` with a fixed public-safe question.
   - `POST /api/contracts/review` with a short synthetic contract text.
   - `GET /api/quality/report`.
7. Write JSON report.
8. `--strict` exits non-zero only when a check that was attempted is offline.

## Status Merge

`generate-site-status.ts` reads `public/status/legal-rag-synthetic.json` if present. For matching check ids:

- Replace the static check status.
- Append evidence with the latest synthetic summary.
- Keep static copy for cadence, owner, and description.

If the file is missing, existing planned/unchecked copy remains.

## Safety

- Environment variables are never printed.
- Cookies are never persisted.
- Question, answer, citations, contract text, model output, and document chunks are never written.
- Base URL is passed through environment variables and is not persisted in public JSON.
