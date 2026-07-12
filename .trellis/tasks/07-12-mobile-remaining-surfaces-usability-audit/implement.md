# Implement: Mobile Project Catalog Progressive Disclosure

1. Add typed mobile group selection to `ProjectsPage` without duplicating project data.
2. Add semantic group controls and stable panel ids while preserving desktop headings and card behavior.
3. Add scoped responsive styles for one-group mobile visibility and 44px project actions.
4. Extend `scripts/check-ui.mjs` with mobile/desktop catalog contracts and source-count assertions.
5. Capture 320px, 390px, and 430px evidence; run full gates; update frontend specs and acceptance notes.
6. Commit implementation, archive the Trellis task, and push `main`.

## Rollback

The change is isolated to `ProjectsPage`, project-page responsive CSS, and UI checks. Reverting the selection state/controls and scoped styles restores the previous always-expanded catalog without data migration.