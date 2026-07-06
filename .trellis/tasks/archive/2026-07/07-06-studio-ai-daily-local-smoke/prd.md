# Content Studio and AI Daily local smoke gate

## Goal

Add a single local smoke command for Content Studio and AI Daily workflows so
future autonomous runs can verify the editor-facing content pipeline without
remembering several separate commands.

The smoke gate should exercise only deterministic local/offline behavior. It
must not call model providers, fetch external URLs, require cloud credentials,
or write permanent tracked draft artifacts as a side effect.

## Requirements

- Add a `studio:smoke` npm script that runs the existing local checks for:
  - Studio export sample dry-run.
  - Project detail export planning sample.
  - Status detail export planning sample.
  - Offline AI Daily draft generation from the public sample source pack.
- The AI Daily draft smoke must write to a temporary or ignored path, not leave
  a tracked `content-drafts/*.md` file behind.
- The command output should make it clear which step is running and which step
  failed if there is a regression.
- Document the new command in Studio / AI Daily docs as the recommended
  no-live, no-model local gate.
- Keep the command safe for CI or long-running Codex work: no secrets, no live
  model diagnostics, no production database requirement, no external fetch.
- Do not change the existing public blog publication gates.

## Acceptance Criteria

- [x] `package.json` exposes `npm.cmd run studio:smoke`.
- [x] The new smoke command succeeds on a fresh local environment without
      Studio database, model provider, or external network access.
- [x] Running the smoke command leaves `git status --short` clean except for
      intentionally edited source/docs files.
- [x] `docs/content-studio.md` and/or `docs/ai-daily-pipeline.md` mention the
      command and describe its offline boundary.
- [x] `npm.cmd run studio:smoke` passes.
- [x] Relevant existing checks still pass before commit.

## Notes

- This is a lightweight task. PRD-only is enough because the implementation
  should compose existing commands rather than changing runtime contracts.
