# Reference Audit: Long-Form Reading Orientation

## Useful Pattern

The saved `沐星埠` reference styles include a long-form reading rail, progress track, current section treatment, desktop outline, and a mobile directory sheet. This addresses orientation in pages substantially longer than one viewport.

## Main-Site Gap

BIAU Port already absorbed the reference's split hero, animated atmospheric field, scene-responsive materials, desktop project motion, and a mobile-specific vertical project manifest. Its detail pages now use a continuous mobile reading flow, but still require manual scanning across roughly 6,600px to 9,400px representative pages.

## Adaptation Decision

Adopt the information architecture, not the reference implementation:

- keep progress, current-section context, and major-section navigation;
- use the main site's existing React/data contracts and visual tokens;
- use a sticky in-flow guide instead of a fixed side rail or bottom tab bar;
- omit sound, brand assets, tint controls, performance route previews, and mobile global navigation.

This gives visitors a clearer reading map without increasing gesture conflicts or copying reference-specific identity.
