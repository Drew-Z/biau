# Implementation plan

1. Add shared image attachment types, strict normalization/signature validation, digest-only idempotency, and a typed Responses vision request.
2. Insert a bounded LangGraph image-understanding node and pass its untrusted observation into planner and answer prompts.
3. Add browser image selection, resize/compression, preview/remove, retry/edit-resend preservation, and responsive accessible styling.
4. Raise only the chat/relay request bounds required by the compressed-image contract and extend deterministic Cloudflare/API/model/UI fixtures.
5. Update `.env.example`, `render.yaml`, deployment docs, manual gates, and backend/frontend specs for the model and vision contract.
6. Run targeted checks, full task gates, and a changed-file secret scan. Do not call a live model.
7. Commit and push, deploy Cloudflare and Render configuration, then run non-model health/auth acceptance. Record real multimodal acceptance as a separately approved gate.
