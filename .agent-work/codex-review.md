# Codex Review

## Decision

Accepted CC's query-parameter approach with one additional controller constraint: the query state applies only to the `/projects` list view.

## Approved Scope

- Add safe helpers for valid project ids and `/projects?project=<id>` selection.
- Use query state for project list previews, including navigation and thumbnail/group selection.
- Keep `/projects/:id`, `/cases/:id`, `/games/:slug`, and blog routes unchanged.
- Sync the project group tab when a selected project is restored from history.

## Risk Check

- Medium-low risk: route logic is touched, so QA must cover direct query opening, invalid query fallback, thumbnail selection, group switching, browser back/forward, and independent detail routes.
- No content, styles, dependencies, or reference projects are changed.
