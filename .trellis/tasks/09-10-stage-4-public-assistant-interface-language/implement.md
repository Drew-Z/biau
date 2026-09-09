# 公开助手公共界面语言实施计划

1. Add the typed `publicAssistantInterfaceCopy` module with fixed Chinese defaults and English projections; keep approved/authored payload data out of it.
2. Thread the selected copy through `PublicAssistantWidget`, `PublicAssistantLauncher`, `PublicAssistantMessageContent`, and recovery/meta/date helpers without changing request or effect dependencies.
3. Extend the existing language UI checker with a local rich-session assistant fixture and language/immutability/request/layout assertions; reuse the current full assistant browser contracts.
4. Run a negative old-build assertion for a representative English launcher/status label, then run lint, build, language UI, public assistant/full UI, smoke, performance, and diff checks.
5. Review representative 320px English and 1440px Chinese assistant screenshots, inspect the exact staged file list, commit locally with signing disabled, archive only this child with `--no-commit`, force-track its exact archive directory, update the parent loop, and preserve unrelated files.

## Owned files

- `src/data/publicAssistantInterfaceCopy.ts`
- `src/components/PublicAssistantWidget.tsx`
- `src/components/PublicAssistantLauncher.tsx`
- `src/components/PublicAssistantMessageContent.tsx`
- `src/utils/publicAssistantPresentation.ts`
- `scripts/check-site-language-ui.mjs` and focused local fixture records
- this child task's records and the parent assessment/remaining-gates records

## Forbidden files

- `src/utils/publicAssistantApi.ts`, `src/utils/publicAssistantConversation.ts`, `src/utils/publicAssistantBrowserState.ts`
- `src/data/assistant.ts`, approved citation/content data, server routes and model relay code
- `src/App.tsx`, route URLs, SEO output, CSS/layout files, dependencies, production readiness records, and `public/status/blog-semi-synthetic.json`\n
