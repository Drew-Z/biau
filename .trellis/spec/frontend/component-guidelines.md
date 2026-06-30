# Frontend Component Guidelines

## UI System

Prefer Semi Design for UI controls and icons. This project is pinned to `@douyinfe/semi-ui-19` for React 19 compatibility and `@douyinfe/semi-icons` for icons. If Semi has a suitable component, use it before introducing custom controls.

```tsx
import { Button, Card } from '@douyinfe/semi-ui-19'
import { IconArrowRight } from '@douyinfe/semi-icons'
```

Do not import `antd`, `@mui/*`, `chakra-ui`, `tailwindcss`, `styled-components`, or Emotion. Do not import `@douyinfe/semi-ui`; use `@douyinfe/semi-ui-19`.

## Component Shape

Most components are exported named functions with local prop interfaces. `src/components/ProjectCard.tsx` is the reference shape: import types explicitly, define `ProjectCardProps`, keep category mappings near the component, and export `function ProjectCard(...)`.

Keep route-level composition in `src/pages/` and reusable units in `src/components/`. `src/pages/ProjectsPage.tsx` groups data and delegates card rendering to `ProjectCard` rather than duplicating card markup.

## Props and Events

Use typed props interfaces for reusable components. Pass callbacks for navigation or actions instead of importing router state into deeply reusable display components. `ProjectCard` receives `onViewDetails`, while `ProjectsPage` owns `useNavigate()` and external-link behavior.

When a card is clickable, keep keyboard access in sync with pointer access. `ProjectCard` uses `role="link"`, `tabIndex={0}`, `aria-label`, and an `Enter`/space key handler.

## Styling

Use existing class-based CSS systems such as `glass-card`, `feature-card`, `hover-lift`, and page-specific classes. Respect the token/theme CSS already present in `src/styles/` and `src/App.css`. Avoid hard-coded one-off colors when a theme/token class can express the state.

Do not create card-in-card page structures or marketing-only landing layouts. The site should feel like a production product showcase with clear information architecture.

## Content and Assets

Use real sanitized project screenshots when available. If an asset is missing, use a stable fallback asset or omit the image; do not fabricate business evidence, metrics, customers, or screenshots.

## Accessibility Checklist

- Interactive non-button containers need keyboard handlers and ARIA labels.
- External links use `target="_blank"` with `rel="noopener noreferrer"`.
- Images rendered through `ResponsiveImage` need useful alt text, usually the project or content title.
- Button text must fit at mobile and desktop sizes; prefer icons from `@douyinfe/semi-icons` when a known command has a standard symbol.