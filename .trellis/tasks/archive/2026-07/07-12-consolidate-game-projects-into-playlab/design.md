# Design: Consolidate Game Projects Into BIAU Playlab

Add `catalogProjects` beside the full `projects` export in `src/data/portfolio.ts`. It is a derived projection that filters out `category === 'interactive'`; the full array remains the authoritative registry for routes, SEO, assistant knowledge, Studio, recommendations, status mapping, and detailed evidence.

`ProjectsPage` imports `catalogProjects`, builds only `ai` and `fullstack` groups, and keeps the responsive single-open behavior from the previous mobile catalog task. Tests use `catalogProjects` for catalog expectations and `projects` for legacy route preservation, preventing the presentation projection from erasing deeper project identities.

BIAU Playlab gains two workflow sections. The first is a six-project index with differentiated focus/maturity statements and six internal links. The second is a unified Web-play index with six external links. Existing Playlab overview, screenshots, architecture, quality, limitations, roadmap, and assistant context remain intact.

No redirect or migration is required because legacy game ids and routes remain unchanged. Rollback is limited to removing the catalog projection and added Playlab sections.