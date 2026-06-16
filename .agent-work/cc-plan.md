# CC Plan

## Findings

- `project.links` contains internal hash links for `legal-rag`, `pet-workspace`, `ozon-erp`, and `blog-semi`, but `ProjectDetail` only handles `/games/` and external links, so those visible buttons do nothing.
- Game projects already show the primary `打开试玩展示` action through `gameSlug`, while their `project.links` entries render an extra `查看页面` button that routes to the same game detail target.
- CC also noted broader UX opportunities around home cards, duplicate button groups, and selected project URL state, but those are larger product slices.

## Recommended Slice

- Keep this slice narrow: remove the current dead or duplicate `project.links` data from `src/data/portfolio.ts`.
- Do not redesign project pages or change route handlers in this slice.
- Keep `ProjectDetail` link rendering in place for future real external links.

## Files To Touch

- `src/data/portfolio.ts`
- `.agent-work/*`

## Verification

- Confirm no public `本页查看`, `当前站点`, or duplicate `查看页面` auxiliary buttons remain in project detail panels.
- Confirm game projects still expose `打开试玩展示` and open `/games/:slug`.
- Run `npm run lint` and `npm run build`.
- Browser QA on `/projects`, one AI project detail, and one game detail route at desktop/mobile.
