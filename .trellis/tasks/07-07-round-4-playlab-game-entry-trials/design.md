# Playlab Game entry and trial checks design

## Scope

This task verifies BIAU Playlab public entry, game listing, at least one playable Web build, discovered Godot resources, and mobile/control hints. BIAU Port owns the synthetic/status view. `D:\workspace4Cursor\game` is a loose multi-project workspace and is not a single git repository.

## Boundaries

- Do not publish unapproved game builds, private upload credentials, hidden deployment config, local build paths, or internal artifact URLs.
- Static entry availability is not enough; status should distinguish public pages, playable HTML, discovered resources, and mobile/control hints.
- If a new playable build or domain needs release approval, record it as a manual gate rather than promoting it to online.
- Prefer main-site synthetic/reporting improvements unless an actual public Playlab source bug is found and can be safely edited.

## Current Evidence

- Existing `scripts/check-playlab-synthetic.mjs` checks public Playlab pages, discovers playable `index.html` links, checks referenced Godot resources, and scans mobile/control hint terms.
- `D:\workspace4Cursor\game` has several game prototypes but no top-level git state or root rules.
- Previous public status reports treat static entry as online but leave Web playable resources and mobile hints as synthetic checks.

## Technical Design

1. Improve synthetic diagnostics:
   - Classify network failures as `timeout`, `dns_error`, `tls_error`, `connection_error`, or `network_error`.
   - Keep issue text low-sensitive; do not persist raw URLs, local paths, stack traces, or provider tokens.

2. Refresh public evidence:
   - Run `npm.cmd run playlab:synthetic`.
   - Regenerate `site-status.json` so Playlab checks use current evidence.
   - Update static status copy/manual gates only if the latest report changes the public story.

3. Validation:
   - Run lint, build, UI check, whitespace check, and sensitive scan.
   - If UI check uses a stale local dev server, verify against a fresh temporary preview and record that detail.

## Rollback

- If synthetic discovery falsely marks an unapproved build as online, revert the report/script change and record a manual release gate.
- If the public host is transiently offline, keep low-sensitive failure classes in status and avoid publishing private deployment details.
