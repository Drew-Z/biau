# Acceptance: Mobile Blog Column Selector

## Outcome

- Desktop retains the complete segmented column button group and hides the mobile selector.
- Mobile at 320px, 390px, and 430px renders one labeled native selector with all six choices.
- The selector shares the existing controlled column state, resets pagination, filters populated columns, and preserves shared empty states.
- The mobile page stays within viewport bounds without a horizontal taxonomy rail.

## Verification

- `npm.cmd run lint` - passed
- `npm.cmd run build` - passed
- `npm.cmd run performance:check` - passed (`CSS 203217 / 240000`, `JS 385135 / 430000`)
- `npm.cmd run check:ui` - passed for 14 routes; added 320px, 390px, and 430px selector checks
- `git diff --check` - passed
- `python ./.trellis/scripts/task.py validate ./.trellis/tasks/07-12-mobile-blog-column-selector` - passed
- Visual check: `C:\Users\zhang\AppData\Local\Temp\mobile-blog-column-selector.png`

## Notes

The first parallel UI run overlapped a production build rewriting `dist` and timed out before `#root` mounted. Running the UI suite alone passed; no product assertion failed.