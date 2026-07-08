# Production Acceptance And Manual Gates Closure Design

## Scope Boundary

This is a parent closure task. It coordinates production acceptance, manual gates, and follow-up implementation slices across the main site and related projects. It should not become a dumping ground for unrelated feature work; each code change should remain small and independently verifiable.

The task covers:

- Main-site status and documentation alignment.
- Studio / AI Daily production acceptance.
- Internal assistant / RAG production acceptance evidence.
- Legal RAG, ERP, Xunqiu, Pet, and Playlab credentialed or release-gated checks.
- Observability and analytics platform decision support.

The task does not store secrets, production credentials, raw database URLs, private provider endpoints, real passwords, signing files, or private metrics.

## Current State Model

The user-facing queue should use four states:

- `done`: already completed and low-sensitive evidence exists.
- `manual`: needs the user in a platform console, browser session, or private credential context.
- `codex`: Codex can implement or verify locally without new secrets.
- `defer`: valuable later, but blocked by product strategy, platform choice, paid resource, release approval, or real-world readiness.

This model maps to public status language as follows:

- `done` may become `online` only if the public status contract has fresh, low-sensitive evidence.
- `manual` should remain `planned`, `unchecked`, or explicitly gated.
- `codex` may become a new Trellis child task or inline implementation slice after user approval to start.
- `defer` should stay in docs/manual gates, not status-card green states.

## Recommended Execution Order

1. Studio production acceptance.
2. First real AI Daily issue to draft workflow.
3. Internal assistant / Agentic Workspace quality follow-up, using Studio and RAG state as dependencies.
4. Legal RAG credentialed checks.
5. ERP registration/login and demo-account checks.
6. Xunqiu backend synthetic and APK gate.
7. Pet release APK gate.
8. Analytics and observability platform selection.
9. Project detail visuals and blog/knowledge quality refinements.

The order favors dependency unlocking: Studio enables AI Daily and draft-write acceptance; RAG is already ready enough for assistant quality work; credentialed project checks require user-owned demo credentials.

## Data And Evidence Contracts

All acceptance evidence must be low-sensitive:

- Counts, statuses, timestamps, and booleans are acceptable.
- Token values, account passwords, database URLs, provider URLs, signing paths, and internal content body are not acceptable.
- For model-backed flows, record task-level outcome, model/fallback status, citations, and error category only when the user approved that real business task.
- For APK gates, record artifact type, version label, checksum presence, scan/regression evidence presence, and approval state; do not expose signing material.

## UI And Status Implications

If a manual step changes public truth, update:

- `docs/manual-gates.md`
- `docs/internal-rag-studio-ai-daily-runbook.md` or the relevant runbook
- `src/data/statusTargets.ts`
- generated `public/status/site-status.json`

Run the relevant checks after public data changes:

```powershell
npm.cmd run site:status
npm.cmd run status:contract
npm.cmd run docs:manual-gates-check
npm.cmd run lint
npm.cmd run build
```

For UI-visible changes, also run:

```powershell
npm.cmd run check:ui
```

## Rollback And Safety

- If a live production check fails, do not mask it by changing public copy to success language.
- If a platform variable is missing, record the missing variable name only, never its value.
- If a status JSON generation changes unrelated live durations or freshness text, review the diff and include it only when expected.
- If a manual gate cannot be completed, move to the next Codex-verifiable slice instead of blocking the parent task.
