# 公开助手公共界面语言设计

## Copy boundary

`publicAssistantInterfaceCopy` is the only new language source. It owns fixed labels and small formatter functions for `zh` and `en`: launcher/service state, mode and route labels, status/meta labels, progress/recovery/retry copy, dialog/history controls, branch/revision/feedback controls, citation chrome, image/composer controls, and accessibility names.

`PublicAssistantWidget` reads `useSiteLanguage()` once and projects that record through pure render helpers. `PublicAssistantLauncher` and `PublicAssistantMessageContent` read the same context directly. The copy module may expose typed maps for API enums, but it must not translate payload values or mutate request inputs.

## State and DOM contracts

- Language changes do not enter any request, warm-up, history, branch, revision, draft, or feedback dependency list.
- The trigger, panel, history dialog, message log, citation anchors, revision toolbar and composer remain connected across a language switch; URL/history and local session storage are unchanged.
- Existing `PUBLIC_ASSISTANT_NAME` remains the product identity. Authored question/answer/suggestion/citation text remains untouched and uses its existing language semantics; only surrounding fixed labels receive the selected language.
- Date formatting uses the selected UI locale while preserving the timestamp and numeric values. Recovery labels remain derived from the existing normalized recovery metadata.

## Verification shape

Add `checkPublicAssistantInterfaceLanguage` to `language:ui`. Reuse the local assistant fixture already used by `check-ui.mjs`, seed a rich persisted session, and compare snapshots before and after switching `zh -> en -> zh`. Assert translated fixed labels, authored/payload immutability, connected DOM nodes, no extra requests/model calls, stable URL/history, persistence after reload, and existing 44px/containment contracts at 320/390/430/1440 across morning/nature/stellar.

## Rollback

Revert the copy module, the three assistant component projections, recovery formatter changes, and focused language checker additions. No API, server, data, CSS, or production rollback is required.\n
