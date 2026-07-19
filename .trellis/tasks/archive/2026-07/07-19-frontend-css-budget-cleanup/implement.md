# Frontend CSS budget cleanup implementation

## Ordered Work

- [x] Remove the dead harbor environment/grain base rules.
- [x] Remove harbor-only keyframes and selector fragments from mixed responsive/runtime groups.
- [x] Search for remaining references and confirm active fallback selectors remain.
- [x] Build and run the existing CSS budget gate.
- [x] Run full production-preview UI regression, lint, and diff checks.
- [x] Commit and push the isolated cleanup (`52f7682`).

## Result

- Main CSS decreased from `243408` to `236074` bytes while the budget remains `240000` bytes.
- The active flow canvas and `.app::before` / `.app::after` fallback were preserved.
- `verify` passed end to end with no live model call or production database access.
- The AI Daily stale fixture now waits for its asynchronous projection before asserting visibility, removing a timing-only UI failure exposed by the full verify run.

## Validation

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run performance:check
npm.cmd run check:ui
git diff --check
```

## Rollback Point

Revert only the CSS cleanup commit if any background, intro, or fallback regression appears.
