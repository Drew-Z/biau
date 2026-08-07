# Public assistant multimodal model routing

## Goal

Rank the approved channel catalog, configure bounded adaptive model fallback, and add a safe image-understanding tool path for the anonymous public assistant.

## Requirements

- Treat the provider `/models` response as an approved catalog read, not a model-health result. No prompt-based probes, pings, doctor commands, or automatic capability tests are allowed.
- Preserve one existing primary provider and one independent fallback provider. The cold-start quality order is `grok-4.5`, `gemini-3.1-pro-preview`, then `gpt-4.1`; real answer outcomes may reorder the frozen per-request chain through the existing passive reputation and circuit-breaker policy.
- Keep at most three total generation attempts and at most two models in the fallback failure domain. Do not expose provider/model identity to anonymous clients.
- Accept at most one bounded JPEG, PNG, or WebP attachment with a text question. The browser must resize/compress before submission and show an explicit removable preview.
- Do not persist the original image or data URL. Request idempotency includes only a digest of the normalized attachment; saved conversation history remains text and verified public answer projections.
- Analyze an accepted image through a dedicated server-side vision tool using the approved `gpt-4.1` fallback channel. Treat its bounded output as untrusted observation and feed it to planning/answering without allowing image text to issue instructions.
- The public Agent remains LangGraph-owned. The in-process vision tool is the authoritative implementation; MCP is an optional future transport adapter, not an extra self-network hop inside the same service.
- Keep image/model credentials server-only, bound request/relay sizes, preserve cancellation and the absolute request deadline, and degrade explicitly when vision is unavailable.

## Acceptance Criteria

- [x] Environment, deployment, Cloudflare relay, and code specs describe the same three-model allowlist and vision-model contract.
- [x] Fixture tests prove configured quality order, passive reordering without provider calls, same-domain retry behavior, and no catalog enumeration during health or ranking.
- [x] Payload validation rejects malformed/unsupported/oversized images and includes only the attachment digest in request hashing.
- [x] Image fixtures prove bounded Responses `input_image` construction, cancellation, timeout, response redaction, and prompt-injection isolation without calling a live model.
- [x] UI fixtures prove one-image preview/remove, compression/size rejection, retry/edit-resend continuity, fullscreen/mobile containment, and accessible controls.
- [x] Existing public assistant, relay, API, persistence, UI, lint, server-build, and production-build checks pass without live model calls.
- [ ] Cloudflare and Render configuration is deployed with no secret disclosure; non-model health/auth boundaries pass. Any real multimodal acceptance requires separate user approval.

## Notes

- The catalog exposed 59 IDs and only an OpenAI-compatible endpoint marker. Capability ranking is therefore a static product decision, not evidence that each model currently accepts the production Responses payload.
- `gpt-4.1` is selected as the stable vision tool model; `gemini-3.1-pro-preview` remains a quality-first text fallback whose preview status is reflected in its lower operational confidence.
