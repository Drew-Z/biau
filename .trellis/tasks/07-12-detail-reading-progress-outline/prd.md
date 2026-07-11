# Detail Reading Progress And Outline Navigation

## Goal

Absorb the reference site's long-form reading orientation into BIAU Port as an accessible sticky progress and section-outline guide for blog and project detail routes.

## Evidence

- The saved reference site includes a dedicated long-form reading rail with progress and section navigation.
- The main site's Legal RAG blog detail is roughly 6,600px tall and its project detail is roughly 9,400px tall at 390px after the mobile reading refactor.
- The previous task made the pages readable and reachable, but visitors still cannot see their current chapter or jump between major sections without manually scanning the entire page.
- Fixed side rails and mobile bottom tab bars would either overlap the current 1,200px detail shell or conflict with BIAU Port's public assistant and footer.

## Requirements

- Add one shared reading guide component used by both public blog and project detail routes.
- Show current major section and whole-document reading progress without requiring the outline to be open.
- Provide a toggleable semantic outline whose links map to deterministic section ids rendered by the page.
- Keep the guide sticky inside the detail page flow rather than creating another fixed viewport overlay.
- Close the outline after navigation and support `Escape`, outside click, keyboard focus, and standard anchor semantics.
- Respect `prefers-reduced-motion` when scrolling to a section.
- Generate blog outline entries from optional knowledge/scenario/checklist/takeaway blocks, article sections, related projects, and related readings.
- Generate project outline entries from overview blocks, available case-study groups, related readings, and related projects.
- Keep loading and missing-detail states free of an empty reading guide.
- Preserve document-owned vertical scrolling, existing routes, desktop/mobile detail layout, footer reachability, and assistant behavior.
- Do not copy the reference brand, bottom tab bar, sound controls, tint lab, wording, or proprietary assets.

## Acceptance Criteria

- [x] `/blog/legal-rag-review` and `/projects/legal-rag` render a visible sticky reading guide with a progressbar and a collapsed outline.
- [x] The outline contains only existing section targets, uses unique deterministic ids, and has at least five major entries on both representative routes.
- [x] Opening, closing, outside click, and `Escape` work with correct `aria-expanded` state.
- [x] Selecting an outline link scrolls to the target, closes the outline, and updates the current-section label.
- [x] Progress rises when the document scrolls and reaches at least 95% at the true page bottom.
- [x] At 320px, 390px, 430px, and desktop widths the guide and open outline stay inside the viewport with no page-level horizontal overflow.
- [x] The guide remains usable with reduced motion and does not obscure the footer or public assistant.
- [x] Loading and missing routes do not render the guide.
- [x] `lint`, `build`, `performance:check`, `check:ui`, and `git diff --check` pass.

## Out Of Scope

- A persistent fixed desktop sidebar outside the current content shell.
- A mobile bottom navigation bar.
- Per-heading deep links below the major-section level.
- Rewriting article or project content.
