# Pet Showcase Open-Source README Slice

## Scope

Repository:

- `D:\workspace4Cursor\pet\gamer`

Focused subdirectory:

- `pet-app-showcase-site/`

Goal: package the current static Pet App showcase/download-status page as a reusable open-source entry, without disturbing the broader dirty worktrees across the Pet workspace.

## Dependencies

- Parent task: `07-09-open-source-readme-and-deployment-packaging`.
- Workspace root guidance read: `D:\workspace4Cursor\pet\README.md` and `SDLC-INDEX.md`.
- `gamer/AGENTS.md` and `docs/agents/domain.md` read.
- Current `gamer` branch: `cursor-windows-migration`.

## Dirty Worktree Boundary

The Pet workspace is not a single git repository. Several implementation repositories currently contain unrelated uncommitted work:

- `gamer/` has existing changes in README, admin review, Android tests, docs, scripts, and shared fixtures.
- `fantasy-pet-rule/` has existing app-server/API/test changes.
- `pet-clean/`, `pet-enterprise/`, `fantasy-pet/`, and `fantasy-pet-kmp/` also have significant uncommitted changes.

This slice intentionally touched only `gamer/pet-app-showcase-site/README.md` and committed only that file.

## Evidence Read

- `D:\workspace4Cursor\pet\README.md`
- `D:\workspace4Cursor\pet\SDLC-INDEX.md`
- `gamer/AGENTS.md`
- `gamer/README.md`
- `gamer/package.json`
- `gamer/docs/agents/domain.md`
- `gamer/pet-app-showcase-site/README.md`
- `gamer/pet-app-showcase-site/index.html`
- `gamer/pet-app-showcase-site/styles.css`
- `gamer/pet-app-showcase-site/favicon.svg`
- `gamer/pet-app-showcase-site/assets/*`
- relevant `gamer` docs/code references for APK/download gate wording

## Changes

- Rewrote `pet-app-showcase-site/README.md` into an open-source style static showcase entry.
- Added clear sections for preview, purpose, features, architecture, quick start, static deployment, assets, APK download policy, testing, security, roadmap, and public links.
- Preserved the disabled APK download policy and stated that public APK release requires reproducible build, signing policy, checksum, release notes, regression evidence, and human approval.
- Clarified that this directory owns only the static visitor page; app, Community API, Admin Review, and generation agent live across `gamer` / `fantasy-pet-rule`.

## Validation

Passed:

```powershell
Test-Path .\pet-app-showcase-site\index.html
Test-Path .\pet-app-showcase-site\styles.css
Test-Path .\pet-app-showcase-site\favicon.svg
Test-Path .\pet-app-showcase-site\assets\android-main.png
Test-Path .\pet-app-showcase-site\assets\android-hatch.png
Test-Path .\pet-app-showcase-site\assets\android-community.png
Test-Path .\pet-app-showcase-site\assets\android-profile.png
git diff --check -- pet-app-showcase-site/README.md
```

Additional static check:

- Parsed repository-relative `href` targets in `pet-app-showcase-site/index.html`; local targets exist.
- Sensitive scan over `pet-app-showcase-site/` produced only public URLs, the SVG namespace, and the README's example scan command. No real secret, private endpoint, APK path, signing path, or local artifact path was found in the changed README.

Committed and pushed:

- Repository branch: `cursor-windows-migration`
- Commit: `30d6118 docs: package pet showcase page for open-source use`

## Manual Gates

- Choose and add licenses before advertising Pet repositories for unrestricted open-source reuse.
- Resolve or commit existing dirty worktrees before rewriting full `gamer`, `fantasy-pet-rule`, `pet-clean`, or `pet-enterprise` READMEs.
- Approve whether the public Pet showcase should keep using the current screenshots after the next Android UI pass.
- Produce public APK release artifacts only after reproducible build, signing policy, SHA-256, release notes, regression evidence, and human approval.
- Keep model/provider endpoints, private worker routes, tokens, generation artifacts, signing files, local paths, and live logs out of public docs.
