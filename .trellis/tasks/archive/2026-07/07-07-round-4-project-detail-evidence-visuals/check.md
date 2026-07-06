# Check Notes

## 2026-07-07

- Added `npm.cmd run project-details:check`.
  - Reads `src/data/portfolio.ts`.
  - Verifies every project has detail content, enough sections, at least two in-body visuals, existing `/images/projects/` assets, visual titles/descriptions, and image alt text.
- Ran `npm.cmd run project-details:check`.
  - Result: passed for 12 projects.
  - Summary: `legal-rag:16/3, pet-workspace:13/3, ozon-erp:15/3, biau-playlab:12/3, blog-semi:10/3, game-first-tetris:7/2, game-next-spacewar:6/2, intespace:6/2, raiden-prototype:6/2, space-war:6/2, spacewar-ii:6/2, xunqiu:14/4`.
- Ran `npm.cmd run assistant:index`.
  - Result: passed; generated public knowledge files had no Git diff.
- Ran `npm.cmd run lint`.
  - Result: passed.
- Ran `npm.cmd run build`.
  - Result: passed. Vite/Rolldown emitted existing dynamic-import warnings only.
- Ran `npm.cmd run check:ui`.
  - Result: passed for 12 routes across 2 viewports.

