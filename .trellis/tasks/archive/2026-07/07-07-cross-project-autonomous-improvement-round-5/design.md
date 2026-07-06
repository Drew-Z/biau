# Cross-project Autonomous Improvement Round 5 Design

## Parent / Child Structure

The parent task owns cross-project priorities, carried manual gates, and final integration review. Child tasks own independently verifiable deliverables.

Round 5 intentionally starts with local, public-safe improvements before revisiting platform-gated checks. This keeps progress moving while the user is away and avoids turning cloud or credential tasks into blockers.

## Default Technical Direction

### Project Detail Case Studies

Project details should read like visitor-friendly technical case studies:

- problem / scenario;
- implementation and architecture;
- data flow or workflow;
- technology stack;
- deployment and reliability notes;
- screenshots, diagrams, or clearly marked current-state visuals;
- current limitations and next iterations.

Use existing project data and real repo evidence first. If screenshots are missing or inaccurate, prefer simple generated diagrams or curated public-safe assets over pretending screenshots exist.

### Internal Assistant / Studio / AI Daily

Keep the final direction as an Agentic Workspace:

- protected internal API boundary;
- member token auth;
- per-member model channel routing through server-only env;
- knowledge/session/admin tools exposed as draft-write or controlled actions;
- Studio and AI Daily content as hidden/review-needed by default.

No browser-side model keys, RAG keys, database URLs, or provider endpoints.

### Reliability And Manual Gates

Status pages distinguish:

- public entry reachability;
- API/synthetic business checks;
- protected credential-gated checks;
- release gates such as APK approval;
- platform/manual gates.

If a live check needs credentials, model calls, or platform actions, write the gate and keep moving.

## Safety Boundaries

- Public content must be safe to publish.
- No unapproved direct APK downloads.
- No raw provider diagnostics, hostnames from private config, tokens, DB URLs, admin passwords, or signing paths.
- Do not run model liveness tests.
- Do not introduce paid or persistent cloud resources without user approval.

## Rollout Shape

1. Create child task.
2. Read local rules and specs.
3. Inspect the relevant repo and existing implementation.
4. Make the smallest useful improvement.
5. Run focused validation.
6. Update main-site data/status/docs where needed.
7. Commit and push `blog-semi`; for other repos, only push when safe and aligned with repo rules.
