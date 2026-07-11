# Frontend Component Guidelines

## UI System

Use the existing class-based components and design tokens for UI controls. Use `lucide-react` for familiar command and navigation icons so the frontend stays framework-light and tree-shakeable.

```tsx
import { ArrowRight } from 'lucide-react'

<button type="button" className="btn">
  <span>查看详情</span>
  <ArrowRight size={16} aria-hidden />
</button>
```

Do not import `antd`, `@mui/*`, `chakra-ui`, `tailwindcss`, `styled-components`, Emotion, or Semi UI. Extend the existing tokens and class-based CSS before adding another component framework.

## Component Shape

Most components are exported named functions with local prop interfaces. `src/components/ProjectCard.tsx` is the reference shape: import types explicitly, define `ProjectCardProps`, keep category mappings near the component, and export `function ProjectCard(...)`.

Keep route-level composition in `src/pages/` and reusable units in `src/components/`. `src/pages/ProjectsPage.tsx` groups data and delegates card rendering to `ProjectCard` rather than duplicating card markup.

## Props and Events

Use typed props interfaces for reusable components. Pass callbacks for navigation or actions instead of importing router state into deeply reusable display components. `ProjectCard` receives `onViewDetails`, while `ProjectsPage` owns `useNavigate()` and external-link behavior.

When a card is clickable, keep keyboard access in sync with pointer access. `ProjectCard` uses `role="link"`, `tabIndex={0}`, `aria-label`, and an `Enter`/space key handler.

## Styling

Use existing class-based CSS systems such as `glass-card`, `feature-card`, `hover-lift`, and page-specific classes. Respect the token/theme CSS already present in `src/styles/` and `src/App.css`. Avoid hard-coded one-off colors when a theme/token class can express the state.

Do not create card-in-card page structures or marketing-only landing layouts. The site should feel like a production product showcase with clear information architecture.

### Convention: Brand Intro Docking

When a first-entry brand animation resolves into the navigation logo, reuse the same SVG component as the real navigation mark and calculate the final target from the live `.nav-logo` DOM rect. Do not hard-code desktop/mobile `x` / `y` coordinates as the final source of truth; fixed CSS variables may exist only as fallbacks before measurement.

```tsx
const navRect = navLogo.getBoundingClientRect()
intro.style.setProperty('--harbor-logo-x', `${navRect.left + navRect.width / 2}px`)
intro.style.setProperty('--harbor-logo-y', `${navRect.top + navRect.height / 2}px`)
```

Use the live Logo width and height as the animated element's base box, enlarge that exact shell for the center stage, and return to scale `1` at the measured target. Copy the live Logo background, border, radius, and shadow into the intro shell so the handoff does not swap between two visually different containers. Hide or crossfade the underlying navigation Logo during docking, clear centered wordmarks before landing, then let the real navigation Logo resume its normal hover, focus, and click behavior after the intro unmounts. `scripts/check-ui.mjs` should assert target center, final geometry, shell parity, and wordmark clearance so responsive navigation changes cannot silently break the landing motion.

### Convention: Long-Form Reading Guide

Blog and project detail routes longer than a few viewports use the shared
`DetailReadingGuide`. Pages own the ordered public section model and render a
deterministic id for every guide entry; the guide must not infer ids by slugifying
localized or user-authored headings.

The guide is a sticky in-flow orientation control, not a fixed sidebar or mobile
bottom bar. Its collapsed state exposes the current major section and whole-page
progress. The explicit outline may use bounded local scrolling while open, but
normal reading remains document-owned. Opening the outline brings the complete
guide into view; `Escape`, outside pointer interaction, and selecting a real
anchor all close it.

Use `prefers-reduced-motion` to choose instant versus smooth section navigation.
Loading and missing-detail states do not render an empty guide. Keep the public
assistant behind the open outline and verify the guide at `320`, `390`, `430`,
and desktop widths.
## Content and Assets

Use real sanitized project screenshots when available. If an asset is missing, use a stable fallback asset or omit the image; do not fabricate business evidence, metrics, customers, or screenshots.

## Accessibility Checklist

- Interactive non-button containers need keyboard handlers and ARIA labels.
- External links use `target="_blank"` with `rel="noopener noreferrer"`.
- Images rendered through `ResponsiveImage` need useful alt text, usually the project or content title.
- Button text must fit at mobile and desktop sizes; prefer icons from `lucide-react` when a known command has a standard symbol.

### Responsive Taxonomy Controls

When a taxonomy has more options than a 320px mobile viewport can show in full,
keep the desktop segmented buttons but replace them on mobile with one labeled
native `select`. Both surfaces must share the same controlled value and callback;
do not duplicate filtering state. Every option must expose the complete Chinese
and English identity plus its count or pending state. Do not use a clipped,
no-wrap horizontal rail or partial-card peek as the only discovery mechanism.