# Design

## Scope

Modify:

- `scripts/check-ui.mjs`

## Approach

The Studio page already parses `useSearchParams()` and derives a `draftLinkTarget` from the `draft` query parameter. When no token is saved, it displays:

```text
请先保存 Studio token，保存后会自动定位助手创建的草稿。
```

Extend the route table in `check-ui.mjs` with `/studio?draft=ui_check_draft_01`, keeping the canonical expectation as `/studio`. Add a route-specific assertion that the token-needed draft lookup message is visible. This proves assistant artifact links land on the correct page and produce an actionable state without requiring credentials.

## Compatibility

No production code change should be needed. This is a UI regression guard and remains part of `npm.cmd run verify` through `check:ui`.
