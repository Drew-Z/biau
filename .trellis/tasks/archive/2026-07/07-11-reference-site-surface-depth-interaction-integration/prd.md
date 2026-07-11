# Reference-site surface depth and interaction integration

## Goal

Absorb the reference site's theme-responsive surfaces, spatial depth, and mobile interaction clarity into BIAU Port without copying its brand or navigation model.

## Evidence

- `D:\workspace4Cursor\resourses\沐星埠.html` and its saved CSS show that the reference site carries each theme into panel/card materials, not only the page background.
- The reference project panel uses a restrained spectral highlight, inset edge light, and layered shadow to separate foreground tools from the moving field.
- Its mobile cards reduce visual noise and keep a clear horizontal action path, while the current BIAU Port mobile rail already provides the correct native scrolling and gesture ownership.
- BIAU Port has a richer public navigation and more explicit project actions, so the reference bottom navigation and its brand/content are not appropriate to copy.

## Requirements

- Add scene-responsive surface tint, highlight, edge, and depth tokens for light/dark `dusk`, `garden`, and `stellar`.
- Apply those tokens to the home project panel and project cards so surfaces belong to the active scene while remaining readable.
- Add a subtle spectral/specular card response for hover/focus without introducing JavaScript animation or a new dependency.
- Preserve the existing project panel perspective interaction and strengthen foreground/background separation through bounded shadows and inset light.
- Keep mobile native horizontal scrolling, one semantic copy per project, vertical page panning, and compact card actions.
- Keep reduced-motion static and preserve the current Harbor Intro suppression behavior.
- Do not copy the reference site's logo, wording, bottom navigation, audio, or runtime performance controls.

## Acceptance Criteria

- [x] Six theme combinations expose distinct surface tint/depth signatures in computed styles.
- [x] The home hero panel and cards use scene-responsive materials rather than a theme-agnostic white/navy fill.
- [x] Desktop hover/focus produces a visible bounded specular response without resizing or moving content.
- [x] Dark stellar retains readable cards with cobalt/cyan depth and restrained warm edge light.
- [x] Light dusk remains translucent enough for the moving harbor field to show through without losing text contrast.
- [x] 390px mobile keeps native horizontal scrolling, no page overflow, no navigation overlap, and no hidden action affordance.
- [x] Reduced-motion disables the new response animation/transition where motion would otherwise continue.
- [x] `lint`, `build`, `performance:check`, `check:ui`, and `git diff --check` pass.

## Out Of Scope

- Replacing the current navigation architecture.
- Rewriting homepage project data or public copy.
- Adding pointer-follow JavaScript, Canvas, Three.js, GSAP, or new image assets.
