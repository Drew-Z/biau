# Design

## Data Flow

```text
env/config -> scripts/check-xunqiu-synthetic.mjs -> public/status/xunqiu-synthetic.json
                                                         |
                                                         v
scripts/generate-site-status.ts -> public/status/site-status.json -> /status UI
```

## Synthetic Result Contract

Use the shared public synthetic report contract from `.trellis/spec/backend/observability-guidelines.md`:

- `checkedAt`
- `apiBaseConfigured`
- `hasCredentials`
- `ok`
- `checks[]`

Each check contains:

- `id`: one of the Xunqiu reliability check ids in `src/data/statusTargets.ts`.
- `status`: `online`, `degraded`, `offline`, or `unchecked`.
- `httpStatus`
- `durationMs`
- `checkedAt`
- `summary`
- `issues[]`

No API base URL, login token, account, user content, team/pitch detail, APK URL, or exact backend deployment detail is persisted.

## Check Mapping

- `xunqiu-backend-health`
  - Request: `GET /actuator/health`
  - Pass: HTTP 2xx and JSON `status === "UP"`.
- `xunqiu-compat-api`
  - Requests, sequential:
    - `GET /apis/tweet/upToDateList?login_user_id=1&count=2`
    - `GET /apis/video/getVideosByPage?login_user_id=1&count=2`
    - `GET /apis/team/index?login_user_id=1&teamId=1`
    - `GET /api/v1/pitches?count=2`
  - Pass: every response is HTTP 2xx and JSON `status === 0`.
  - Do not persist raw `datas`, `data`, team fields, pitch fields, or user-generated content.
- `xunqiu-apk-gate`
  - Remains `unchecked` with a summary that APK release gates require a separate release artifact task.

## Script Behavior

1. Normalize `XUNQIU_SYNTHETIC_API_BASE_URL`.
2. If no base URL is configured, write `unchecked` results and exit successfully.
3. Run requests serially with timeout.
4. Convert 2xx valid payloads to `online`.
5. Convert auth/rate-limit/404 style responses to `degraded`; server/network failures to `offline` or `unchecked` when no HTTP status exists.
6. Write JSON report under `public/status/xunqiu-synthetic.json`.
7. `--strict` exits non-zero only when an attempted check is `offline`.

## Safety

- Environment variables are never printed.
- Raw response bodies are never persisted.
- The script does not login, mutate, upload, publish, praise, comment, or create records.
- Base URL is not persisted in public JSON.
