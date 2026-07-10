# Localized READMEs And Cleanup Audit Slice

## Scope

Repositories inspected:

- `D:\workspace4Cursor\blog-semi`
- `D:\workspace4Cursor\legal-rag`
- `D:\workspace4Cursor\erp`
- `D:\workspace4Codex\xunqiu\xunqiu-showcase-site`
- `D:\workspace4Codex\xunqiu-backend-modern`
- `D:\workspace4Cursor\pet\gamer`
- `D:\workspace4Cursor\game\blog`
- `D:\workspace4Cursor\game\space-war`
- `D:\workspace4Cursor\game\spacewar II`

Goal: add Simplified Chinese README entry points and decide whether unrelated files or folders should be deleted as part of open-source packaging.

## README Localization Decision

Default convention:

- Keep `README.md` as the default GitHub/open-source landing page.
- Add `README.zh-CN.md` for Simplified Chinese readers.
- Link from `README.md` to `README.zh-CN.md`.
- Link from `README.zh-CN.md` back to `README.md`.

Exceptions:

- `space-war` already uses a full Chinese `README.md`, so `README.zh-CN.md` is a short pointer file that preserves the cross-repository naming convention without duplicating the same long document.
- `pet/gamer` root has unrelated existing dirty changes. This slice touches only `pet-app-showcase-site/README.md` and `pet-app-showcase-site/README.zh-CN.md`.

## Files Added Or Updated

- `blog-semi/README.zh-CN.md`
- `legal-rag/README.zh-CN.md`
- `erp/README.zh-CN.md`
- `xunqiu-showcase-site/README.zh-CN.md`
- `xunqiu-backend-modern/README.zh-CN.md`
- `game/blog/README.zh-CN.md`
- `game/space-war/README.zh-CN.md`
- `game/spacewar II/README.zh-CN.md`
- `pet/gamer/pet-app-showcase-site/README.zh-CN.md`

Each English/default README that needed a Chinese link now points at the Chinese file.

## Cleanup Audit

Tracked-file scan looked for common unrelated or generated directories:

- `node_modules`
- `dist`
- `build`
- `target`
- `.godot`
- `.astro`
- `.vite`
- `.next`
- `coverage`
- `tmp`
- `temp`
- `__pycache__`
- `.pytest_cache`
- `.gradle`
- `.idea`
- `.vscode`
- `deploy/r2-play`
- `archive-v0`

Result:

- No target repository currently has those common generated/cache folders tracked in git.
- `xunqiu-backend-modern` generated `target/` during validation, but it is not tracked and was not staged.
- `pet/gamer` still has unrelated existing dirty implementation/documentation files; this task does not delete or stage them.

Decision:

- Do not delete files or folders in bulk during this slice.
- Future cleanup should be repository-specific and evidence-backed: inspect whether a path is tracked, whether it is referenced by code/docs/scripts, whether it is generated or source, and whether deletion affects deployment or demos.
- Obvious removal candidates, if discovered later, should be handled as separate commits with focused validation.

## Blog-Semi Hidden Tooling Cleanup

Follow-up scan after reviewing the GitHub root listing:

| Path | Tracked files | Decision |
| --- | ---: | --- |
| `.agent-work/` | 85 | Remove from Git tracking and ignore. It contains old agent audit/current-task/archive records, not source or contributor-facing workflow. |
| `.trellis/workspace/` | 4 | Remove from Git tracking and ignore. It contains developer journal/runtime notes that should stay local-only. |
| `.trellis/tasks/archive/` | 1055 | Remove from Git tracking and ignore. It is historical task process data, too noisy for a public GitHub root and not needed for fresh contributors. |
| `.trellis/spec/`, `.trellis/scripts/`, `.trellis/tasks/<active-task>/` | 62 | Keep tracked. These are the active project workflow/spec/tooling surface used by current Trellis work. |
| `.agents/skills/` | 50 | Keep tracked. The custom blog/Trellis skills are reusable project workflow assets. |
| `.codex/` and `.claude/` | 12 | Keep tracked. They are project-scoped assistant command/config files; local settings such as `.claude/settings.local.json` remain ignored. |
| `.github/workflows/` | 1 | Keep tracked. This is the public reliability CI workflow. |

Decision:

- Keep configuration and reusable workflow assets visible for contributors.
- Keep local/session/process-history artifacts out of Git while preserving the user's local copies.
- Use `git rm --cached` for this cleanup so local Trellis history is not physically deleted.

## Cross-Repository Prevention

Follow-up scan across packaged repositories found no tracked `.agent-work/`, `.trellis/`, `.codex/`, `.claude/`, `.cursor/`, `.scratch/`, or common generated/cache directories outside `blog-semi`.

Top-level tracked dot-file status:

| Repository | Tracked dot entries worth noting | Decision |
| --- | --- | --- |
| `blog-semi` | `.agents/`, `.claude/`, `.codex/`, `.github/`, `.trellis/`, `.env.example`, `.mcp.example.json` | Keep reusable workflow/config/example files; remove local-only history from Git tracking. |
| `legal-rag` | `.github/`, `.dockerignore`, `.env.docker.example`, `.gitignore` | Keep; normal open-source/deployment files. |
| `erp` | `.dockerignore`, `.gitignore` | Keep; normal repository files. |
| `pet/gamer` | `.dockerignore`, `.env.example`, `.env.private-ops.example`, `.gitignore` | Keep; public-safe examples and repository config. |
| `xunqiu-showcase-site` | `.gitignore` | Keep. |
| `xunqiu-backend-modern` | `.dockerignore`, `.env.example`, `.gitignore` | Keep; normal backend/deployment files. |
| `game/blog` | `.env.example`, `.gitignore` | Keep; normal static-site config. |
| `game/space-war` | `.gitignore` | Keep. |
| `game/spacewar II` | `.gitignore` | Keep. |

Prevention rule added to each packaged repository's `.gitignore`:

- ignore local AI/session process folders: `.agent-work/`, `.scratch/`;
- ignore local assistant state: `.claude/settings.local.json`, `.codex/sessions/`, `.codex/tmp/`;
- ignore local Trellis runtime/history only: `.trellis/.developer`, `.trellis/.runtime/`, `.trellis/tmp/`, `.trellis/workspace/`, `.trellis/tasks/archive/`;
- do not ignore reusable project workflow assets such as `.agents/skills/`, `.codex/config.toml`, `.claude/commands/`, `.trellis/spec/`, `.trellis/scripts/`, or `.github/workflows/`.

## Validation

Main site:

```powershell
npm.cmd run docs:manual-gates-check
npm.cmd run docs:deployment-check
```

Legal RAG:

```powershell
npm.cmd run typecheck
```

ERP:

```powershell
npm.cmd run test
```

Xunqiu showcase:

```powershell
Test-Path .\index.html
Test-Path .\docs.html
Test-Path .\README.zh-CN.md
git diff --check
```

Xunqiu backend:

```powershell
mvn -DskipTests package
```

Playlab:

```cmd
npm run content:audit
```

Spacewar II:

```cmd
godot --headless --path . -s res://scripts/SmokeTest.gd
```

Pet showcase:

```powershell
Test-Path .\pet-app-showcase-site\index.html
Test-Path .\pet-app-showcase-site\README.zh-CN.md
git diff --check -- pet-app-showcase-site/README.md pet-app-showcase-site/README.zh-CN.md
```

Sensitive-shape scans over changed README files found only public badges, localhost examples, placeholder URLs, documented check commands, or Godot `res://` / `user://` paths. No real key, token, database URL, private key block, or private local absolute path was introduced.

## Manual Gates

- Decide whether each repository should keep English `README.md` as default or switch the default README to Chinese for a primarily Chinese audience.
- Choose licenses for repositories that still lack a license file.
- Review GitHub repo descriptions/topics and social preview images account-side.
- Perform any real file/folder deletion only after a per-repository cleanup audit, not as a broad sweep.
