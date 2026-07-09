# Assistant manual queue knowledge eval

## Goal

Make the public assistant's local knowledge and offline eval cover the wake-up manual queue, including the internal assistant admin refresh-all/member-channel review path.

## Requirements

- Update the safe `site:status` public knowledge summary so assistant answers can mention the current recommended manual queue.
- Add or extend offline RAG eval coverage for "what should I do next manually" style questions.
- Ensure the answer stays low-sensitive and mentions forbidden secret classes.
- Regenerate assistant knowledge artifacts.
- Do not call live models.

## Acceptance Criteria

- [x] `scripts/evaluate-assistant-rag.ts` includes a wake-up/manual-queue eval case.
- [x] `npm.cmd run assistant:index` passes.
- [x] `npm.cmd run assistant:eval` passes with `modelCalls=0`.
- [x] `npm.cmd run lint` passes.
- [x] `npm.cmd run build` passes.

## Notes

- The assistant should recommend manual actions without asking for or printing real tokens, keys, database URLs, model endpoints, or private credentials.

## Completion Notes

- Added public assistant vocabulary for wake-up/manual-queue questions: `手动处理`, `下一步`, `醒来`, `明早`, `刷新全部状态`, and `成员模型渠道`.
- Updated the `reliability-status` fallback answer so it names the low-sensitive manual queue while explicitly excluding token, password, database URL, model-channel secrets, and signing material.
- Regenerated public assistant knowledge artifacts.
- Verified `npm.cmd run assistant:eval` passed with `modelCalls=0`; no live model/provider checks were run.
- Ran `git diff --check` and a changed-file sensitive-value scan; no sensitive value matches were found.
