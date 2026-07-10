# BIAU Playlab Open-Source README Slice

## Scope

Repository:

- `D:\workspace4Cursor\game\blog`

Goal: package the Astro-based BIAU Playlab site as a reusable open-source entry for game showcases, development logs, public articles, and Godot Web playable hosting notes.

## Dependencies

- Parent task: `07-09-open-source-readme-and-deployment-packaging`.
- Local rules read: `D:\workspace4Cursor\game\blog\AGENTS.md`.
- Repository branch: `main`.

## Evidence Read

- `README.md`
- `AGENTS.md`
- `package.json`
- `astro.config.mjs`
- `.env.example`
- `docs/cloudflare-pages.md`
- `docs/deploy-guide.md`
- `docs/r2-play-upload.md`
- `docs/godot-export-playbook.md`
- `src/content/config.ts`
- `tools/audit_site_content.mjs`
- `tools/audit_dist_links.mjs`
- `tools/check_public_endpoints.mjs`
- `tools/deploy_pages.mjs`

## Changes

- Rewrote `README.md` into an open-source style entry point for BIAU Playlab.
- Added preview, purpose, features, architecture, quick start, content model, deployment, Godot Web playable workflow, scripts, testing, security, roadmap, and license sections.
- Documented the six current game entries: `first-tetris`, `next-spacewar`, `intespace`, `raiden`, `space-war`, and `spacewar-ii`.
- Clarified that the Astro site deploys from `dist/`, while Godot Web playables are staged under `deploy/r2-play/` and uploaded separately to the playable host.
- Kept deployment guidance public-safe and avoided local absolute paths, private Cloudflare credentials, and fake one-click deploy claims.

## Validation

Passed:

```cmd
npm run verify
git diff --check
```

`npm run verify` ran:

- `npm run content:audit`
- `npm run build`
- `npm run dist:audit`

Verification details:

- Content audit passed with 4 published articles, 39 workbench articles, 6 game projects, and 5 devlogs.
- Static resource reference checks passed.
- Astro build generated 35 static pages.
- Built output link audit scanned 40 files and passed.
- JSON-LD audit parsed 66 structured-data blocks and passed.
- Legacy redirect check passed with 1 rule.
- `git diff --check` reported only LF/CRLF normalization warnings.
- Focused README sensitive-shape scan found only public badge URLs and the public `SITE_URL` domain. No API key, database URL, private key block, R2 secret, local path, or file URL was found.

Committed and pushed:

- Repository branch: `main`
- Commit: `f6cbb78 docs: package playlab site for open-source use`

## Manual Gates

- Choose and add a standalone license before advertising the repository for unrestricted open-source reuse.
- Confirm GitHub repository description, topics, and visibility.
- Review public screenshots, videos, posters, and playable links before a broad public launch.
- Keep Cloudflare API tokens, R2 credentials, private dashboards, local Godot export paths, and unapproved playable artifacts out of public docs.
- Run `npm run deploy:check` only when a live network verification against the public host is intentional.
