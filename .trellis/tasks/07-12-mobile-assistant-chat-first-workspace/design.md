# Design: Mobile Assistant Chat-First Workspace

`AssistantPage` keeps one sidebar DOM subtree so member, session, and memory state is never duplicated. A mobile-only trigger in the main header toggles the existing sidebar into a fixed modal drawer at `max-width: 920px`; desktop continues to render it as the first static grid column.

On mobile CSS orders `.assistant-main` first, `.assistant-sidebar` second, and `.assistant-inspector` third. The sidebar becomes a right-side sheet with a full-viewport backdrop, `role="dialog"`, `aria-modal`, and `aria-labelledby`. Closed state uses visibility, opacity, pointer-events, and transform rather than unmounting forms. The page effect listens for Escape, locks `document.documentElement` overflow, focuses the close button on open, and restores the trigger on close.

The drawer owns vertical scrolling with `max-height: 100dvh`, safe-area padding, and overscroll containment. At desktop widths the backdrop/close control are hidden and modal-only styles are neutralized.