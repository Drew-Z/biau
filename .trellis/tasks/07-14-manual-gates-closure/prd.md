# PRD: Cross-project Manual Gates Closure

## Goal

Turn the repository's accumulated manual-gate notes into one truthful, executable closure queue. Completed or obsolete setup must disappear from the active queue, agent-verifiable work must be completed by Codex, and the remaining human-only actions must be guided one at a time with a low-sensitive success criterion.

## Background

- Public and internal Qdrant synchronization has been accepted and verified: 27 public documents / 56 chunks and 1 internal document / 5 chunks, with zero issues and completed stale-point cleanup.
- GitHub SSH, normal commits, and `git push origin main` are working and are not current gates.
- Internal Assistant, Studio, RAG Orchestrator, and the public site are already deployed; the task must not repeat basic Render, database, or Qdrant setup.
- The Internal Knowledge admin UI still reports a synced document as `content changed` because Prisma `@updatedAt` advances when `lastSyncedAt` is written. This is an implementation defect, not a human gate.
- `docs/manual-gates.md` is the durable ledger. Related readiness and deployment documents may contain older or broader gate descriptions and must be reconciled against current evidence.

## Requirements

1. Classify every existing gate into exactly one category:
   - completed or obsolete;
   - agent-verifiable or agent-fixable;
   - currently human-required;
   - optional or deferrable.
2. Remove Qdrant bootstrap/sync, completed migrations, restored Git push, and other confirmed setup from the active human queue while preserving low-sensitive completion evidence.
3. Fix the Internal Knowledge synchronization timestamp defect so successful synchronization is displayed as synchronized until content actually changes.
4. Run repository checks and safe synthetic checks that do not require secrets or live model prompts; use their results to reduce the manual queue.
5. Keep one ordered human queue and guide only one gate at a time. Each instruction must state:
   - where to operate;
   - the exact low-sensitive action;
   - the expected result;
   - what evidence Codex can verify afterward;
   - what must not be pasted into chat or committed.
6. Recommended human execution order:
   1. Resolve the currently public Xunqiu stage-APK link against the repository's unapproved-release policy.
   2. Internal Assistant durable-memory persistence after service restart.
   3. Studio review of the first hidden/review-needed draft and creation of the first Publish Export.
   4. Legal RAG credentialed demo acceptance.
   5. ERP low-privilege demo registration/login and sanitized sync fixture.
   6. Remaining Xunqiu/Pet release and API gates.
   7. Optional analytics and observability platform choices.
7. Do not perform model liveness tests. A real model call is permitted only when the user explicitly approves a concrete business task.
8. Do not read, print, persist, or commit tokens, passwords, database URLs, provider endpoints, signing paths, or private content.

## Acceptance Criteria

- [ ] `docs/manual-gates.md` contains one current queue and no completed Qdrant/Git/migration setup is presented as pending.
- [ ] The Internal Knowledge admin summary and document row show a successful unchanged document as synchronized, with regression coverage.
- [ ] `docs/studio-ai-daily-production-readiness.md`, deployment/runbook references, and the manual ledger do not contradict the current service/database boundary.
- [ ] Agent-verifiable synthetic and documentation checks have been run and their low-sensitive results are recorded.
- [ ] Every remaining human gate has a clear next action and success criterion without secret values.
- [ ] The user can complete gates one at a time; completed gates are removed or marked complete before moving to the next one.
- [ ] Relevant lint, build, server/admin checks, manual-gate checks, and `git diff --check` pass.
- [ ] No live model probe or sensitive value is introduced.

## Out Of Scope

- Choosing paid services or changing cloud accounts on the user's behalf.
- Publishing APK/AAB files without release, signing, checksum, regression, and explicit approval evidence.
- Automatically publishing Studio drafts or AI Daily issues.
- Storing real production credentials in Trellis, documentation, source code, or chat.
