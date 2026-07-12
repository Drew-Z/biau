# Implement: Consolidate Game Projects Into BIAU Playlab

1. Add a typed, source-derived `catalogProjects` projection while preserving the full project registry.
2. Switch `ProjectsPage` to two catalog groups and keep mobile/desktop progressive-disclosure behavior coherent.
3. Add six-game focus/maturity summaries, internal detail links, and external Web-play links to BIAU Playlab.
4. Update catalog UI checks, project-detail evidence checks, and any public copy/count contracts affected by removal of standalone cards.
5. Verify all six retained game detail routes, Playlab links, 320/390/430px catalog behavior, and desktop source counts.
6. Run full gates, update frontend/data specs and acceptance evidence, commit, archive, and push.

## Rollback

Remove `catalogProjects`, restore the interactive group in `ProjectsPage`, and remove the two Playlab index sections. The six game records never move or migrate, so rollback has no route or content-data recovery step.