# Reliability Status and Synthetic Checks Design

## Boundary

This child task owns `blog-semi` reliability/status surfaces only. It can inspect related project facts, but should not edit related repositories unless a status or synthetic result proves a small cross-project fix is necessary and safe.

## Status Model

Keep status checks layered:

- `entry`: public URL/route reachability and branding;
- `synthetic`: user-visible workflow smoke, such as registration bootstrap or Legal RAG demo path;
- `metrics`: low-sensitive HTTP counters/latency readiness;
- `observability`: higher-level dashboards, RAG readiness, quality trend, or release gate state.

Manual gates must remain explicit and must not be collapsed into `online`.

## Safety

Do not trigger public assistant live chat unless explicitly enabled by an opt-in flag. Do not add real credentials, private service URLs, or APK links to generated status files. Production checks should output sanitized statuses and public-safe summaries only.

## Deliverable Shape

The first implementation slice should establish a current baseline by running existing status/synthetic commands, then fix the smallest true gap found in data, script behavior, or public wording.
