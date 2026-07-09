# Assistant admin refresh ergonomics

## Goal

Reduce confusion on `/assistant/admin` by making admin data refreshes feel like one coherent workspace refresh instead of several disconnected buttons.

## Requirements

- Add a clear refresh-all action that reloads low-sensitive admin summary, member list, invite list, internal knowledge documents, RAG status, and usage list when an admin token is present.
- After saving an admin token, trigger the same refresh-all path so stored/just-entered tokens populate the page without requiring users to discover each tab's refresh button.
- After member model channel or member status updates, refresh the summary and member list so channel assignments and member counters do not appear stale.
- After internal knowledge sync or public RAG sync, refresh the related low-sensitive RAG/knowledge state without exposing RAG URL, tokens, raw responses, or document secrets.
- Preserve existing per-tab refresh buttons for targeted troubleshooting.
- Do not call model providers or perform live model tests.

## Acceptance Criteria

- [x] `/assistant/admin` includes a single visible refresh-all action near the API connection summary.
- [x] Saving an admin token uses the same refresh-all flow.
- [x] Member updates no longer require a separate manual refresh to reconcile the member list and summary.
- [x] Knowledge/RAG sync updates the relevant status blocks with low-sensitive data.
- [x] `npm.cmd run lint` passes.
- [x] `npm.cmd run build` passes.
- [x] `npm.cmd run assistant:admin-check` passes.

## Notes

- This is a frontend ergonomics slice. Real production admin token validation remains a browser/manual gate.

## Completion Notes

- Added a visible "刷新全部状态" action on `/assistant/admin` that refreshes admin summary, members, invites, internal knowledge, RAG status, and usage.
- Saving an admin token now uses the same refresh-all path; clearing a token resets stale local admin data.
- Member channel/status updates, invite changes, internal knowledge saves/syncs, and public RAG sync now refresh the related low-sensitive state.
- Verified `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run assistant:admin-check`, and `npm.cmd run check:ui` with local preview.
