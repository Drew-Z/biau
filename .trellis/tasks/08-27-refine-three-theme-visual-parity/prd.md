# Refine Three Theme Visual Parity

## Goal

Further align the BIAU Port homepage's `morning`, `nature`, and `stellar` visual presentation with the local Muxing reference while retaining BIAU Port content, routes, single-axis theme controls, and accessibility behavior.

## Background

The single-axis theme contract, reference flow dynamics, and mobile theme controls were completed in `08-26-single-axis-reference-themes`. A follow-up visual audit at `1440x900` confirmed that the theme backgrounds remain distinct and the Flow/Starfield owner contract is healthy, but the homepage still diverges in three visual areas:

- Desktop first-screen rhythm is too high. BIAU Port's navigation content begins at approximately `y=26` and its hero at `y=80`; the reference's comparable navigation content begins near `y=80` and its hero content begins near `y=145`.
- The BIAU Port project board is `478x532` at `x=722, y=177`; the reference board is approximately `476x510` at `x=729, y=225`. The main board and light-theme cards read as stronger white glass, obscuring the Morning and Nature cloud fields.
- The reference gives the second line of the hero title a per-theme spectral treatment. BIAU Port currently forces both title lines to the same ink color.

Evidence sources:

- `D:\workspace4Cursor\resourses\沐星埠.html` and `沐星埠_files\styles.css` define the three reference token families and title gradients.
- Reference runtime geometry was measured from the local saved page after the boot state settled. Its unavailable external gradient module prevents reproducing the saved site's WebGL cloud canvas locally, so background evidence remains the archived reference captures from the preceding task plus the extracted palette/dynamics source.
- Current BIAU Port geometry and computed styles were captured from `http://127.0.0.1:5180/` with the production preview and the same browser viewport.

## Requirements

### R1. Preserve the established theme contract

Do not change `SiteTheme`, storage migration, root data attributes, Flow/Starfield/Stellar owner counts, profile dynamics, theme controls, or the `44px` mobile targets.

### R2. Refine desktop composition without changing content

For desktop viewports that can accommodate the reference composition, align homepage navigation content, hero text, and the project board with the reference's calmer first-screen vertical cadence. Preserve BIAU Port's four navigation destinations and existing hero copy/status information. Do not apply the desktop displacement to tablet or mobile layouts.

### R3. Make light theme surfaces reveal the background

Morning and Nature project-board/card material must remain readable while allowing their calibrated Flow cloud fields to contribute more visibly. Nature's botanical line texture remains a subtle panel detail rather than an opaque overlay. Stellar must remain dark, high-contrast, and distinct from the light themes.

### R4. Restore per-theme title spectra

Apply the reference-derived Morning, Nature, and Stellar text gradients only to the hero title's second line. The first line and body/status text keep their existing semantic ink colors.

### R5. Exclude reference-only interactions

Do not add the reference site's header-glass behavior, audio cues, 3D logo operations, onboarding/spotlight logic, additional canvases/workers, or permanent RAF loops. In particular, do not apply filter/opacity reductions or `inert` state to content passing beneath the header.

## Acceptance Criteria

- [x] At `1440x900`, a Morning, Nature, and Stellar homepage capture shows the same established Flow/Starfield theme state as before this task and clearly distinct theme materials.
- [x] At `1440x900`, BIAU Port's desktop navigation content, intro, and board use the reference-aligned vertical cadence; the board is approximately `476px` wide and `510px` high, with no clipped content.
- [x] Morning and Nature board/card layers are visibly less opaque than the pre-task baseline while text and actions remain readable; Stellar's existing dark panel hierarchy is not lightened.
- [x] The hero subline uses the approved per-theme gradient, and the main title line remains normal semantic ink.
- [x] At `320x900`, `390x900`, and `430x900`, one theme control is selected, each theme option remains at least `44x44`, no horizontal overflow occurs, and the layout keeps all project actions reachable.
- [x] `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run performance:check`, UI smoke/full checks, production appearance checks, and `git diff --check` pass.

## Out of Scope

- Route/content restructuring, changing project data, or replacing BIAU Port branding with the reference branding.
- New media assets, dependencies, background owners, workers, or animation loops.
- Reference-only sound, 3D mark, header glass, SPA transition, spotlight, and debug controls.
