# Mobile Assistant Chat-First Workspace

## Goal

Make the internal assistant usable as a chat product on the first mobile viewport while preserving complete member access, history, memory, administration, and Agent evidence controls.

## Evidence

- At 390x900 the current `.assistant-main` begins around y=934, after the full desktop sidebar is stacked above it.
- The mobile page exposes invite/member state, history, memory, and admin navigation before the primary conversation workspace.
- The read-only reference site keeps the primary page task visible and moves secondary controls into an explicit dismissible drawer.

## Requirements

- At widths up to 920px, render the conversation workspace before the sidebar content.
- Add one clear mobile-only workspace-controls button near the conversation heading.
- Present member access, history, memory, and admin navigation in an accessible modal drawer; do not delete or duplicate their stateful forms.
- The drawer must have a backdrop, close button, Escape handling, focus restoration, modal semantics, safe-area spacing, and bounded internal vertical scrolling.
- Lock document scrolling while the drawer is open and restore it on close/unmount.
- Keep the existing desktop three-column layout and all member/session/memory behavior unchanged.
- Keep Agent diagnostics after the core chat on mobile; do not hide evidence or runtime details.
- Avoid horizontal overflow and keep controls at least 44px at 320/390/430px.

## Acceptance Criteria

- [x] At 320px, 390px, and 430px the assistant main workspace begins in the first viewport before sidebar controls.
- [x] The mobile controls button opens a modal drawer containing member access, history, memory, and admin navigation.
- [x] Backdrop click, close button, and Escape dismiss the drawer and restore focus to the trigger.
- [x] The document is scroll-locked only while the drawer is open.
- [x] Desktop keeps the static sidebar and hides all mobile drawer controls.
- [x] Existing assistant functionality and Agent diagnostics remain available.
- [x] `lint`, `build`, `performance:check`, `check:ui`, and `git diff --check` pass.

## Out Of Scope

- Changing assistant APIs, token storage, RAG behavior, models, or permissions.
- Replacing the desktop three-column workspace.
- Copying the reference site's bottom navigation, branding, or proprietary assets.