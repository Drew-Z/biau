# Design

## Scope

Modify:

- `scripts/check-assistant-meta-normalizers.ts`

## Approach

The frontend decoder in `src/data/assistant.ts` owns the browser boundary for `AssistantAnswerMetaSummary`. The backend smoke script already checks server-side artifact creation and sanitizer behavior. This task strengthens the local frontend metadata check so it covers more link forms and unsafe artifact shapes.

Add artifact fixtures to `check-assistant-meta-normalizers.ts`:

- safe id deep link: `/studio?draft=<id>`;
- safe slug deep link: `/studio?draft=<slug>`;
- legacy persisted link: `/studio`;
- safe link with extra query params, expected to normalize back to `/studio?draft=<id>`;
- mismatched id/href;
- external href;
- non-review-needed status or non-hidden visibility;
- extra secret-like fields, which should not survive serialization.

## Compatibility

No runtime code changes are expected unless the strengthened check reveals a gap. The task stays fully offline and is covered by `npm.cmd run assistant:meta-check`, which is already included in `npm.cmd run verify`.
