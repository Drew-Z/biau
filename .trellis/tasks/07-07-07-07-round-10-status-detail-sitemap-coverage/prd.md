# Round 10 status detail sitemap coverage

## Goal

Include reliability status detail routes in sitemap generation and local sitemap checks so `/status/:projectId` pages are treated as independent public pages.

## Requirements

- R1. Generate sitemap entries for every `reliabilityProjects` detail route under `/status/:projectId`.
- R2. Keep sitemap generation data-driven from `src/data/statusTargets.ts`, not hardcoded to a single project.
- R3. Update local sitemap/synthetic checks so missing status detail URLs are caught.
- R4. Do not call production sites, models, cloud APIs, or credentialed services.
- R5. Document/validate through existing local scripts.

## Acceptance Criteria

- [x] `scripts/generate-sitemap.mjs` emits `/status/<reliability project id>` entries for all reliability projects.
- [x] Main-site sitemap checks require the generated status detail routes, not only `/status`.
- [x] `npm.cmd run sitemap:generate`, `npm.cmd run main-site:synthetic`, `npm.cmd run lint`, `npm.cmd run build`, and targeted checks pass.
- [x] No secrets, private URLs, model provider details, or production credentials are committed.
- [x] Changes are committed locally; push remains deferred until SSH host key verification is resolved.

## Notes

- `/status/:projectId` already exists as a real React route and UI check target. This task makes search/discovery and synthetic evidence catch up with that route model.
- This is local deterministic work only.

## Result

- `scripts/generate-sitemap.mjs` now imports `reliabilityProjects` and emits all status detail routes.
- `public/sitemap.xml` now includes `/status/blog-semi`, `/status/legal-rag`, `/status/ozon-erp`, `/status/xunqiu`, `/status/pet-gamer`, and `/status/biau-playlab`.
- `scripts/check-main-site-synthetic.mjs` now derives required status detail sitemap paths from `src/data/statusTargets.ts`.
- `scripts/check-site-monitor.mjs` now checks `/status` plus every status detail page and validates sitemap entries by normalized URL path, so local preview can verify production-canonical sitemap locs.
- `main-site:synthetic` gained an explicit `--skip-assistant-api` option for local static preview route-only checks; default production behavior remains unchanged.
- `docs/site-monitoring.md` documents the local static preview usage.

## Validation

- `npm.cmd run sitemap:generate` passed and generated 66 URLs.
- `npm.cmd run main-site:synthetic -- --base http://127.0.0.1:<local-port> --timeout 5000 --skip-assistant-api` passed with routes `online (7/7)` and assistant `unchecked`.
- `npm.cmd run site:monitor -- --base http://127.0.0.1:<local-port> --timeout 5000 --max-links 20` passed with 18/18 checks.
- `node --check scripts/check-main-site-synthetic.mjs` passed.
- `node --check scripts/check-site-monitor.mjs` passed.
- `npm.cmd run status:contract` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- `npm.cmd run verify` passed.
- `git diff --check` passed with only Windows CRLF warnings.
- Secret-like scan over changed and untracked files found no real credentials or connection strings.

## Manual Gates

- Push remains deferred until the GitHub SSH host key verification gate is resolved.
- Live production synthetic checks, Search Console sitemap submission, and scheduled monitors remain platform/human tasks.

## Goal

Include reliability status detail routes in sitemap generation and local sitemap checks so /status/:projectId pages are treated as independent public pages.

## Requirements

- TBD

## Acceptance Criteria

- [ ] TBD

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
