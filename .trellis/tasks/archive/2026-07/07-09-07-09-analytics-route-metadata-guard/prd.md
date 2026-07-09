# Analytics route metadata guard

## Goal

Add an offline guard for route analytics metadata so `route_view` never sends full URLs, query strings, hashes, or dynamic ids.

## Requirements

- Add a lightweight script that imports the pure route metadata helper from `src/utils/analytics.ts`.
- Cover current first-class route families: home, projects, project detail, assistant, assistant admin, Studio, Studio AI Daily issue detail, status, status detail, blog, blog post, and unknown routes.
- Assert dynamic paths normalize to public-safe route patterns such as `/projects/:id` and `/blog/:slug`.
- Assert query strings, hashes, full URLs, tokens, and dynamic ids do not survive in event metadata.
- Add an npm script so the check can be run without starting a dev server or connecting to analytics providers.
- Do not call Umami, Plausible, Cloudflare, Search Console, model providers, or any network endpoint.

## Acceptance Criteria

- [x] `npm.cmd run analytics:check` exists and passes locally.
- [x] The check fails if route metadata contains `?`, `#`, full URLs, `token`, or a known dynamic id from sample paths.
- [x] The check is included in `npm.cmd run verify` because it is fast and offline.
- [x] `npm.cmd run lint` and `npm.cmd run build` pass.

## Notes

- This is a lightweight follow-up to `07-09-07-09-analytics-route-view-adapter`.

## Completion Notes

- Added `scripts/check-analytics-route-metadata.ts`.
- Added `npm.cmd run analytics:check` and wired it into `npm.cmd run verify`.
- Updated frontend quality spec so analytics changes require the route metadata guard.
- Validation passed: `analytics:check`, `lint`, `build`, and full `verify`.
