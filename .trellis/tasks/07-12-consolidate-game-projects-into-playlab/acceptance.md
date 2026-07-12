# Acceptance

## Result

- `/projects` now uses `catalogProjects`, exposes only AI applications and full-stack development, and contains BIAU Playlab exactly once with no standalone interactive cards.
- The complete `projects` registry remains unchanged as the source for detail routes, SEO, assistant context, Studio, related recommendations, and status mapping.
- BIAU Playlab now includes differentiated focus/maturity summaries for all six games, six internal case links, and six direct Web-play links.
- Retained routes verified: `/projects/game-first-tetris`, `/projects/game-next-spacewar`, `/projects/intespace`, `/projects/raiden-prototype`, `/projects/space-war`, and `/projects/spacewar-ii`.
- Mobile catalog behavior was verified at 320px, 390px, and 430px; desktop renders both catalog groups and every catalog project.

## Verification

- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run performance:check` - passed (`css 212094/240000`, `js 387516/430000`).
- `npm.cmd run project-details:check` - passed for 12 projects.
- `npm.cmd run check:ui` - passed for 14 routes across two base viewports plus focused catalog widths and retained game routes.
- `git diff --check` - passed.
- `python ./.trellis/scripts/task.py validate ./.trellis/tasks/07-12-consolidate-game-projects-into-playlab` - passed.

## Notes

The planning handoff mentioned `tetris-prototype`, but the authoritative project id is `game-first-tetris`; implementation and regression checks preserve the existing real route.