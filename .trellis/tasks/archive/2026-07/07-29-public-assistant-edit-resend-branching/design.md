# Design: Public assistant edit and resend branching

## Decision

Treat editing a sent visitor question as an immutable fork, matching the existing conversation model. The UI does not overwrite a persisted Turn. It sends a `new-turn` request whose parent points to the Revision immediately before the edited Turn; the server creates and activates a new Branch when that parent is not the current Branch head.

## Data flow

1. `projectConversationMessages()` projects each persisted user message with opaque `turnId` and `parentRevisionId` metadata.
2. The user selects `编辑问题`; the widget copies the question into local editor state and restores the message's original request mode as the starting selection.
3. Submit validates the edited value and builds an existing `new-turn` intent:
   - root Turn: `{ branchId: null, parentRevisionId: null }`
   - later Turn: `{ branchId: activeBranchId, parentRevisionId: target.parentRevisionId }`
4. The normal stream/JSON generation path persists a new Turn and Branch.
5. On success, the widget reloads Session history and hydrates the normalized authoritative path. Local optimistic messages never define ancestry.
6. Existing Branch selection remains the way to return to the old path.

## Component state

Keep local UI state inside `PublicAssistantWidget`:

- `editingTurnId: string | null`
- `editingQuestion: string`
- a ref for the edit trigger so cancel/Escape can restore focus

Only one message can be edited at a time. Starting a new conversation, restoring history, closing the widget, Branch changes, or generation completion clears the editor safely.

## Submission boundary

Extend the existing submit helper with an optional typed generation-intent override rather than duplicating transport code. The same UUID, cancellation, progress, retry, SSE decoding, and Session refresh rules continue to apply.

An edited historical Turn must not use `answer-revision`: that intent intentionally restores the persisted original question and only regenerates an assistant Revision.

## Rendering and accessibility

- Add a Lucide pencil command to persisted user messages only.
- Replace that message body with a bounded inline form while editing.
- Provide explicit cancel and resend commands; `Escape` cancels before dialog-level Escape handling.
- The textarea is labelled, focused on entry, and constrained to the message width.
- Mobile controls are at least 44px and may wrap vertically; the message editor never widens the conversation panel.

## Failure behavior

- Validation errors remain local and do not start transport.
- A failed generation keeps the editor/question recoverable through the existing retry model and does not mutate the old Branch.
- If authoritative Session refresh fails after persistence, retain the current readable path and existing recovery issue behavior rather than constructing Branch ancestry locally.

## Compatibility and rollback

No migration or server-contract change is required. Rollback removes the projected metadata and inline editor while leaving persisted Branches and API behavior untouched.
