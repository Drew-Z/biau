# BIAU Port continuous improvement design

## Role Of This Parent Task

This task is a coordination layer. It exists to keep long-running improvement work coherent across multiple child tasks and project areas. It should not absorb implementation detail that belongs in a specific child task.

## Task Tree Model

```text
BIAU Port continuous improvement master plan
  ├─ Public assistant frontier RAG / agentic knowledge upgrade
  └─ Cross-project release readiness round 3
       ├─ ERP production registration live verify
       ├─ Legal RAG demo access QA closure
       ├─ Pet APK public release closure
       ├─ Cross-project scheduled reliability observability
       └─ AI Daily content pipeline phase 1
```

Future child tasks should be added when a discovery has its own deliverable and validation boundary.

## Work Selection Algorithm

When continuing autonomously:

1. Prefer already-started `in_progress` child tasks.
2. If no child is in progress, inspect planning child tasks and choose the one with:
   - highest user-visible impact;
   - least dependency on manual secrets/deployment actions;
   - clear local validation path;
   - low risk of broad unrelated churn.
3. If all active children are blocked on manual action, create or update a planning child task for the next unblocked improvement.
4. Record the blocker in `manual-actions.md` and keep moving on unrelated unblocked work.

## Child Task Creation Rules

Create a child task when the work:

- spans multiple files or systems;
- needs design decisions;
- involves deployment or external service contracts;
- has manual gates;
- needs separate validation commands;
- could reasonably be completed and archived independently.

Do not create a child task for:

- a single typo or small text correction;
- a one-command local check;
- a note that belongs in `manual-actions.md`;
- speculative ideas with no clear acceptance criteria.

## Manual Action Boundary

Manual actions are not failures. They are planned handoff points. Codex should record them and continue with other work.

Manual action categories:

- Cloud platform setup: Cloudflare, Render, Supabase, Neo4j, GitHub secrets.
- Credentials: API keys, demo passwords, admin tokens, database URLs.
- Release artifacts: APK signing, download approval, checksums, virus scan results.
- Production verification: live model prompt validation, live synthetic checks, paid service choice.
- Product decisions: public wording, demo access policy, acceptable data exposure.

## Safety Model

The parent task inherits project safety rules:

- no secrets in source;
- no live model liveness checks;
- no destructive Git;
- no hidden production changes;
- no public claims without evidence;
- no real deployment URLs or credentials in public docs unless deliberately public and reviewed.

## Progress Recording

Use the following surfaces:

- Child `prd.md` / `design.md` / `implement.md` for task-specific scope.
- Parent `manual-actions.md` for user-required actions.
- Parent `prd.md` for cross-task requirements and priority rules.
- `.trellis/workspace/zhang/journal-*.md` only when finishing a session or recording broad progress through Trellis finish-work.

## Exit Criteria

The parent task should remain open while it is useful as a continuing improvement program. It can be archived only when:

- all active children are archived or intentionally moved elsewhere;
- the user no longer wants an umbrella task;
- remaining manual actions are closed or migrated to a new parent task.
