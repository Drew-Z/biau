# Design: Trellis Task And Manual Gate Closure

## Boundaries

This task changes only Trellis task lifecycle metadata, the durable manual-gate ledger, and local Trellis session-recording policy. Product code and production configuration are outside scope.

## Closure Model

- Implementation tasks belong in `.trellis/tasks/archive/` once their code, checks, and documentation are complete.
- Ongoing human operations do not keep implementation tasks open indefinitely; they live in `docs/manual-gates.md` with a low-sensitive success criterion.
- The production-acceptance coordination task can be archived when its checklist is complete and the ledger owns all remaining gates.

## Session Journal Policy

`.trellis/workspace/` remains local-only and ignored. Set `session_auto_commit: false` in `.trellis/config.yaml` so `add_session.py` records locally without attempting to stage ignored journal files. Do not replace the ignore rule with a broad `.trellis/` allowlist. Because archive roots intentionally remain ignored, a manually archived task may be staged only through its validated exact `.trellis/tasks/archive/<month>/<task>` destination; never force-stage an archive root, wildcard, workspace, runtime, backup, or temporary path.

## Manual Queue Contract

The ledger keeps only current human actions, ordered by value:

1. Internal Assistant member/channel review and post-restart durable-memory persistence.
2. Studio draft review and first Publish Export.
3. Legal RAG credentialed demo checks.
4. ERP demo identity and sanitized sync fixture.
5. Xunqiu/Pet backend and release gates.
6. Analytics and observability provider decisions.

Each item records a safe success criterion and excludes secrets, raw content, private endpoints, and account identifiers.

## Rollback

- Task archives are ordinary Git moves and can be restored with a focused follow-up commit if evidence is later found incomplete.
- Documentation edits can be reverted independently.
- `session_auto_commit` can be restored to `true` only if workspace journals are intentionally tracked in a future repository policy change.
