# Public assistant answer experience

## Goal

Make public-assistant answers comfortable to read and controllable like a finished product: render verified output as safe structured content, let visitors stop a long request, collect useful feedback reasons, and expose coherent message semantics to assistive technology.

## Confirmed Facts

- `PublicAssistantWidget` currently renders every user and assistant body as one plain `<p>` with `white-space: pre-wrap`; Markdown headings, lists, tables, emphasis, and code fences therefore remain visually unstructured.
- The server already returns a verified terminal answer plus separate allowlisted citations and claims. Rich rendering must not create a second citation or trust boundary.
- The widget owns an `AbortController`, but visitors can reach it only indirectly by starting a new conversation or opening history. While a request is active, the send button is disabled and there is no explicit stop action.
- Feedback supports bounded reason values, but the current thumbs-down path always submits `other`, which produces little quality signal.
- The assistant is lazy-loaded, so dependency and bundle growth remain measurable; mobile 320/390/430 layout and the soft-keyboard-safe composer must not regress.

## Requirements

- R1. Render assistant answers with a safe structured-text surface supporting paragraphs, headings, ordered/unordered lists, emphasis, blockquotes, tables, inline code, and fenced code blocks.
- R2. Raw HTML, images, scripts, iframes, forms, style injection, and arbitrary model-authored navigation must never render. Verified citation cards remain the only authoritative clickable evidence links.
- R3. Code blocks provide bounded horizontal scrolling and a copy-code command with an accessible label; long tokens and tables remain inside the message width at 320px.
- R4. While a chat request is active, replace the send command with an explicit stop command. Stopping aborts the active transport end to end, does not create or persist a fallback answer, retains the visitor question, clears progress, and exposes a concise retry affordance.
- R5. Starting a new conversation, opening history, or unmounting remains a silent abort and must not show the visitor-initiated cancellation notice.
- R6. Thumbs-up may submit `helpful` directly. Thumbs-down first opens a compact, keyboard-accessible reason selector using the existing bounded reasons `incorrect`, `unclear`, `missing-sources`, `outdated`, and `other`; no free-form feedback text is introduced.
- R7. Feedback pending, success, failure, and selected state remain scoped to the owning assistant message. The selector closes after success, on Escape, or when another response is selected.
- R8. The message region exposes log/busy semantics without announcing every progress repaint or duplicating the existing concise completion announcement.
- R9. No model, search, embedding, reranker, vector database, Render, or Cloudflare configuration changes are part of this task. Deterministic validation uses fixtures only.

## Acceptance Criteria

- [x] Representative Markdown fixture content renders as headings, lists, emphasis, table, inline code, fenced code, and blockquote without raw Markdown punctuation or injected HTML.
- [x] Model-authored Markdown links/images/HTML cannot create clickable or executable content; verified citation cards still navigate correctly.
- [x] Code/table/long-token fixtures remain horizontally contained at desktop and 320/390/430 widths, and code can be copied with keyboard-accessible controls.
- [x] A visitor can stop an in-flight request; no late answer or persisted/local fallback appears, the existing question remains, and retry is available without duplicating that question or its history input.
- [x] New conversation/history/unmount abort paths remain silent and cannot leak a cancellation notice into the next session.
- [x] Negative feedback requires one structured reason and submits that exact allowlisted value; Escape/failure/retry behavior is visible and keyboard accessible.
- [x] The message list exposes coherent log/busy semantics and existing full-screen focus, history, scrolling, and soft-keyboard checks remain green.
- [x] Lint, build, public API/service smoke, and targeted Playwright checks pass without live provider probes.

## Out Of Scope

- Changing prompts, the LangGraph workflow, retrieval, model selection, web-search providers, or citation verification.
- Streaming unverified model tokens directly to the browser.
- Free-form feedback comments, login-based preferences, or cross-device synchronization.

## Product Decision

- Model-authored Markdown links and images are unwrapped to non-clickable text. Only allowlisted citation cards may navigate, preserving one evidence boundary.

