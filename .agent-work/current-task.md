# Current Task

Date: 2026-06-15
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Codex

## Goal

Improve Godot project coverage by adding public-safe showcase diagrams for the game projects that still lack visual evidence, then connect them to project cards and the Godot case detail page.

## Scope

- Add public-safe SVG diagrams for Tetris, Next Spacewar, InteSpace, and Raiden Prototype.
- Use those diagrams as project card/detail visuals for the matching interactive projects.
- Expand the Godot showcase case evidence list so it represents the full five-game set, not only Space War.
- Update docs/showcase-assets.md so the asset inventory reflects the new game coverage.
- Run lint, build, public wording scan, and targeted route/image checks.

## Non-goals

- Do not modify ~/workspace/reference-projects.
- Do not claim the new SVGs are real runtime screenshots.
- Do not add Web playable build packages or large Godot exports.
- Do not copy logs, build paths, local validation paths, package hashes, or release files into public content.
- Do not redesign the full site layout in this slice.

## Allowed Paths

- public/images/projects/showcase/*.svg
- src/data/portfolio.ts
- src/App.tsx
- docs/showcase-assets.md
- .agent-work/current-task.md
- .agent-work/verification.md

## Acceptance Criteria

- [x] Four new public-safe game diagrams exist and load as images.
- [x] Tetris, Next Spacewar, InteSpace, and Raiden project cards/details use their own visual asset.
- [x] /cases/godot-showcase shows evidence for all five Godot projects.
- [x] Asset inventory no longer says other Godot projects only have text evidence.
- [x] No public interview/portfolio wording or sensitive values are introduced.
- [x] npm run lint and npm run build pass in WSL.

## Verification Plan

- Run npm run lint.
- Run npm run build.
- Run sensitive/public wording scan over src, docs, public, and active .agent-work files.
- Browser-check /projects, /cases/godot-showcase, and the four game detail routes at desktop and mobile widths.
- Commit and push after verification passes.
