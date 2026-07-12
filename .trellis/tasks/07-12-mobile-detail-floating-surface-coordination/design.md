# Design: Mobile Detail Floating Surface Coordination

A small shared `mobileSurface` utility owns the typed custom event name and mobile-only announcement helper for `public-assistant` and `detail-reading-guide`. Components keep their local open state; the event coordinates visibility without introducing a global state library or coupling either component to route modules.

`PublicAssistantWidget` gains a root ref and numeric collision offset. A requestAnimationFrame-throttled effect observes scroll/resize/load and reconstructs the trigger's unshifted base rectangle from the current offset. It compares that base rect with `.detail-reading-guide__toggle`; only a positive two-axis intersection produces `baseBottom - guideTop + 8`. The root receives the offset through a CSS custom property and mobile detail-page transform. Open assistant, desktop, missing guide, or non-collision resolve to zero.

Opening either surface announces itself on mobile. The peer listens and closes, preserving existing local data. UI tests mock `/health`, exercise collision and mutual exclusion at 320/390/430px, verify the no-collision blog case, and assert desktop remains independent.