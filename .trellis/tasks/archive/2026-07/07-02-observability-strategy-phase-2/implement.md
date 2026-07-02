# 可观测性二期选型与路线图 - Implement

## Checklist

1. Read pre-development specs for docs/backend changes.
2. Add assistant API metrics utility.
3. Wire metrics middleware and `/metrics` route behind `METRICS_ENABLED`.
4. Update `.env.example`.
5. Add `docs/observability-strategy.md`.
6. Update `docs/site-monitoring.md`.
7. Update `docs/deployment.md`.
8. Validate default-off and enabled metrics behavior.
9. Run project checks and sensitive scan.
10. Commit, archive child task, update parent task, push.

## Validation Commands

```powershell
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run lint
npm.cmd run build
git diff --check
```

Manual metrics checks:

```powershell
# default off: expect 404
npm.cmd run server:smoke

# enabled: start a small createApp harness with METRICS_ENABLED=true and assert /metrics text output
```

Sensitive scan on changed files:

```powershell
rg -n "(?i)(api[_-]?key|secret|token|password|passwd|sk-[A-Za-z0-9]|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|PRIVATE) KEY|postgres(ql)?://|mysql://|mongodb(\+srv)?://|redis://|jdbc:|Bearer\s+[A-Za-z0-9._-]+|[0-9]{1,3}(\.[0-9]{1,3}){3})" <changed-files>
```

## Human Gates

- Enable real Cloudflare Web Analytics or Search Console verification.
- Choose and configure Plausible or Umami real provider script.
- Add Sentry DSN or ARMS account.
- Deploy assistant API metrics to production.
- Configure Prometheus / Grafana / ARMS scrape and alerts.

## Rollback Points

- Remove metrics middleware and `/metrics` route if it causes runtime issues.
- Keep docs strategy even if code rollback is needed; it documents the decision boundary.
