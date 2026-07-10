# BIAU Port Main Repository README Slice

## Scope

Repository: `D:\workspace4Cursor\blog-semi`

Goal: rewrite the root README as a normal open-source project entry point for BIAU Port / 泊岸, based on the current source, deployment docs, LangGraph internal assistant docs, Studio/AI Daily docs, Render Blueprint, Prisma schema, and available public-safe screenshots.

## Evidence Read

- `AGENTS.md`
- `README.md`
- `package.json`
- `render.yaml`
- `prisma/schema.prisma`
- `server/src/env.ts`
- `server/src/app.ts`
- `functions/api/chat/public.ts`
- `docs/deployment.md`
- `docs/internal-assistant-agent-workspace.md`
- `docs/content-studio.md`
- `docs/ai-daily-pipeline.md`
- `docs/site-monitoring.md`
- `docs/observability-strategy.md`
- `docs/manual-gates.md`
- `src/data/assistant.ts`
- `src/data/portfolio.ts`
- `public/images/projects/showcase/blog-semi-*.png`

## Changes

- Rewrote `README.md` from a short internal project note into a full open-source style entry point.
- Added public-safe preview screenshots from existing site assets.
- Documented current product scope: project case studies, blog/content flow, public assistant, internal LangGraph Agent Workspace, Content Studio, AI Daily, reliability checks, and manual gates.
- Documented the four-service production boundary: public assistant API, internal assistant API, content Studio API, and RAG Orchestrator.
- Added quick start, configuration, scripts, deployment, project structure, testing, security, roadmap, and license sections.
- Kept secrets and provider details as placeholders or linked docs; no real database URLs, model endpoints, tokens, or private dashboards were added.

## Validation

Passed:

```powershell
npm.cmd run docs:manual-gates-check
npm.cmd run docs:deployment-check
```

Lightweight manual checks already completed:

- README screenshot paths exist.
- README linked docs exist.
- README sensitive-shape scan found no old demo-only framing or obvious secret patterns.
- `git diff --check` reported only Windows LF/CRLF normalization warnings.

## Manual Gates

- Choose and add a license before presenting this repository as reusable open-source software.
- Configure GitHub repository description/topics/visibility and optional deploy buttons in GitHub.
- Do not publish real Cloudflare, Render, database, Qdrant, model, Studio, or admin credentials in README examples.
