# Backend Observability Guidelines

## Scope

Use this guide before adding metrics endpoints, Prometheus instrumentation, OpenTelemetry exporters, RUM hooks, Sentry, ARMS, Grafana, or alerting integration.

## Current Contract

The assistant API exposes a default-off Prometheus endpoint:

- `METRICS_ENABLED=false` by default.
- `GET /metrics` returns `404 { "error": "metrics-disabled" }` unless explicitly enabled.
- `METRICS_ENABLED=true`, `1`, `yes`, or `on` enables Prometheus text output.
- `/health` remains public and independent of metrics.

## Safe Metrics

Allowed labels are low-cardinality and low-sensitivity:

- `method`
- `route` as an Express route template, not full URL.
- `status_class` such as `2xx`, `4xx`, or `5xx`.
- Histogram `le`.

Allowed metrics include:

- process start timestamp.
- process uptime.
- HTTP request counters.
- HTTP request duration histograms.

## Prohibited Metrics Data

Never include these in metrics, logs, traces, tags, or labels:

- IP addresses, User-Agent, cookies, raw headers, or Authorization values.
- Invite codes, bearer tokens, admin tokens, token hashes, or signing material.
- Member id, session id, message id, customer/user names, or exact private business counts.
- Chat message text, assistant prompt text, model responses, citations as raw JSON, or uploaded document content.
- Database URLs, model provider endpoints, provider names derived from private config, or cloud dashboard URLs.
- Full URL query strings or dynamic path ids that can create high-cardinality labels.

## Rollout Rules

- Keep new observability integrations default-off unless the task explicitly includes a production rollout gate.
- Do not add real provider DSNs, site IDs, API keys, scrape URLs, or dashboard links to the repository.
- Document real provider setup as a human gate.
- Prefer a minimal local smoke check before adding dashboards or alerts.
- Prometheus/Grafana should observe backend services first; static frontend traffic should use Cloudflare/Search Console/Plausible/Umami.

## Validation

After changing metrics or observability code:

```powershell
npm.cmd run server:build
npm.cmd run server:smoke
$env:METRICS_ENABLED='true'; npm.cmd run server:smoke; Remove-Item Env:\METRICS_ENABLED
npm.cmd run lint
npm.cmd run build
```

Also run a sensitive scan on changed files and manually inspect hits that mention token, key, bearer, database URL, private IP, or connection strings.

## Scenario: Public Synthetic Status Reports

### 1. Scope / Trigger

- Trigger: adding a project reliability smoke check that writes into `public/status/` and is rendered by `/status`.
- Use this for cross-project checks such as Legal RAG, ERP, xunqiu backend, Pet static showcase pages, game static resources, and future assistant production smoke checks.

### 2. Signatures

- `npm.cmd run <project>:synthetic` runs a project-specific script.
- Script output path: `public/status/<project>-synthetic.json`.
- Status aggregation: `npm.cmd run site:status` loads every `public/status/*-synthetic.json` file and merges checks by `id`.
- Cross-project suite: `npm.cmd run reliability:check` runs safe synthetic/status/monitor steps sequentially and writes `public/status/reliability-suite.json`.
- Static showcase example: `npm.cmd run pet:synthetic` writes `public/status/pet-gamer-synthetic.json` and updates the `pet-showcase` check only; release gates such as `pet-apk-gate` remain static `planned` until human approval.
- Public synthetic reports may include low-sensitive gate metadata such as `apkGate` when it helps the status page explain why a capability is not open yet. Gate metadata must be public-safe and must not include absolute local paths, signing paths, private bucket URLs, release tokens, unapproved APK URLs, or hidden deployment endpoints.

### 3. Contracts

- Environment keys must be optional by default. Missing API base URL writes `unchecked` results and exits successfully.
- Public report shape:
  - `checkedAt: string`
  - API synthetic checks: `apiBaseConfigured: boolean`
  - Static page synthetic checks: `baseConfigured: boolean`
  - Protected API synthetic checks: `hasCredentials: boolean`
  - `ok: boolean`
  - `checks: Array<{ id, status, httpStatus, durationMs, checkedAt, summary, issues }>`
- Reliability suite report shape:
  - `checkedAt: string`
  - `ok: boolean`
  - `strict: boolean`
  - `timeoutMs: number`
  - `stepTimeoutMs: number`
  - `summary: { total, passed, failed, skipped, durationMs }`
  - `steps: Array<{ id, label, command, status, durationMs, exitCode, outputPath?, summary, issues }>`
- Allowed statuses are `online`, `degraded`, `offline`, and `unchecked`. Static data may still use `planned`.
- Reliability suite step statuses are `passed`, `failed`, and `skipped`.
- A synthetic script must update only the check ids it can actually verify. Do not promote adjacent human gates such as APK release, production registration, or credential publication from `planned` to `online`.
- Adjacent human gates can be mirrored as explanatory metadata, but their public status remains `planned`, `unchecked`, or `degraded` until the exact release credential, account, APK, or production configuration has been approved and verified.
- If a live payload contains a business gate such as `registrationEnabled`,
  `demoEnabled`, `modelConfigured`, or `downloadApproved`, distinguish payload
  shape from gate state. HTTP 200 plus a well-formed boolean proves the endpoint
  works; it does not prove the business capability is open.
- Do not persist API base URLs, usernames, passwords, bearer tokens, private dashboard links, shop/SKU/order data, exact business metrics, or model-provider secrets.

### 4. Validation & Error Matrix

- Missing base URL -> all live checks `unchecked`; exit code `0`.
- Missing credentials -> run public health/bootstrap checks only; protected checks `unchecked`; exit code `0`.
- Same-domain Cloudflare Function expected but `/api/health` returns static HTML
  -> write the affected API check as `offline` with an issue that Functions may
  be missing or stale; do not mark it as a model-key failure.
- Public assistant `POST /api/chat/public` returns `405` on the main host while
  local Function smoke passes -> write the check as `offline` and point the next
  action at Pages deployment / Functions enablement before model env setup.
- Failed attempted request -> check becomes `offline` or `degraded` based on HTTP status; `--strict` may exit non-zero.
- `reliability:check` default mode -> continue after failed steps, write `public/status/reliability-suite.json`, and leave process success unless the runner itself cannot write a report.
- `reliability:check -- --strict` -> continue through all steps, write the report, then exit non-zero if any step failed.
- Well-formed bootstrap payload with `registrationEnabled=false` -> auth or
  registration check becomes `degraded`, with a short issue such as deployment
  stale or registration closed; health can remain `online`.
- Malformed synthetic JSON -> `site:status` ignores that file and keeps static status data.

### 5. Good/Base/Bad Cases

- Good: health endpoint returns a wrapped low-sensitive payload; script records status, HTTP status, duration, and a short summary.
- Good: ERP bootstrap returns `{ needsSetup: false, registrationEnabled: false }`,
  so the synthetic report records API health as `online` and auth/registration
  policy as `degraded`.
- Base: no environment configured; script records only `unchecked` placeholders so fresh clones still build.
- Base: a Pet showcase synthetic report records `apkGate.releaseCandidateFound=false` and a sanitized artifact summary, while `pet-apk-gate` remains `planned`.
- Bad: report includes real hostnames, tokens, account names, raw response
  bodies, SKU/order metrics, or provider keys.
- Bad: `reliability-suite.json` stores raw stdout/stderr, full checked URLs, environment variable values, CI dashboard URLs, or provider endpoints.
- Bad: report includes a local Gradle output absolute path, signing keystore path, R2 private URL, or direct debug APK download link before public approval.
- Bad: auth bootstrap returns `registrationEnabled=false`, but the check is
  marked `online` because the response shape was valid.

### 6. Tests Required

- Run the synthetic script with no env and assert it writes `unchecked` output.
- For static showcase pages with a public default base URL, run the synthetic script and assert required page text plus public asset URLs are reachable.
- Use an ephemeral local API to verify configured-base paths when adding protected smoke logic.
- Run `npm.cmd run site:status` and confirm `/status` receives merged check statuses.
- For business-gate checks, assert both the open and closed boolean paths. The
  closed path should be `degraded` or `planned` according to the feature gate,
  not `online`.
- Run `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:ui`, `git diff --check`, and a sensitive scan over changed files.

### 7. Wrong vs Correct

#### Wrong

```json
{
  "apiBaseUrl": "https://private.example.internal",
  "token": "real-token",
  "checks": [{ "id": "erp", "rawResponse": { "orders": 12345 } }]
}
```

```javascript
const bootstrapOk =
  response.ok &&
  typeof bootstrapData?.needsSetup === 'boolean' &&
  typeof bootstrapData?.registrationEnabled === 'boolean'
checks.push(checkFromResponse('ozon-erp-auth', response, bootstrapOk, 'Auth bootstrap returned booleans'))
```

#### Correct

```json
{
  "apiBaseConfigured": true,
  "hasCredentials": true,
  "checks": [
    {
      "id": "ozon-erp-auth",
      "status": "online",
      "httpStatus": 200,
      "durationMs": 120,
      "checkedAt": "2026-07-03T00:00:00.000Z",
      "summary": "Auth bootstrap and login returned expected low-sensitive structures",
      "issues": []
    }
  ]
}
```

```javascript
const bootstrapOk =
  response.ok &&
  typeof bootstrapData?.needsSetup === 'boolean' &&
  typeof bootstrapData?.registrationEnabled === 'boolean'
const registrationOpen = bootstrapOk && bootstrapData.registrationEnabled === true
checks.push(
  checkFromResponse(
    'ozon-erp-auth',
    response,
    registrationOpen,
    `Auth bootstrap returned registrationEnabled=${registrationOpen ? 'true' : 'false'}`,
    registrationOpen ? '' : 'production registration is currently closed or the deployment is stale',
    bootstrapOk && !registrationOpen ? 'degraded' : '',
  ),
)
```

## Scenario: External Demo Quality Fixtures

### 1. Scope / Trigger

- Trigger: a public project page links to an external demo whose quality,
  evaluation, or readiness endpoints read bundled fixture files at runtime.
- Use this when updating project showcase links, synthetic checks, Docker
  packaging, or quality panels for demos such as Legal RAG.

### 2. Signatures

- Quality summary endpoint: `GET /api/quality/report`.
- RAG evaluation endpoint: `GET /api/evaluation/report`.
- Contract review evaluation endpoint: `GET /api/review/evaluation/report`.
- Docker/runtime asset contract: copy public-safe runtime fixtures such as
  `eval/*.json` into the production image or deployment artifact.

### 3. Contracts

- Fixture files used by public quality panels must contain only public-safe
  test cases and sanitized sample text.
- Missing fixture files are non-core observability degradation, not a product
  workflow outage. The API should return a valid JSON report with `total=0`,
  empty result arrays, and a readiness `warn` check.
- Corrupt JSON, schema drift, or evaluation logic errors should still fail
  loudly; do not hide bad fixtures behind a catch-all fallback.
- Public status or assistant copy must not include real demo passwords, model
  keys, database URLs, provider endpoints, or private dashboard links.

### 4. Validation & Error Matrix

- Fixture included in image -> quality/evaluation endpoints return normal
  pass/fail metrics.
- Fixture missing with `ENOENT` -> endpoint returns `200` with empty metrics
  and warn details; core import, RAG query, and contract review remain usable.
- Fixture malformed -> endpoint may return `500` during testing or deployment
  verification so bad data is fixed.
- Private fixture content detected -> remove it before commit and replace with
  public-safe samples.

### 5. Good/Base/Bad Cases

- Good: Dockerfile copies `eval/` and unit tests assert missing paths degrade
  to empty reports.
- Base: a fresh clone without external env still builds and validates with
  bundled public fixtures.
- Bad: a deployment omits fixtures and `/api/quality/report` returns `500`,
  causing the public workbench to show only `Request failed: 500`.

### 6. Tests Required

- Unit test missing fixture paths for every evaluation loader.
- Run the external project typecheck/build plus any API validate/smoke command
  that hits quality, evaluation, import, RAG query, and contract review paths.
- Run `git diff --check` and a sensitive scan over changed files.
- Regenerate main-site assistant/public knowledge when project copy changes.

### 7. Wrong vs Correct

#### Wrong

```typescript
export async function loadEvalCases() {
  return JSON.parse(await readFile("/app/eval/rag-eval-set.json", "utf8"));
}
```

#### Correct

```typescript
export async function loadEvalCases(path = EVAL_SET_PATH) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }
    throw error;
  }
}
```
