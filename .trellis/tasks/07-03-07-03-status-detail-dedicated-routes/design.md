# Design

## Route Shape

- Add `/status/:projectId` as the dedicated reliability detail route.
- Keep `/status` as the overview and entry-card list route.
- Unknown project ids render a clear missing state with a link back to `/status`.

## Data Flow

```text
public/status/site-status.json
  -> shared status loader/hook
  -> merge with src/data/statusTargets.ts static defaults
  -> /status overview
  -> /status/:projectId detail page
```

The generated JSON may be missing in fresh clones or previews. Both pages should keep the existing fallback behavior by merging static `reliabilityProjects` with generated status when available.

## Component Boundary

- Move shared status payload types, merge helpers, labels, and formatters out of `SiteStatusPage.tsx` into a reusable module.
- Keep route-level pages in `src/pages/`:
  - `SiteStatusPage` renders overview/cards.
  - `SiteStatusDetailPage` renders one `ReliabilityProject`.
- Keep rendering data-driven; no copied project status arrays.

## Navigation

- Overview card "详细状态" links to `/status/${project.id}` with React Router `<Link>`.
- Detail page provides a back link to `/status`.
- Existing `getReliabilityAnchorId` can remain for section ids/backward-compatible anchors, but it is no longer the primary detail navigation.

## Validation

- Extend `scripts/check-ui.mjs` to derive expected detail links from `siteStatusTargets` and `findReliabilityProjectForTarget`, then assert each href starts with `/status/`.
- Check at least one detail route renders a project title, check cards, and a back link to `/status`.
