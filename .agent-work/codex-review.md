# Codex Review

## Decision

Accepted CC's core finding, but rejected the broad multi-area cleanup for this slice.

## Approved Scope

- Remove only the currently dead or duplicate `project.links` entries in `src/data/portfolio.ts`.
- Leave `ProjectDetail` rendering logic intact so future real links can still render.
- Defer home-card labels, duplicate narrative buttons, and selected-project URL persistence to separate tasks.

## Risk Check

- Low risk: no route contracts, components, styles, or public technical content are changed.
- Main behavior change: project detail panels stop showing auxiliary buttons that were either inert or duplicated by existing primary actions.
