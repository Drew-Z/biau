# Assistant admin runbook refresh path

## Goal

Update the production runbook so the user can use the improved `/assistant/admin` refresh workflow without guessing which tab-specific button to click.

## Requirements

- Document the new "刷新全部状态" path after saving `ADMIN_TOKEN`.
- Keep the RAG/internal knowledge synchronization steps accurate, but make the first path simpler.
- Add a short member model-channel check path because member/channel assignment is one of the current manual follow-ups.
- Preserve low-sensitive boundaries: no real token, model endpoint, database URL, RAG URL, provider key, or private document content.
- Run the existing manual-gates documentation guard.

## Acceptance Criteria

- [x] `docs/internal-rag-studio-ai-daily-runbook.md` mentions "刷新全部状态".
- [x] The runbook still clearly explains when to use targeted "刷新 RAG 状态" / "刷新知识".
- [x] Member model-channel assignment validation has a low-sensitive browser check path.
- [x] `npm.cmd run docs:manual-gates-check` passes.

## Notes

- This is documentation-only and does not change production credentials or platform state.

## Completion Notes

- Updated the Internal RAG runbook to use "刷新全部状态" after saving `ADMIN_TOKEN`.
- Kept targeted RAG/knowledge refresh steps as troubleshooting tools.
- Added a low-sensitive member model-channel verification path that avoids exposing model keys, base URLs, provider responses, or real tokens.
- Verified `npm.cmd run docs:manual-gates-check`.
