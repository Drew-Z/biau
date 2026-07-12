# Research

- Reference mobile reading uses a bottom-sheet TOC with 44px targets and safe-area padding, but BIAU already reserves the bottom edge for tab navigation and the public assistant.
- The reusable reference principles are bounded text measure, compact headers, consolidated controls, and flat editorial body surfaces.
- Current 390x844 geometry: home first action y=452; projects first group y=325; blog first article y=464; all audited routes have zero horizontal overflow.
- Current detail pages already use natural document scrolling and flat body sections; preserve that foundation.

## Implementation Result (2026-07-12)

- Consolidated mobile blog column and search controls into one two-column discovery surface.
- Removed the mobile projects-grid frame so project cards are the only repeated primary surfaces.
- Moved first useful entries to measured boundaries: home about 375px, projects 292px, blog 394px at 390x844 after fonts load.
- Replaced viewport-scaled detail title sizing with fixed 32px/34px breakpoints.
- Verified 320/390/430px controls, no overflow, light garden and dark stellar screenshots.
- Updated UI regression checks for entry positions, touch sizes, flat project grouping, and reachable assistant/reading-guide coordination.
