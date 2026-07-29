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

No live business request was sent. A single real acceptance question requires
explicit user approval. After that request, record only the terminal public
status, bounded recovery metadata, and total duration, then delete the temporary
anonymous session.
