# Current Task

Date: 2026-06-16
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Codex fallback

## Goal

Add real runtime screenshots for Raiden Prototype and connect them to the public showcase site.

## Scope

- Use the complete Windows source project only through a temporary capture copy.
- Publish reviewed, public-safe runtime screenshots for the main menu, Stage 01 gameplay, and Stage 02 storm sequence.
- Use a real runtime screenshot as the Raiden project visual.
- Add Raiden runtime evidence to /cases/godot-showcase while preserving the existing vertical-slice diagram.
- Update docs/showcase-assets.md and verification notes.

## Non-goals

- Do not modify ~/workspace/reference-projects.
- Do not modify D:/workspace4Codex/raiden-prototype.
- Do not publish Godot export packages, raw logs, .import metadata, local paths, build artifacts, package hashes, accounts, IPs, tokens, or release package details.
- Do not claim result-page or chapter-summary screenshots are covered yet.

## Allowed Paths

- public/images/projects/showcase/raiden-*.png
- src/data/portfolio.ts
- src/App.tsx
- docs/showcase-assets.md
- .agent-work/current-task.md
- .agent-work/verification.md
- .agent-work/cc-plan.md
- .agent-work/codex-review.md

## Acceptance Criteria

- [x] Raiden screenshots are generated from the actual Godot project in a temporary copy.
- [x] Selected screenshots are public-safe and added to public/images/projects/showcase.
- [x] Raiden project card/detail uses a real runtime screenshot.
- [x] /cases/godot-showcase includes Raiden runtime evidence alongside the existing structure diagram.
- [x] docs/showcase-assets.md distinguishes covered and remaining Godot screenshot gaps.
- [x] npm run lint and npm run build pass in WSL.
- [x] Sensitive/public wording scan is reviewed.
- [x] Browser QA confirms local routes load images without console errors or horizontal overflow.

## Verification Plan

- Confirm copied PNG dimensions and file sizes.
- Run npm run lint.
- Run npm run build.
- Run sensitive/public wording scan.
- Browser-check /projects/raiden-prototype, /games/raiden, and /cases/godot-showcase at desktop and mobile widths.
- Commit and push after verification passes.
