# GitHub README Preview Asset Cleanup Slice

## Scope

Repositories:

- `D:\workspace4Cursor\blog-semi`
- `D:\workspace4Cursor\legal-rag`
- `D:\workspace4Cursor\game\space-war`
- `D:\workspace4Cursor\game\spacewar II`

Goal: stop GitHub README pages from showing stale or misleading screenshots, then refresh current assets where a local, repeatable capture path exists.

## Changes

Main site:

- Removed the inline screenshot grid from `README.md`.
- Replaced it with current public routes and a note that screenshot assets are tracked in `docs/showcase-assets.md`.
- Kept badges because they are stack metadata, not product screenshots.

Legal RAG:

- Removed the top banner screenshot and the four-image preview table from `README.md`.
- Replaced the preview section with the current workbench surfaces: Knowledge Base, Q&A, Contract Review, and Quality Panel.
- Left screenshot files in `docs/assets/screenshots/` as review artifacts, not GitHub landing-page evidence.

Space War:

- Removed inline README screenshot embeds that pointed at historical `docs/media/*.png`.
- Regenerated `docs/media/menu.png`, `docs/media/gameplay.png`, and `docs/media/result.png` from the current Godot project with `tests/capture_screens.gd`.
- Fixed the strict Godot 4.6 parse warning in `scripts/game/game_root.gd` by replacing an integer `min()` inference with `mini()`, allowing screenshot generation to complete.

Spacewar II:

- Rewrote README as a full open-source entry point.
- Removed local absolute Godot paths from quick start and smoke commands.
- Made `tools/capture_site_screens.gd` configurable through `SPACEWAR_II_SCREENSHOT_DIR` or `--output-dir=...`.
- Updated screenshot instructions to use a rendering display instead of dummy/headless mode.

## Validation

Main site:

```powershell
npm.cmd run docs:manual-gates-check
npm.cmd run docs:deployment-check
git diff --check -- README.md
```

Legal RAG:

```powershell
npm.cmd run typecheck
npm.cmd --workspace apps/api run validate
git diff --check -- README.md
```

Space War:

```cmd
godot --path . --script res://tests/capture_screens.gd
godot --headless --path . --quit
git diff --check
```

Notes:

- Capture completed and refreshed the three `docs/media/*.png` files.
- Godot still reported an ObjectDB leak warning at exit, but the script completed and the generated menu image was visually inspected as nonblank/current.

Spacewar II:

```cmd
godot --headless --path . -s res://scripts/SmokeTest.gd
godot --path . --script res://tools/capture_site_screens.gd -- --output-dir=%TEMP%\spacewar-ii-screenshots
git diff --check
```

Notes:

- Smoke passed through menu, battle, and result.
- Screenshot helper produced `spacewar-ii-menu.png`, `spacewar-ii-battle.png`, and `spacewar-ii-result.png` in the temporary output directory.

## Commits

- Legal RAG: `c3785d2 docs: remove stale readme screenshots`
- Space War: `0133712 docs: refresh showcase media and remove stale readme images`
- Spacewar II: `a82f39c docs: package spacewar ii for open-source use`

## Manual Gates

- Reintroduce README-embedded screenshots only after they are regenerated from the current application state and reviewed.
- Review GitHub repository social preview images in the GitHub UI; they are account-side settings and cannot be verified from the local repo alone.
- Continue keeping screenshots that contain credentials, private dashboards, local paths, model/provider details, or unapproved release artifacts out of GitHub README pages.
