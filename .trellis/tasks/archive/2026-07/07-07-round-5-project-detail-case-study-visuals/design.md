# Project Detail Case Study Visuals Design

## Current Hypothesis

The project detail page likely renders structured project metadata from `src/data/` and page UI from `src/pages/ProjectDetailPage.tsx`. The first implementation should inspect the actual files before changing anything.

## Preferred Shape

Add a small, data-driven case-study section that can be reused across projects:

- architecture/workflow diagram blocks;
- evidence cards with status, source, and limitations;
- technical stack and implementation notes;
- iteration roadmap.

Keep the structure optional so projects without complete evidence do not render empty or misleading sections.

## Visual Approach

Use repo-native frontend assets first:

- Semi Design components;
- CSS modules/global CSS consistent with existing page styles;
- data-driven diagram blocks rendered with HTML/CSS or existing image assets;
- no new UI framework.

If a real screenshot is missing, render a clearly labeled diagram or current-state visual instead of inventing screenshots.

## Safety

All public page data is publishable. Do not include private deployment hosts, internal dashboards, credentials, raw production metrics, model endpoints, or unapproved APK URLs.
