# Public assistant answer experience design

## Boundaries

- This task changes the public-assistant frontend, deterministic UI checks, the Markdown dependency, the relevant frontend code-spec, and the existing server cancellation boundary.
- The server's verified terminal result, citation projection, feedback/session contracts, RAG workflow, provider configuration, and deployment environment remain unchanged. The only server behavior change is to propagate visitor aborts and refuse persistence after cancellation.
- Structured rendering is a presentation layer over the already-allowlisted answer string. It does not parse citations from model text or make model-authored URLs authoritative.

## Safe Structured Content

Add `PublicAssistantMessageContent` as a focused rendering component loaded with `PublicAssistantWidget`.

- Use `markdown-to-jsx@9.9.0` to keep the lazy assistant chunk materially smaller than the initial `react-markdown` plus `remark-gfm` implementation.
- Disable raw-HTML parsing, HTML blocks, and automatic bare-URL links. Override `a`, `img`, and `input` so link/image labels remain readable but cannot navigate, load remote content, or create controls.
- Do not add `rehype-raw`, syntax-highlighting HTML, or a sanitizer bypass.
- Override semantic elements only for stable class names and the code-block copy control. Inline code remains inline; fenced code renders in a bounded `<pre>` region with an accessible copy button.
- Tables sit in a horizontally scrollable wrapper. Headings remain message-scale and cannot introduce page-level hero typography.
- User messages remain normalized plain text; only assistant answers use structured rendering.

## Cancellation State

Keep one active request metadata ref beside the existing `AbortController`:

```ts
interface ActiveChatRequest {
  controller: AbortController
  prompt: string
  mode: PublicAssistantMode
  sessionId: string
}
```

- Silent cancellation (`new conversation`, history restore, unmount) aborts and clears state without a notice.
- Explicit visitor cancellation aborts the same controller, clears loading/progress, and sets `public-assistant-request-cancelled` with the captured prompt/mode so the existing retry path can resubmit it.
- The async completion fence continues to require both the active controller and captured session. An aborted request cannot append a local fallback or late answer.
- The server Responses adapter rethrows an externally aborted signal instead of converting it into a provider fallback. The request runner checks the signal before execution and again before persistence, so a disconnected request cannot create a fallback turn.
- While loading, the composer command becomes a standard stop icon/button instead of a disabled send button.

## Structured Feedback

- Thumbs-up submits `rating=up, reason=helpful` immediately.
- Thumbs-down opens one message-scoped reason group. The only values are `incorrect`, `unclear`, `missing-sources`, `outdated`, and `other`.
- Selecting a reason calls the existing `submitPublicAssistantFeedback`; there is no new API shape.
- One menu may be open at a time. Escape closes it before history or the assistant closes and restores focus to the owning thumbs-down control.
- Success closes the selector and marks the message. Failure keeps the selector visible with the existing low-sensitive failure state so the same reason can be retried.

## Accessible Message Surface

- The conversation container becomes a labeled `role="log"` with `aria-busy` tied to the active request.
- Visual progress may change by stage without repeatedly entering a live region. A single concise live message announces start and completion/cancellation.
- The feedback reason group has an explicit label; all copy/stop/feedback controls retain icon-button labels and 44px mobile targets.

## Performance And Rollback

- The Markdown dependency stays behind the existing lazy `PublicAssistantWidget` import. Run build performance checks and inspect the assistant chunk delta.
- Rollback can restore plain text rendering and remove the dependency without changing persisted answers or server contracts.
- Cancellation and feedback are frontend-only extensions of existing API behavior and can be removed independently.
