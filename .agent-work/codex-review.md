# Codex Controller Review

Date: 2026-06-16
Task: Raiden real runtime screenshots

## Decision

Approved as a narrow evidence slice.

Raiden already has a vertical-slice structure diagram in the public site, but the Godot showcase matrix still lacked real runtime screenshots. The selected screenshots should improve public credibility without expanding scope into gameplay redesign or release packaging.

## Required Scope

1. Generate screenshots from the actual Raiden Godot project through a temporary copy.
2. Publish only selected, reviewed PNGs under `public/images/projects/showcase/raiden-*.png`.
3. Use one real Raiden screenshot as the project visual in `src/data/portfolio.ts`.
4. Add Raiden runtime evidence to `caseImagesById['godot-showcase']` in `src/App.tsx`, while keeping the existing `godot-raiden-vertical-slice.svg`.
5. Update `docs/showcase-assets.md`, `.agent-work/current-task.md`, and `.agent-work/verification.md`.

## Screenshot Targets

- `raiden-main-menu.png`: public demo menu, recommended chapter run, first-run tips.
- `raiden-stage-01-gameplay.png`: Stage 01 enemy formation, HUD, fire/bomb resources, shooting loop.
- `raiden-stage-02-storm.png`: Stage 02 storm lanes, bullet pressure, fire/bomb state, differentiated second-stage climax.

## Non-goals

- Do not modify `/mnt/d/workspace4Codex/raiden-prototype`.
- Do not modify `~/workspace/reference-projects`.
- Do not publish raw logs, temp script output, export packages, `.import` metadata, release package names, hashes, accounts, IPs, tokens, or local validation paths.
- Do not claim result-page, boss-final-window, or chapter-summary screenshots are complete in this slice.

## Verification Requirements

- Confirm PNG dimensions and file sizes.
- Run `npm run lint`.
- Run `npm run build`.
- Run sensitive/public wording scan for interview/portfolio wording and obvious secret markers.
- Browser QA local routes at desktop and mobile:
  - `/projects/raiden-prototype`
  - `/games/raiden`
  - `/cases/godot-showcase`
- Record results in `.agent-work/verification.md`.
