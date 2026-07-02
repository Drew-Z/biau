# 站点访问与运行监察 MVP - Implement

## Checklist

1. Read pre-development specs for frontend/backend script work.
2. Add `scripts/check-site-monitor.mjs`.
3. Add `site:monitor` command to `package.json`.
4. Add `src/utils/analytics.ts`.
5. Wire no-op analytics events into:
   - `src/pages/HomePage.tsx`
   - `src/pages/ProjectsPage.tsx`
   - `src/components/PublicAssistantWidget.tsx`
6. Add `docs/site-monitoring.md`.
7. Update `docs/deployment.md` to point online checks at `site:monitor`.
8. Validate.

## Validation Commands

```powershell
npm.cmd run site:monitor
npm.cmd run site:monitor -- --json
npm.cmd run blog:check
npm.cmd run lint
npm.cmd run build
git diff --check
```

Sensitive scan on changed files:

```powershell
rg -n "(?i)(api[_-]?key|secret|token|password|passwd|sk-[A-Za-z0-9]|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|PRIVATE) KEY|postgres(ql)?://|mysql://|mongodb(\+srv)?://|redis://|jdbc:|Bearer\s+[A-Za-z0-9._-]+|[0-9]{1,3}(\.[0-9]{1,3}){3})" <changed-files>
```

## Human Gates

- Real Cloudflare Web Analytics activation.
- Google Search Console / Bing Webmaster ownership verification.
- Umami / Plausible provider choice and real site id / script injection.
- Any recurring external monitor or deployment automation.

## Rollback Points

- Remove `site:monitor` script and package command if online checks are noisy.
- Remove analytics event calls; adapter is no-op, so runtime rollback risk is low.
