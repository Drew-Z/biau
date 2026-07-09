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
