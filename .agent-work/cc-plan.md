# CC Plan

## Findings

- Project thumbnail cards currently show `列表预览`, `技术详情页`, and `业务案例`. The `列表预览` label is vague because clicking the card itself already selects the project for the right-side preview panel.
- The selected project side panel already provides clear primary actions: `打开技术详情页`, `打开业务案例`, and `打开试玩展示`.
- `ProjectNarrative` repeats the same primary action group below the selected project panel, making the page feel busier without adding a new route or workflow.
- Existing routes remain consistent: `/projects/:id`, `/cases/:id`, and `/games/:slug`.

## Recommended Slice

- Remove the repeated `ProjectNarrative` footer button group and keep that section focused on project explanation plus core outcome.
- Remove the thumbnail-card `列表预览` button because the whole card already performs the preview selection.
- Keep `技术详情页` and `业务案例` card buttons for direct route entry.

## Files To Touch

- `src/App.tsx`
- `.agent-work/*`

## Verification

- Run `npm run lint` and `npm run build`.
- Browser QA `/projects` on desktop and mobile:
  - Card click still updates the selected preview.
  - `列表预览` is absent.
  - `ProjectNarrative` no longer repeats the primary button cluster.
  - Technical detail, business case, and game showcase routes still work.
