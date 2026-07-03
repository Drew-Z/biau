# Live Check

## 2026-07-03

Status: `blocked-by-deploy`

Evidence:

- Local `npm.cmd run cf-assistant:smoke` passed. The Cloudflare Pages Function code can handle fallback, configured model success, and provider failure fallback locally.
- Live `GET https://biau.playlab.eu.cc/api/health` returned the static site HTML instead of JSON.
- Live `POST https://biau.playlab.eu.cc/api/chat/public` returned HTTP 405.
- Live HTML still contained the older `Biau Labs` shell, which means the public host is not serving the latest `main` deployment.
- `npm.cmd run main-site:synthetic` marked `blog-semi-public-assistant` as `offline`.

Conclusion:

The current blocker is not the GLM model key itself. The public host must first deploy the latest Cloudflare Pages build with `functions/` enabled. Only after `/api/health` returns JSON should `ASSISTANT_MODEL_*` variables be configured or verified.

Manual gate for user / platform:

1. Open Cloudflare Pages project for `biau.playlab.eu.cc`.
2. Confirm production branch is `main` and the latest deployment includes commit `d73ab8f` or newer.
3. Re-run / retry deployment if the latest commit is missing or failed.
4. Confirm Pages Functions are enabled and `functions/api/health.ts` is included in the deployment.
5. Configure runtime variables:
   - `ASSISTANT_MODEL_BASE_URL`
   - `ASSISTANT_MODEL_API_KEY`
   - `ASSISTANT_MODEL_NAME=glm-5.2`
   - `ASSISTANT_MODEL_PROVIDER=glm-compatible`
6. Verify:
   - `GET https://biau.playlab.eu.cc/api/health` returns JSON with `ok: true`.
   - `POST https://biau.playlab.eu.cc/api/chat/public` returns JSON with citations.
   - `meta.mode` is `model` after model env is configured, or `fallback` before env is configured.
