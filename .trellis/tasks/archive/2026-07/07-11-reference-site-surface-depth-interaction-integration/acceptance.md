# Acceptance

## Visual Review

- Light dusk: the project panel and cards carry sea-mist and daylight tint while the moving rose/yellow/cyan field remains visible.
- Dark stellar: cobalt/cyan depth and a restrained warm specular response remain readable without turning the cards into neon surfaces.
- Dark garden: foreground material follows the green/cyan scene instead of retaining stellar navy.
- Mobile stellar at 390px: top navigation, hero, native horizontal project rail, actions, and the next section remain inside the viewport.

## Automated Evidence

- Six background motion signatures and six foreground material signatures are distinct in computed styles.
- Desktop hover changes card-owned sheen variables; mobile clamps sheen intensity; reduced motion removes sheen transition.
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run performance:check`
- `npm.cmd run check:ui`
- `git diff --check`

The built entry CSS is about 195.8 KB against the 240 KB budget; entry JavaScript remains about 384.1 KB against 430 KB.
