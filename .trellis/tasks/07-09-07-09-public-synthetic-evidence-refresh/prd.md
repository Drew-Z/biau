# Public synthetic evidence refresh

## Goal

Refresh low-sensitive public synthetic evidence after the latest Studio and assistant UI changes, without using credentialed checks or live model probes.

## Requirements

- Refresh public link, main-site, Pet showcase, and Playlab synthetic status artifacts.
- Regenerate site status from the refreshed artifacts.
- Keep reports low-sensitive: do not store credentials, private headers, model keys, database URLs, or production secrets.
- Do not run credentialed Legal RAG / ERP / Xunqiu checks without the user's manual environment setup.

## Acceptance Criteria

- [x] `npm.cmd run public-links:check -- --write-status public/status/public-links-synthetic.json` passes.
- [x] `npm.cmd run main-site:synthetic` passes.
- [x] `npm.cmd run pet:synthetic` passes.
- [x] `npm.cmd run playlab:synthetic` passes.
- [x] `npm.cmd run site:status` passes.
- [x] `npm.cmd run status:contract` passes.

## Completion Notes

- Public link check passed with 34/34 links.
- Main-site synthetic reported routes `online` with 7/7 routes; assistant live chat remains `unchecked` because no live model task was approved.
- Pet showcase synthetic reported 4/4 screenshots passed.
- Playlab synthetic reported web/mobile online, playable 6/6, resources 36/36.
- Site status regenerated with 5/5 homepage targets online and status contract passed for 6 reliability projects, 5 external targets, and 25 reliability checks.
