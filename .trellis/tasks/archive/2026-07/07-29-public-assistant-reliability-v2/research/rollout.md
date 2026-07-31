# Public Assistant Reliability Rollout

## Deployment Evidence

- Public API service: `srv-d96spq6q1p3s73fvb4j0`
- Public API deploy: `dep-d9l26bf10e5c73fmb5a0`
- Public API source: `a6ae4cad`
- Public API status: `live`
- Static deployment: `d7e2bd87-8afe-4766-9a91-961f4b16a84c`
- Static source: `49a4daec`
- Static deployment status: `success`
- Render `/health`: `200`
- Cloudflare same-origin `/api/health`: `200`
- Production static assistant chunk: `PublicAssistantWidget-Bvr5ijS0.js`

The final static-only presentation-test commit does not change the public API
runtime, so the existing live API deployment remains the matching backend
runtime. Studio and RAG Orchestrator were not deployed or restarted.

## Verification Boundary

- Deterministic checks used only local fixtures and did not resolve or call a
  configured model endpoint.
- Health checks do not send a model prompt.
- The production static chunk contains the bounded recovery presentation copy.
- No provider, model, endpoint, prompt, user content, credential, or raw error is
  recorded here.

## Remaining Manual Gate

One explicitly approved business request was sent on 2026-07-30 through the
same-origin JSON route. It returned HTTP `504` after `57,838 ms`, before a public
answer or recovery projection was available. The subsequent session deletion
returned `404`, confirming that no temporary anonymous session remained.

The request was not retried. Render evidence for the same interval shows the
free service instance starting and reaching its listening state near the end of
the Cloudflare proxy budget. The service configuration remained on the `free`
runtime plan with automatic deploy disabled; no new deploy caused the restart.
After the instance was warm, direct Render health returned `200` in `1.37 s` and
same-origin Cloudflare health returned `200` in `0.97 s`.

This result does not prove a model failure. It proves that a sleeping free API
instance can consume the `55 s` edge proxy budget before the answer path starts.
The product now explicitly accepts the free-instance constraint through a
browser warm-up state machine. First open sends only `/health`, retries that
side-effect-free request once, preserves an editable draft, delays persisted
history restore until readiness, and never auto-replays a chat request. A final
warm-up failure remains an explicit visitor retry. Deterministic desktop and
320/390/430 fixtures cover 504 -> 200 request ordering and containment without a
model call.

A replacement live business acceptance request was not run because it requires
separate explicit approval. The free-instance behavior is therefore locally
verified and rollout-ready, while the live model path remains governed by that
manual acceptance boundary.
