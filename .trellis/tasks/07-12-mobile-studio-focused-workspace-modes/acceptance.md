# Acceptance: Mobile Studio Focused Workspace Modes

## Result

- Mobile Studio now defaults to a focused Edit mode and exposes Drafts/Edit/Support through a bounded sticky tab control.
- Existing list, editor, source, review, and publishing DOM/state are reused; mode changes do not clone or reset business state.
- Selecting, creating, or opening a review draft returns to Edit.
- Token controls remain before the workspace, while the long review guide follows it on mobile.
- Desktop keeps the original multi-column workspace and hides the mobile control.

## Evidence

- 390x900 rendered page height reduced from about 7,730px to about 5,252px in the default Edit mode.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- `npm.cmd run performance:check` passed: CSS 209,782/240,000 bytes; JS 385,135/430,000 bytes.
- `npm.cmd run check:ui` passed for the existing 14-route matrix plus Studio mode checks at 320px, 390px, 430px, and desktop.
- `git diff --check` passed.
- `task.py validate` passed.

## Residual Risk

The selected mode is intentionally ephemeral and resets to Edit on a full reload. Production Studio API availability is outside this responsive-layout task; the existing UI fixture covers loaded draft and review behavior without exposing credentials.