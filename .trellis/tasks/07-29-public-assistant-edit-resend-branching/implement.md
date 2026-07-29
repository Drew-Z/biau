# Implementation plan

## 1. Conversation projection and submission

- Add typed Turn/parent metadata to persisted user message projections.
- Refactor the existing submit path to accept an optional `new-turn` parent override.
- Build root and non-root edit intents from the selected user message.
- Reuse authoritative Session hydration after a successful edited generation.

## 2. Inline edit interaction

- Add single-message edit state and focus restoration.
- Render a Lucide edit command on eligible user messages.
- Implement inline textarea, cancel, resend, validation, Escape priority, and pending-state fences.
- Clear incompatible edit state on conversation/session/Branch transitions.

## 3. Responsive styling

- Reuse existing message/action tokens.
- Constrain form, textarea, and action rows to the user bubble.
- Preserve the single messages scroller and 44px mobile targets at 320/390/430 widths.

## 4. Deterministic checks

- Extend conversation fixtures for edit-as-new-Branch and authoritative hydration.
- Extend desktop UI fixtures for edit, cancel, request intent, new Branch, and old Branch restoration.
- Extend mobile fixtures for containment, touch targets, keyboard-height layout, and Escape behavior.

## Validation

```powershell
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-conversation-check
npm.cmd run check:ui
npm.cmd run lint
npm.cmd run build
git diff --check
```

All tests use intercepted local fixtures; no provider or vector-store calls are allowed.
