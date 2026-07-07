# Design

## Scope

Modify:

- `scripts/check-ui.mjs`
- `.trellis/spec/frontend/quality-guidelines.md`

## Approach

`check-ui` already derives `projectDetailVisualCases` from `projects`. Extend that derived case object to include image-backed visual alt/caption expectations:

- `expectedVisualAltTexts`
- `expectedVisualCaptions`

Inside the existing per-project visual loop, assert:

- each expected alt text is present on an image under `.project-case-study .project-visual__image img`;
- each expected caption is visible under `.project-case-study .project-visual__caption`;
- caption count equals the expected caption count for image-backed visuals.

## Compatibility

The rendered UI and project data do not change. The check only verifies the existing rendering contract.
