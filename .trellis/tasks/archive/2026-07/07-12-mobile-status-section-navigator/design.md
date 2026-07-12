# Design: Mobile Status Section Navigator

A small `StatusSectionNavigator` component owns only ephemeral navigation state. It receives no reliability data and does not filter content. Six static section descriptors map public labels to stable section IDs already rendered by `SiteStatusPage`.

A passive scroll listener, throttled through `requestAnimationFrame`, updates the selected section against a reading line near the top fifth. This remains deterministic across sections with very different heights. The native select scrolls the chosen section into view with smooth behavior unless `prefers-reduced-motion: reduce` is active. CSS hides the component above 720px and makes it sticky, in-flow, safe-area aware, and full-width on mobile.