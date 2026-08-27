# Design: Three Theme Visual Parity Refinement

## Scope and Boundaries

The implementation remains CSS-only and homepage-scoped:

- `src/styles/appearance-themes.css` owns the three theme-specific surface and subline gradient tokens.
- `src/styles/hero-split.css` owns the reference-aligned desktop hero geometry and consumes the subline token.
- `src/styles/navigation.css` owns the desktop homepage navigation placement.

No TypeScript, Flow shader, worker, background component, navigation markup, storage, or theme-control behavior changes are required.

## Reference Mapping

| Surface | Reference evidence | BIAU Port change |
| --- | --- | --- |
| First-screen rhythm | reference nav labels near `y=86`, hero content region begins near `y=145` | apply a tall-desktop-only placement rule for the homepage nav and hero |
| Board geometry | reference board about `x=729`, `476x510` | set a `970px` desktop hero track with a `59px` maximum gap and a `510px` board height |
| Light materials | reference Flow board/cards use translucent white surfaces and let the colored field carry the scene | lower Morning/Nature board/card alphas and lessen the extra white sheen without changing semantic ink |
| Hero subline | reference `--text-gradient` differs by theme | add `--home-subline-gradient` tokens and clip it only to `.hero-subline` |

## Desktop Geometry

At `min-width: 1025px` and `min-height: 800px`, the homepage uses:

- nav content offset such that its labels move from about `y=31` to about `y=85`;
- a `970px` hero track, centred at `x=235` for a `1440px` viewport;
- `.955fr 1.045fr` columns with a `59px` maximum gap, yielding a board close to the reference `x=729` and `476px` width;
- a `684px` hero area that begins near `y=145`, ending at the existing first-screen baseline;
- a `510px` board with a minor upward translation to align its top without altering BIAU Port card content.

The condition intentionally leaves tablet/mobile rules unchanged. Existing mobile media rules continue to make cards vertically accessible and maintain bottom-tab clearance.

## Material and Text Tokens

Only Morning/Nature values are made more transparent. Stellar's panel/card opacity, starfield, and edge effects retain their established values. The subline colors map directly to the reference tokens:

- Morning: `#d37c86 -> #879bc9 -> #76a495`
- Nature: `#a5b687 -> #81a49e -> #b39b7a`
- Stellar: `#dbc18a -> #a8c4e0 -> #89d4b8`

## Compatibility and Rollback

The theme contract and rendering profiles are untouched. Reverting the CSS declarations restores the previous appearance without clearing local storage or changing the DOM. Reduced-motion behavior is unaffected because no animation is added.
