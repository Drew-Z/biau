# Project Detail Case Study Visuals Implementation Plan

## Steps

1. Inspect `src/pages/ProjectDetailPage.tsx`, project data files, project recommendation data, image assets, and current CSS.
2. Identify the smallest reusable data shape for case-study visuals.
3. Choose the first project based on available evidence and visitor value. Default recommendation: `legal-rag` or `ozon-erp`, because both have real workflows and public demo/status context.
4. Implement optional case-study visual rendering.
5. Populate one project with public-safe content and diagrams.
6. Run focused checks:
   - `npm.cmd run lint`
   - `npm.cmd run build`
   - `npm.cmd run check:ui` if page layout changed in a visible route
   - `git diff --check`
   - targeted sensitive scan.
7. Commit and push on `main` if checks pass.

## Rollback

Because the change should be data-driven and optional, rollback is removing the new data field and component rendering.

## Execution Record

- Inspected `src/pages/ProjectDetailPage.tsx`, `src/data/portfolio.ts`, `public/images/projects/showcase/*`, `scripts/check-project-detail-evidence.ts`, and `scripts/verify.mjs`.
- Found that the reusable case-study model and body visual renderer already exist:
  - `Project.detailContent`
  - `ProjectVisualBlock`
  - `ProjectDetailContentSections`
  - `ProjectVisualFigure`
- Ran `npm.cmd run project-details:check`; it passed for 12 projects with this coverage:
  - `legal-rag:16/3`
  - `pet-workspace:13/3`
  - `ozon-erp:15/3`
  - `biau-playlab:12/3`
  - `blog-semi:10/3`
  - `game-first-tetris:7/2`
  - `game-next-spacewar:6/2`
  - `intespace:6/2`
  - `raiden-prototype:6/2`
  - `space-war:6/2`
  - `spacewar-ii:6/2`
  - `xunqiu:14/4`
- Added `project-details:check` to `scripts/verify.mjs`.
- Ran full `npm.cmd run verify`; it passed, including UI check across 12 routes and 2 viewports.
