# Consolidate Game Projects Into BIAU Playlab

## Goal

Make BIAU Playlab the single catalog-level game project on the public project page while preserving the six game detail routes as deeper Playlab case pages. Consolidate the discoverable game summaries, maturity boundaries, implementation evidence, and play paths into the BIAU Playlab detail page.

## Evidence

- `/projects` currently exposes BIAU Playlab in the full-stack/platform group and separately exposes six interactive game cards in a game group.
- The six entries are Tetris, Next Spacewar, intespace, Raiden Prototype, space-war, and Spacewar II.
- BIAU Playlab already explains the Astro content site, Godot Web separation, public endpoint checks, real screenshots, and six-game content model, but it does not provide a complete six-project index with internal detail and play links.
- The six standalone `Project` records drive detail routes, SEO, assistant context, related content, Studio tooling, and historical links. Deleting them would create regressions unrelated to catalog consolidation.
- The user approved retaining all six `/projects/:id` detail routes while removing their independent cards from the public catalog.

## Requirements

- Export a source-derived public catalog projection that excludes `interactive` child game records but retains BIAU Playlab and all non-game projects.
- `/projects` uses the catalog projection and removes the game group entirely. Mobile shows two vertical controls: AI applications and full-stack development. Desktop shows both groups and every catalog project.
- Do not delete the six game records, images, assistant context, SEO routes, detail content, or play/site links.
- Expand BIAU Playlab with a six-project index that states each title, gameplay/system focus, and maturity boundary without claiming equal completion.
- Add internal links from BIAU Playlab to all six retained project detail routes and external Web play links for all six games.
- Keep BIAU Playlab as the only catalog-level game entry and preserve its existing game-site, source, and article links.
- Update public catalog counts/text that explicitly describes six standalone main-site cards, while keeping Playlab/monitoring facts about six deployed games accurate.
- Update UI and content-quality checks so expectations derive from the catalog projection for `/projects` and from the full `projects` array for retained detail routes.
- Verify 320px, 390px, 430px, and desktop catalog behavior; verify every legacy game detail route and all Playlab child links.

## Out Of Scope

- Deleting the six game projects from the data model or Playlab repository.
- Rewriting the separate Astro Playlab site.
- Changing game binaries, deployment, screenshots, or public endpoint configuration.
- The separate mobile blog-card touch-target follow-up.

## Acceptance Criteria

- [x] `/projects` shows no standalone game group or standalone game cards.
- [x] BIAU Playlab is the only catalog-level game product and remains in the full-stack/platform group.
- [x] Mobile exposes exactly two complete vertical group controls and one visible group at a time; desktop exposes both groups.
- [x] All non-interactive catalog projects appear exactly once and catalog counts are source-derived.
- [x] BIAU Playlab detail names all six games, describes distinct focus/maturity, links all six retained detail pages, and links all six Web play entries.
- [x] All six legacy `/projects/:gameId` routes still render their original content and remain SEO-addressable.
- [x] Assistant, Studio, related-content, status, and detail consumers retain the full project dataset.
- [x] `lint`, `build`, `performance:check`, `project-details:check`, `check:ui`, and `git diff --check` pass.