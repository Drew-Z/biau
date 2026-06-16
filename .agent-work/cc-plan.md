# Builder Plan: Raiden Runtime Screenshots

Date: 2026-06-16
Task: Add real runtime screenshots for Raiden Prototype and connect them to the public showcase site.

## Builder Findings

- Raiden Prototype is a Godot 4.6.1 portrait vertical shooter with a public demo menu, Stage 01 growth loop, Stage 02 storm sequence, boss pressure, results screens, and chapter wrap-up scenes.
- The source project includes a capture checklist recommending menu, Stage 01 gameplay, Stage 02 storm, boss, and results/chapter summary screenshots.
- This slice should cover the strongest stable evidence first: main menu, Stage 01 gameplay, and Stage 02 storm sequence.

## Proposed Scope

1. Generate screenshots from the actual project through a temporary capture copy.
2. Publish only reviewed PNGs under `public/images/projects/showcase/raiden-*.png`.
3. Use the main-menu screenshot as the Raiden project visual.
4. Add Raiden runtime evidence to `/cases/godot-showcase` while preserving the existing vertical-slice diagram.
5. Update `docs/showcase-assets.md`, `.agent-work/current-task.md`, and `.agent-work/verification.md`.

## Risks And Constraints

- Do not modify `D:/workspace4Codex/raiden-prototype`.
- Do not modify `~/workspace/reference-projects`.
- Do not publish raw logs, local paths, export packages, `.import` metadata, release package names, hashes, accounts, IPs, tokens, or generated validation output.
- Result-page and chapter-summary screenshots remain later optional gaps unless captured reliably.

## Verification

- Confirm PNG dimensions and file sizes.
- Run `npm run lint`.
- Run `npm run build`.
- Run the public-safety wording scan.
- Browser-check `/projects/raiden-prototype`, `/games/raiden`, and `/cases/godot-showcase` at desktop and mobile widths.
