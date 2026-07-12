# Design

`Navigation` remains the owner of the stable route registry. Extend each route record with a Lucide icon and render a second semantic `<nav>` for mobile only. Route-family matching is explicit so nested detail routes activate their parent destination. The existing desktop center navigation remains unchanged.

CSS hides the bottom navigation by default and enables it below 720px as a fixed, safe-area-aware five-column bar. The top mobile menu button and panel are hidden in this mode. A shared `--mobile-tabbar-clearance` variable reserves document/footer space and lifts the public assistant above the bar. The tabbar uses BIAU's translucent panel tokens, restrained active color, and no horizontal scrolling.

UI regression checks inspect source-derived route labels/hrefs, target sizes, active state across route families, fixed bounds, safe-area clearance, assistant collision, footer reachability, and horizontal overflow at 320/390/430px. Desktop asserts inverse visibility.