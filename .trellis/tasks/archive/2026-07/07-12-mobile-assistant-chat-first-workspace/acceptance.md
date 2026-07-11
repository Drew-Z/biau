# Acceptance: Mobile Assistant Chat-First Workspace

## Outcome

- At 390x900 the conversation workspace moved from approximately y=934 to y=136.
- Mobile renders the conversation, suggestions, and composer before runtime cards and secondary controls.
- The existing member/sidebar subtree becomes a modal drawer without duplicating token, session, or memory state.
- The drawer retains member access, history, durable memory, and the administrator entry.
- Desktop retains the static three-column workspace.

## Interaction Evidence

- Mobile widths checked: 320px, 390px, and 430px.
- Open focuses the drawer close button and locks root scrolling.
- Tab/Shift+Tab remains in the drawer.
- Escape, backdrop, and close button dismiss the drawer and restore trigger focus.
- Global navigation is suppressed while the modal is open, preventing toolbar overlap.
- Drawer and page remain within viewport bounds without horizontal overflow.

## Verification

- `npm.cmd run lint` - passed
- `npm.cmd run build` - passed
- `npm.cmd run performance:check` - passed (`CSS 205901 / 240000`, `JS 385135 / 430000`)
- `npm.cmd run check:ui` - passed after adding desktop and 320/390/430px interaction coverage
- `git diff --check` - passed
- `python ./.trellis/scripts/task.py validate ./.trellis/tasks/07-12-mobile-assistant-chat-first-workspace` - passed

## Visual Evidence

- Before: `C:\Users\zhang\AppData\Local\Temp\assistant-mobile-before.png`
- Chat first: `C:\Users\zhang\AppData\Local\Temp\assistant-mobile-chat-first-final.png`
- Drawer: `C:\Users\zhang\AppData\Local\Temp\assistant-mobile-drawer-final.png`