# Design: Mobile Project Catalog Progressive Disclosure

`ProjectsPage` keeps the existing memoized project groups as the only catalog model and adds a typed `activeMobileGroup` state initialized to `ai`. Each group renders one semantic mobile toggle that writes this state and exposes `aria-expanded` plus `aria-controls`. The existing group heading remains the visible desktop label; project cards are not cloned.

At mobile widths, CSS hides non-active group grids through the semantic `hidden` contract and presents the three controls as a compact vertical navigation band. Desktop overrides the mobile controls and ensures all grids render independent of selection. Existing `ProjectCard` markup and callbacks remain unchanged; scoped mobile styles raise its command/link hit areas to 44px.

UI checks derive expected group counts from `projects`, exercise all three controls at 320px, 390px, and 430px, assert one visible grid, preserved ordering, height reduction, no overflow, and 44px actions. Desktop asserts all groups and all cards remain visible.