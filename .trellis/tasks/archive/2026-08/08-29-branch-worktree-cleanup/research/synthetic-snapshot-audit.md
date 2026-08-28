# Synthetic Snapshot Audit

## File Role

`public/status/blog-semi-synthetic.json` is a tracked, generated public status snapshot written only by the explicit `main-site:synthetic:publish` path. The read-only `main-site:synthetic` command does not write it.

## Dirty Snapshot

- Generated at `2026-08-11T01:03:32.972Z`.
- Reports all seven routes and assistant health offline with generic `fetch failed` errors.
- Contains no credential, endpoint secret, account, or private data.

## Current Verification

- PowerShell HTTPS HEAD to `https://biau.playlab.eu.cc/` returns 200.
- Node `fetch` to that custom domain fails with `ECONNRESET`.
- `https://biau.pages.dev/` returns 200 through Node `fetch`.
- Read-only synthetic against the stable Pages domain reports routes online 7/7 and assistant offline.

## Recommendation

Do not commit the 2026-08-11 dirty snapshot as current production truth. Restore it to the committed baseline after explicit user approval, then track Node/custom-domain compatibility and the Pages assistant deployment as separate operational work if the user wants current published evidence.

## History Explanation

- The committed source snapshot remains the 2026-07-09 online/unchecked evidence.
- A stash merge at `704ea44a` records an unrelated preserved 2026-08-03 snapshot, but the current dirty file is a later 2026-08-11 offline run.
- `public/status/site-status.json` was committed later on 2026-08-11 after reading the dirty source snapshot, so its public aggregate references the offline evidence even though the source file itself was never committed.
- Commit `095a3412` then changed synthetic commands to read-only by default and explicit publish on `--write-status`; that explains why the dirty snapshot stopped refreshing and remained visible across later sessions.
