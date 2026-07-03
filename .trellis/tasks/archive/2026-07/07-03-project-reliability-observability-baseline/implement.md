# Implement

## Checklist

1. Read project specs through `trellis-before-dev`.
2. Inspect existing status data, generator, page, styles, and scripts.
3. Extend status types and project reliability definitions in `src/data/statusTargets.ts`.
4. Update `scripts/generate-site-status.ts` to include `reliabilityProjects` and merge L0 evidence.
5. Update `src/pages/SiteStatusPage.tsx` to render reliability layers, project checks, gates, and next actions.
6. Add or adjust CSS for the expanded status page.
7. Regenerate `public/status/site-status.json`.
8. Run validation commands.
9. Update task notes, commit, push, and archive.

## Validation

- `npm.cmd run site:status`
- `npm.cmd run sitemap:generate`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`
- Sensitive scan for API keys, relay domains, passwords, and private URLs in changed files.

## Human Gates

- Do not enable production monitoring, scrape jobs, public credentials, or scheduled probes in this task.
- Do not publish real demo accounts or passwords.
- Do not call LLM providers or private project APIs during validation.

## Rollback Points

- Before changing generated JSON.
- Before UI/CSS expansion.
- Before committing.
