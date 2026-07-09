# Analytics route view adapter

## Goal

Add default-off route view analytics event wiring so future Plausible/Umami choice can record page views without storing provider secrets.

## Requirements

- Reuse the existing `src/utils/analytics.ts` adapter.
- Add a route-view/page-view event that fires when the React route pathname changes.
- Keep analytics default-off. If `VITE_ANALYTICS_PROVIDER` is unset or unsupported, no event should be sent.
- Do not add third-party scripts, site ids, tokens, dashboards, or provider URLs to the repository.
- Do not send query strings, hashes, token-like values, raw user input, message text, or external URLs as analytics properties.
- Preserve existing project and assistant interaction events.
- Keep the implementation small enough to validate with local lint/build and a targeted static check if useful.

## Acceptance Criteria

- [x] `src/utils/analytics.ts` supports a public-safe route view event name.
- [x] `App` or a dedicated hook tracks route pathname changes exactly once per pathname change after navigation.
- [x] Event payload is low-sensitive, using normalized route metadata rather than full URLs or query strings.
- [x] Existing analytics provider behavior remains: `none` does nothing, `debug` dispatches `biau:analytics`, `umami` and `plausible` call their browser globals when present.
- [x] Validation passes for `npm.cmd run lint` and `npm.cmd run build`.

## Notes

- This is a lightweight child task under production acceptance/manual gates closure.
- Real Cloudflare Analytics, Search Console, Plausible, or Umami platform setup remains a manual gate.

## Completion Notes

- Added `route_view` tracking through the default-off analytics adapter.
- Route events send only `routePattern`, `routeArea`, and `routeDepth`.
- Updated observability docs and frontend quality spec with the low-sensitive analytics contract.
- Validation passed: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run docs:observability-check`, `npm.cmd run docs:manual-gates-check`.
