# Technical design: single-axis reference-faithful themes

## 1. Architecture

The appearance model becomes one typed state and one authoritative root
attribute. Existing renderer owners remain stable and consume a complete theme
profile instead of combining a color mode with a Harbor scene.

```text
index.html migration + prepaint
        |
        v
data-site-theme + data-site-theme-version
        |
        v
useSiteTheme (React state + direct selection + View Transition)
        |
        +----------------------+----------------------+------------------+
        |                      |                      |                  |
 Navigation             FlowBackground       StarfieldBackground  StellarEffects
        |                      |                      |                  |
 semantic CSS tokens     one Flow profile      one star profile    Stellar-only layer
```

There is no independently stored or user-selectable color mode. Morning and
Nature may set a derived `.light-theme` compatibility class while old CSS is
being consolidated, but `data-site-theme` is the sole state source and the
class is always written from that value in the same commit.

## 2. State contract and migration

### Public type

```ts
const SITE_THEMES = ['morning', 'nature', 'stellar'] as const
type SiteTheme = (typeof SITE_THEMES)[number]
```

- New storage key: `biau-port-theme`.
- Root state: `data-site-theme`.
- Reconfiguration signal: `data-site-theme-version`.
- Default: `morning`.
- Metadata owns bilingual labels and the control icon/swatch identity.

### Read precedence

1. Accept a valid `biau-port-theme` value.
2. Otherwise migrate `biau-port-harbor-scene`:
   `dusk -> morning`, `garden -> nature`, `stellar -> stellar`.
3. If only the older `theme` key exists, migrate `light -> morning`,
   `dark -> stellar`, and `auto -> morning`.
4. Otherwise use `morning`.

The prepaint script performs the same validation and mapping before CSS loads,
writes the new key when storage is available, and never waits for the system
color scheme. Legacy keys may remain for one release as inert rollback data;
runtime code no longer writes or reads them after migration.

### Atomic commit

`applySiteTheme(root, theme)` writes `data-site-theme`, derives/removes
`.light-theme`, and advances `data-site-theme-version` only when the effective
theme changes. `useSiteTheme` updates root state and storage before a
`flushSync` React state update. It wraps that commit in `startViewTransition`
only when supported and reduced motion is not requested.

## 3. Navigation control

- The BIAU mark and wordmark become one normal home `Link`. `.nav-logo` remains
  the measurable visual shell used by HarborIntro and Stellar brand geometry,
  but is no longer a button or appearance control.
- Replace `.nav-theme-toggle` with one compact `role="group"` control containing
  three direct buttons in stable order: Morning, Nature, Stellar.
- Use Lucide `Sunrise`, `Leaf`, and `Sparkles` plus theme-preview swatches. Each
  option has a stable 44px mobile target, bilingual accessible name, tooltip,
  `aria-pressed`, and `data-theme-option`.
- The group appears in the existing navigation action area on desktop and the
  top navigation on mobile. It is not duplicated in menus or settings.
- A polite screen-reader status region announces the selected theme; there is
  no spotlight, onboarding, sound, 3D control, or hidden Logo gesture.

## 4. Theme profiles

Rename the visual contract from scene terminology to theme terminology while
keeping the complete profile object sent to the existing renderer and Worker.

```ts
interface FlowThemeProfile {
  theme: SiteTheme
  palette: FlowPalette
  dynamics: FlowDynamics
  effects: FlowEffects
  starfield: StarfieldProfile
  stellarEffects: StellarEffectsProfile
  renderBudget: RenderBudget
}

getFlowProfile(theme, portrait?)
```

### Morning

- Flow composition follows the saved reference field:
  `#d5566d -> #e9e89d -> #90bfe0 -> #333ca0 -> #16497b`.
- Page and route surfaces use warm paper/light-glass semantics with dark ink,
  blue/rose/amber accents, bright inset highlights, and restrained cool shadow.
- The starfield remains sparse and low-motion but visible enough to retain the
  reference grain/speckle character in full mode.

### Nature

- Flow composition follows the saved reference field:
  `#e6d6f9 -> #c5b2d2 -> #98dddf -> #8fd695 -> #61a769`.
- Page and route surfaces use pale green light glass, dark green ink, cyan/leaf
  accents, soft organic highlights, and lower-contrast shadows.
- Star motion and card tilt are calmer than Morning; no Stellar edge/perimeter
  effect is enabled.

### Stellar

- Preserve the verified deep field:
  `#59575c -> #2b315f -> #354b7b -> #092243 -> #052433` with the existing sixth
  depth color used by the shader.
- Preserve dense multi-depth stars, cool dark glass, warm restrained highlights,
  edge glow, brand glow, and carousel perimeter flow.
- Reduced-motion and low-power paths freeze or soften these effects rather than
  falling back to Morning/Nature.

Portrait palettes remain theme-specific and keep the reference color ordering
visible at 320/390/430 widths.

## 5. Semantic CSS boundary

`src/styles/appearance-themes.css` becomes the authoritative semantic token
map for all three themes. Each theme defines:

- page solid/background and canvas filter;
- ink, copy, muted, faint, line, accent, brand, and selection colors;
- navigation, control, Logo, panel, card, action, mobile tab, and footer material;
- Hero emphasis and theme-specific decorative opacity;
- route-level compatibility tokens consumed by `theme.css`,
  `light-theme.css`, `flow-pages.css`, `catalog-pages.css`, and
  `route-pages.css`.

Existing `.light-theme` rules may continue to provide shared bright-surface
structure for Morning/Nature, but any color/material distinction belongs under
`[data-site-theme='morning']` and `[data-site-theme='nature']`. Stellar removes
the compatibility class. No CSS selector may combine two independently variable
appearance axes.

## 6. Component and owner migration

- Replace `useTheme` plus `useHarborScene` with `useSiteTheme` in `App.tsx` and
  the unused-but-typechecked `Layout.tsx`.
- Pass `theme: SiteTheme` to Flow, Starfield, StellarEffects, HarborIntro, and
  Navigation. Their diagnostics become `data-*-theme`.
- Flow/Starfield/Stellar observers listen to `data-site-theme` and
  `data-site-theme-version`; class observation remains only for intro and
  reduced compatibility signals where required.
- `RightScrollCards` replaces raw `data-harbor-scene` comparisons with the
  shared theme guard. Nature owns its reduced tilt; Stellar alone owns glow and
  perimeter behavior.
- `FlowRenderer` and `flow.worker.ts` continue to consume a complete serializable
  profile and retain their lifecycle/cleanup implementation.
- HarborIntro keeps its session key and docking behavior; the intro Logo shell
  receives `data-theme` only for material parity.

## 7. First paint

`index.html` removes the system-color query and six prepaint selectors. The
inline script restores/migrates one theme and sets the derived bright class.
Three prepaint gradients match the corresponding Flow fallback. The HTML
`color-scheme` is set from the selected theme (`light` for Morning/Nature,
`dark` for Stellar) by CSS rather than by a user mode.

## 8. Verification design

### Automated contract

- Unit-like runtime checks cover validation, default, migration precedence, and
  version advancement.
- UI checks iterate exactly three themes and verify root/Navigation/Flow/
  Starfield/Stellar agreement, profile signatures, direct selection, keyboard
  operation, refresh persistence, and one-owner counts.
- Stellar assertions require dense stars and active edge/perimeter effects;
  Morning/Nature assertions require bright computed surfaces, dark text, and no
  Stellar-only effects.
- Mobile checks cover 320/390/430 containment and 44px theme targets.
- Existing intro resume, hidden/resume, reduced-motion toggling, low-power,
  Worker/main-thread, and CSS fallback checks remain in place with renamed
  diagnostics.
- Production appearance verification remains bounded and read-only, covering
  three desktop themes, migration/persistence, and the mobile theme matrix.

### Visual evidence

Capture reference and local screenshots at comparable `1440x900`, `390x900`,
and `430x900` viewports. Review color distribution, surface brightness,
typography contrast, Logo/navigation material, Hero emphasis, project panel,
footer continuity, star density, and theme transition. Do not use pixel-perfect
comparison for BIAU-specific content/layout differences.

## 9. Performance and rollback

- No new Canvas, Worker, permanent RAF, global pointer loop, or network asset.
- Keep renderer budgets per theme and existing static/balanced/full behavior.
- Rollback boundaries are: state/migration, Navigation control, profile data,
  CSS tokens, component diagnostics, and verification scripts.
- Legacy keys remain inert during the rollout so rollback can recover the prior
  choice. The task never modifies `public/status/blog-semi-synthetic.json`.

## 10. Rejected alternatives

- Do not keep `light/dark/auto x scene` as a hidden compatibility model.
- Do not make the Logo the only theme action.
- Do not use a cycle-only button when all three choices can be selected directly.
- Do not copy reference brand assets, proprietary fonts, audio, 3D runtime,
  onboarding, compressed code, or debug tools.
- Do not approximate Morning/Nature by recoloring the current dark panels.
