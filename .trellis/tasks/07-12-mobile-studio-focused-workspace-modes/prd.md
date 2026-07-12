# Mobile Studio Focused Workspace Modes

## Goal

Turn the 7,700px stacked mobile Studio into a focused authoring workflow while preserving every draft, editor, source, review, and publishing control.

## Evidence

- At 390x900 `/studio` is about 7,730px tall.
- The draft list begins around y=1,810, the main editor around y=2,575, sources around y=5,270, and review tools around y=6,033.
- Desktop grid areas are currently collapsed into one long mobile column without a task-level navigation model.
- The reference site uses explicit compact mode switching for dense mobile workspaces; this task adapts that principle without copying its bottom navigation or visual identity.

## Requirements

- Keep token connection visible before the workspace.
- Add a mobile-only three-mode control: Drafts, Edit, Support.
- Reuse the existing list, editor, and side-stack DOM/state; do not duplicate forms or data.
- On mobile show only the active grid area; desktop continues to show all three columns.
- Default to Edit so the primary creation task is immediate.
- Selecting an existing draft, creating a new draft, or opening a review draft switches mobile mode to Edit.
- Move the long review guide after the focused workspace on mobile while preserving it and its actions.
- Keep each mode button at least 44px, bounded at 320/390/430px, keyboard accessible, and free of horizontal overflow.

## Acceptance Criteria

- [x] Mobile renders exactly one of Drafts, Edit, or Support at a time.
- [x] Mode controls expose selected state and switch without losing form state.
- [x] Selecting/creating/opening a draft switches to Edit and keeps the selected draft.
- [x] Token controls stay before the workspace; review guidance stays available after it.
- [x] Desktop hides mode controls and keeps all grid areas visible.
- [x] Existing Studio review, source, preview, and publishing controls remain rendered in their modes.
- [x] `lint`, `build`, `performance:check`, `check:ui`, and `git diff --check` pass.