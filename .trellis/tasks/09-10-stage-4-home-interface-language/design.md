# 首页公共界面语言设计

## Boundary

The existing `useSiteLanguage` context remains the only language source. A new
`src/data/homeInterfaceCopy.ts` owns fixed Home labels for `zh` and `en`, using
the same `Record<SiteLanguage, ...>` pattern as the catalog, project, status and
AI Daily copy modules.

`HeroSplit` reads the active language for the system status and title action
name. The Home `<main>` carries the selected language for its fixed interface;
the poem and hero body are authored Chinese content, so their elements carry
`lang="zh-CN"` even when the surrounding Home interface is English. The global
App wrapper remains its existing Chinese fallback for other routes.
`SystemStatus` keeps its one-second clock and `Asia/Shanghai` formatter; only
the labels/value are projected from the copy record.

## DOM and behavior contracts

- `hero-title-rotator` keeps the existing role, tab stop, pointer handlers and
  rotation behavior; only its accessible-name suffix changes with language.
- The status clock remains stable during language changes; no interval restart,
  route remount, history entry or analytics event is introduced.
- Home project panel remains delegated to `RightScrollCards` and its existing
  `projectInterfaceCopy` projection.
- The checker snapshots authored poem/body text before switching language and
  verifies unchanged content, Chinese language markers, localized status text,
  root semantics, no overflow and the existing keyboard title action.

## Rollback

Revert the Home copy module, the three projected render changes, and the focused
language checker additions. No public data, API, route, or dependency rollback
is required.
