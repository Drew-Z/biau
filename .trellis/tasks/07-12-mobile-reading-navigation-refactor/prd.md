# Mobile reading and navigation refactor

## Goal

Replace the mobile homepage horizontal project rail with a vertical port manifest and make blog/project detail pages fully readable across narrow phone viewports.

## Evidence

- At 390px the homepage carousel track is about 1,771px wide and intentionally exposes partial cards; the user finds this visually unclear.
- `/blog/legal-rag-review` renders about 6,965px of content and `/projects/legal-rag` about 9,694px at 390px.
- The detail routes do not currently create page-level horizontal overflow, but `.app` computes to `overflow: hidden auto` because `overflow-x: hidden` promotes the other axis to `auto`; this creates an unnecessary root-like nested scroll boundary in mobile WebViews.
- Full-page captures show dense card-inside-card composition and small text across long detail pages, making the entire reading flow difficult to scan even when individual blocks fit the viewport.
- The saved reference site uses a clear vertical mobile project manifest and a more continuous reading rhythm. Its bottom navigation and brand content remain inappropriate to copy.

## Requirements

- Replace the mobile horizontal project rail with one vertical list containing each project exactly once.
- Keep full-row navigation to project detail and a separate trailing external action; remove swipe/snap/partial-card cues on mobile only.
- Let the document own page scrolling by using clipping that does not create an implicit vertical scroll container.
- Flatten blog/project detail body composition on phones: keep meaningful media surfaces, but remove redundant nested panel borders/shadows from text sections.
- Increase mobile body readability through bounded line length, at least 15px primary text, comfortable line height, balanced headings, and safe wrapping.
- Keep code, tables, diagrams, and images inside their own width/overflow boundaries.
- Ensure the public assistant trigger and footer do not cover the final readable content.
- Preserve desktop carousel behavior, desktop detail composition, all routes, public content, and Harbor Intro behavior.
- Respect `prefers-reduced-motion` and retain existing theme/scene material differences.

## Acceptance Criteria

- [x] At 320px, 390px, and 430px the homepage project list is vertical, has no horizontal scrolling, shows six unique project rows, and leaves vertical panning to the document.
- [x] Mobile project rows fit the viewport with visible title, bounded summary, and operable detail/external actions.
- [x] `/blog/legal-rag-review` and `/projects/legal-rag` use document scrolling; `window.scrollTo({ behavior: 'auto' })` can reach the true bottom.
- [x] Both detail routes have no page-level horizontal overflow or visible descendant outside the reading viewport, excluding fixed decorative background layers.
- [x] Mobile detail primary text is at least 15px and text sections use a flattened continuous reading surface.
- [x] Mobile images, diagrams, code blocks, and tables stay within their owning content width.
- [x] Footer trust content and the final related-content section remain reachable and unobscured.
- [x] Desktop homepage carousel and desktop detail layouts keep their current behavior.
- [x] `lint`, `build`, `performance:check`, `check:ui`, and `git diff --check` pass.

## Out Of Scope

- Copying the reference site's bottom navigation.
- Removing project/blog content to shorten the pages.
- Hiding major sections behind accordions.
- Changing desktop information architecture or project data.
