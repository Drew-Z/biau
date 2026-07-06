# Playlab Game entry and trial checks implementation plan

## Checklist

- [x] Start the Trellis child task.
- [x] Load relevant BIAU Port specs before editing synthetic/status files.
- [x] Read Game workspace rules and identify public Playlab evidence.
- [x] Improve `scripts/check-playlab-synthetic.mjs` for low-sensitive network error classes if needed.
- [x] Run `npm.cmd run playlab:synthetic`.
- [x] Run `npm.cmd run site:status -- --timeout 20000`.
- [x] Update `src/data/statusTargets.ts` and parent `manual-gates.md` if the latest report changes release gates.
- [x] Run final BIAU Port checks: `playlab:synthetic`, `site:status`, `lint`, `build`, `check:ui`, `git diff --check`, sensitive scan.
- [ ] Commit and push BIAU Port changes on `main`.
- [ ] Archive the child task after verification.

## Manual Gates

- Publishing new playable builds requires explicit approval, version notes, and static resource verification.
- Domain, CDN, upload, and release-host configuration remains platform-side.
- If mobile/touch support is incomplete, keep it as a public limitation instead of implying all devices are supported.
