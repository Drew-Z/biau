# Status summary semantics polish implementation plan

## Checklist

- [x] Load Trellis/frontend specs.
- [x] Inspect current status page, shared helpers, generated status payload, and
      UI checks.
- [x] Add shared reliability summary / attention helper to
      `src/data/siteStatusView.ts`.
- [x] Update `SiteStatusPage` to render separate entry and reliability summary
      groups with explicit labels.
- [x] Keep existing target cards, project detail cards, and route links intact.
- [x] Update `scripts/check-ui.mjs` to assert summary semantics from shared data.
- [x] Run validation:
  - [x] `npm.cmd run lint`
  - [x] `npm.cmd run build`
  - [x] `npm.cmd run check:ui`
  - [x] `git diff --check`
- [x] Update task checkboxes and parent progress notes.
- [x] Commit and push on `main` if validation passes.

## Validation Results

- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed; Vite emitted existing ineffective dynamic import warnings only.
- `npm.cmd run check:ui`: passed for 12 routes across 2 viewports against local preview.
- `git diff --check`: passed with Windows LF-to-CRLF warnings only.

## Rollback Points

- Before changing UI layout.
- Before editing UI checks.
- Before committing.

## Manual Gates

None. This task must not require credentials, model calls, cloud setup, or live
project-specific production checks.
