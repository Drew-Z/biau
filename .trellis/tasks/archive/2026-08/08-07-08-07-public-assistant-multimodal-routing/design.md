# Public assistant multimodal model routing design

## Data flow

```text
Browser question + compressed image
  -> Cloudflare bounded same-origin proxy
  -> Render validation + attachment digest
  -> LangGraph image-understanding node
  -> fallback relay / Responses input_image / gpt-4.1
  -> bounded untrusted visual observation
  -> existing plan, research, generate, verify, persist flow
```

The original image exists only in the active request. PostgreSQL stores the text question, response projection, and request hash; it never stores image bytes or the vision transcript separately.

## Model routing

- Attempt 1: existing primary provider, `grok-4.5`.
- Attempt 2: independent fallback provider, `gemini-3.1-pro-preview`.
- Attempt 3: the same fallback provider, `gpt-4.1`.
- `ASSISTANT_VISION_MODEL=gpt-4.1` must resolve to an already configured fallback channel. It cannot introduce a third credential or endpoint.
- The existing passive reputation ranking may move a recently stable channel ahead of a failing one. Ranking, health, and assistant opening remain network-free.

## Image contract

- One attachment: `{ kind: "image", name, mimeType, dataUrl }`.
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`.
- Browser target: longest edge 1280 px, encoded payload no larger than the server limit.
- Server revalidates the data URL, base64 shape, decoded byte count, and MIME signature before any provider request.
- The model relay permits the larger bounded body but retains its strict top-level field allowlist, fixed upstream, auth, timeout, response-size, cancellation, and error-redaction behavior.

## Vision tool boundary

The tool sends a fixed system instruction and a user content array containing bounded `input_text` plus `input_image`. The observation is normalized to plain bounded text and labeled as untrusted image evidence. It cannot select tools, change route policy, supply credentials, or become a public citation.

MCP is intentionally not used for the in-process call. If another product later needs this tool, a remote MCP facade may wrap the same typed tool interface without changing the Agent graph.

## Failure behavior

- Invalid attachment: stable `400 invalid-public-assistant-image` before request claim.
- Oversized attachment/proxy body: stable `413`.
- Vision not configured or provider failure: the turn continues only when the text question is independently answerable; otherwise it returns an explicit degraded answer.
- Cancellation aborts vision and prevents generation/persistence from continuing.
