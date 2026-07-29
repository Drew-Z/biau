# Public assistant edit and resend branching

## Goal

Add Codex-style editing and resending for user questions while preserving immutable answers and saved conversation branches.

## Requirements

- Every persisted visitor question exposes an explicit edit command. Assistant answers do not expose that command.
- Editing happens inline at the original user message and pre-fills the complete original question.
- The visitor can cancel without changing the conversation or submit the edited question using the currently selected research mode.
- Submitting an edited historical question creates a new immutable conversation branch from the edited Turn's parent Revision. It must not mutate the old Turn or reuse answer-regeneration semantics.
- Editing the first question starts a new root Branch with a null parent. Editing a later question forks from that Turn's `parentRevisionId`.
- After a successful generation, the widget hydrates the authoritative Session path returned by the API so descendants from the old Branch cannot remain visible.
- The old Branch remains saved and selectable through the existing Branch control.
- Editing and duplicate submission are unavailable while restore, Branch switching, or generation work is active.
- Empty or unchanged questions cannot be submitted. Existing public-assistant message length limits remain enforced.
- Desktop and mobile controls use accessible names, tooltips, visible focus, keyboard cancellation, and at least 44px touch targets on mobile.
- No fixture or verification step may call a real model, web search, embedding, reranker, or vector database.

## Constraints

- Reuse the existing `new-turn` generation intent and immutable Branch/Revision model. Do not add a new database schema or API intent.
- Keep opaque Turn and Revision identifiers as explicit typed fields; do not recover ids by parsing display ids.
- Continue treating normalized Session history as the visible conversation source of truth.
- Use existing class-based CSS, design tokens, and Lucide icons.

## Acceptance Criteria

- [x] A persisted user message exposes an `编辑问题` command and enters an inline editor with its original text focused.
- [x] Cancel and `Escape` restore the original message and focus without sending a request or closing the assistant.
- [x] Editing the first question sends `new-turn` with `branchId: null` and `parentRevisionId: null`.
- [x] Editing a later question sends `new-turn` with the active Branch id and the edited Turn's original `parentRevisionId`.
- [x] The edited text and selected mode are sent, while unchanged/blank content cannot be submitted.
- [x] A successful edit-and-resend replaces the visible path from authoritative Session history; stale descendants are absent.
- [x] The prior Branch remains available and can be selected to restore the original path.
- [x] Pending work disables edit/resend and prevents same-tick duplicate requests.
- [x] UI fixtures cover desktop behavior plus 320px, 390px, and 430px containment and 44px mobile targets.
- [x] Public assistant API, conversation, UI, lint, build, and whitespace checks pass without live provider calls.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
