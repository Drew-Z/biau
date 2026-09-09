# 公开助手公共界面语言

## Goal

Localize the fixed public assistant interface so the selected site language remains coherent after opening the assistant, while preserving authored questions and answers, citation facts, session state, request behavior, and all production boundaries.

## Requirements

- Use the existing `SiteLanguage` context and one typed `publicAssistantInterfaceCopy` record; do not create another preference state or make language a dependency of assistant requests, warm-up, history, branch, revision, or feedback effects.
- Translate fixed interface copy only: launcher/header/status labels, history and dialog controls, mode labels, loading/recovery/retry copy, branch/revision/feedback controls, citation chrome, image/composer controls, accessible names, and Markdown code/table chrome.
- Keep user questions, assistant answers, suggestion prompts, branch previews, history titles, citation titles/sections/excerpts/URLs, claim text, raw error codes, and approved model metadata unchanged. Any retained authored or payload text must keep its existing language semantics.
- Preserve public assistant product identity, request payloads, abort/sequence behavior, session persistence, draft/image behavior, branch/revision state, focus restoration, fullscreen/mobile collision behavior, and route/history state.
- Extend the existing language UI checker with a deterministic public assistant fixture covering both languages, 320/390/430/1440 widths, three themes, a restored rich session, loading/recovery/error controls, citation/revision/feedback chrome, and zero non-local/model requests.

## Constraints

- Owned code is limited to `src/data/publicAssistantInterfaceCopy.ts`, `src/components/PublicAssistantWidget.tsx`, `src/components/PublicAssistantLauncher.tsx`, `src/components/PublicAssistantMessageContent.tsx`, `src/utils/publicAssistantPresentation.ts`, and the existing language UI checker/fixture records required for this route.
- Do not modify assistant API contracts, conversation/session/browser-state utilities, server code, assistant knowledge/content data, citation payloads, SEO output, CSS layout, production readiness records, the protected status snapshot, or real model/Feed/Cron behavior.
- Keep all existing 44px, focus, modal layering, reduced-motion, mobile viewport, and local-network contracts intact.

## Acceptance Criteria

- [ ] English exposes English fixed assistant interface copy across launcher, dialog, history, modes, loading/recovery, branch/revision, feedback, citation chrome, and composer; Chinese restores the existing Chinese fixed copy.
- [ ] Authored questions/answers/suggestions and citation/branch/history payload snapshots remain byte/text identical across language switches; no payload or request count changes occur.
- [ ] Language changes keep the assistant panel, history layer, session, draft, branch/revision selection, focused trigger, URL/history, and DOM identity stable.
- [ ] Public assistant language checks pass at four widths and three themes with no overflow/control-size regression and zero model or non-local API calls.
- [ ] `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run language:ui`, the existing public assistant/full UI checks, `npm.cmd run check:ui:smoke`, and `git diff --check` pass; the protected status snapshot is unchanged.

## Notes

- The source audit found fixed Chinese copy throughout the public assistant shell, while content and payload values are mixed authored/approved data. This task deliberately separates UI labels from those values.
- Existing public assistant browser fixtures already cover warm-up, restore, history, branch/revision, citations, image, feedback, cancellation and mobile/fullscreen behavior; the new language assertions should reuse them rather than add another request mock.\n
