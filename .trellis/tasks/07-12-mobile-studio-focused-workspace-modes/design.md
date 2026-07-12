# Design: Mobile Studio Focused Workspace Modes

`StudioPage` adds one local `mobileWorkspaceView` union (`drafts | editor | support`). A mobile-only tablist before `.studio-grid` controls a `data-mobile-view` attribute on the existing grid. CSS at 720px displays only the matching existing grid child; desktop ignores the attribute and keeps all areas visible.

Draft-selection and creation actions call the existing logic and then set the mobile view to `editor`. No form, API state, selected draft, preview, source list, or review queue is cloned. Mobile flex ordering places `.studio-grid` before `.studio-review-guide`, while the token control remains before both. The selected tab uses `aria-selected`, `aria-controls`, and stable panel IDs.