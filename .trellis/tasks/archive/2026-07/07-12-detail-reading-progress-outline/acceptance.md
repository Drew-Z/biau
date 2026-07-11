# Acceptance: Detail Reading Progress And Outline Navigation

## Result

Accepted. The reference site's long-form orientation pattern has been adapted into BIAU Port as an accessible, sticky, in-flow reading guide for public blog and project detail routes.

## Verified Behavior

- `/blog/legal-rag-review` exposes 17 valid major-section targets; `/projects/legal-rag` exposes 11.
- Every outline href resolves to one unique deterministic section id rendered by its page.
- The collapsed guide shows the current section and a semantic whole-document progressbar.
- Opening brings the complete guide into an operable viewport position without creating a fixed bottom bar or second page scroll owner.
- `Escape` closes and restores focus; outside pointer interaction and selecting a section also close the outline.
- Section selection scrolls to the target and updates `data-active-section` / the visible current-section label.
- Progress reaches at least 95% at the true page bottom.
- Desktop and 320px, 390px, and 430px mobile checks pass, including one reduced-motion scenario.
- Missing blog/project detail routes render no empty guide.
- Mobile visual captures confirm the closed guide remains compact and the open outline stays readable above the public assistant.

## Reference Adaptation Boundary

The implementation adopts progress, current-section context, and outline navigation. It does not copy the reference site's brand, fixed mobile tab bar, sound control, tint lab, wording, or assets.

## Verification

```text
npm.cmd run lint                 PASS
npm.cmd run build                PASS
npm.cmd run performance:check    PASS
npm.cmd run check:ui             PASS (14 route matrix plus detail-guide desktop/320/390/430 contracts)
git diff --check                 PASS
```

Build performance remains inside repository budgets:

```text
CSS: 201822 / 240000 bytes
JS: 384194 / 430000 bytes
External blocking stylesheets: 0
Immutable asset cache: configured
```
