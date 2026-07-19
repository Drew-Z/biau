# Restore frontend CSS budget

## Goal

Restore the existing `240000` byte production CSS budget by removing styles that have no runtime DOM producer, without changing visible behavior or raising the budget.

## Background

- The current production build emits `243408` bytes of main CSS and fails `performance:check` by `3408` bytes.
- The AI Daily production-operations slice did not modify CSS; this is existing global stylesheet debt.
- Repository-wide reference audits found no TS, TSX, JS, JSX, or HTML producer for `.harbor-environment`, its child classes, or `.muxing-flow-grain`.
- The active background implementation renders only `.flow-background`; the CSS fallback is provided by `.app::before` and `.app::after` and must remain intact.

## Requirements

- Remove only confirmed-dead harbor environment/grain selectors, their responsive/reduced-motion fragments, and keyframes that become unreferenced.
- Preserve `.flow-background`, `.app::before`, `.app::after`, `data-harbor-scene`, intro pause behavior, and CSS fallback behavior.
- Keep `.gradient-bg` and the separate legacy assistant-style cleanup out of the first slice because the harbor-only removal already provides sufficient budget headroom.
- Do not raise `scripts/check-build-performance.mjs` budgets or change public UI design.
- Do not modify, delete, stage, or commit `.codex-patch-test`.

## Acceptance Criteria

- [ ] `npm.cmd run performance:check` passes with the existing `240000` byte CSS budget.
- [ ] `npm.cmd run lint` and `npm.cmd run build` pass.
- [ ] `npm.cmd run check:ui` passes against a production preview, including flow canvas, CSS fallback, intro, desktop, and mobile routes.
- [ ] Repository search finds no remaining harbor environment/grain selectors or orphaned harbor keyframes in shipped styles.
- [ ] `git diff --check` passes and the staged file list excludes `.codex-patch-test`.

## Out Of Scope

- Raising bundle budgets.
- Redesigning the background or replacing WebGL.
- Removing `.gradient-bg` or old assistant styles unless the conservative harbor-only slice is insufficient.
- Refactoring or splitting the global stylesheet architecture.
