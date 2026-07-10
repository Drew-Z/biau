# Frontend Directory Structure

This repository is a React 19, Vite, TypeScript, custom CSS, and Lucide product website. It presents AI products, business systems, mobile and interactive experiences, and public resource content as searchable and demonstrable solution pages.

## Layout

```text
src/
├── App.tsx                 # route tree, top-level theme/language/harbor scene state
├── main.tsx                # React entry point
├── components/             # reusable UI blocks shared by pages
├── pages/                  # route-level page components
├── data/                   # public, sanitized product/content data
├── hooks/                  # reusable stateful React logic
├── utils/                  # framework-neutral helpers
├── styles/                 # global CSS split by visual system or page family
└── assets/                 # bundled static assets imported by Vite
```

Public browser assets and screenshots live under `public/`, especially `/images/projects/showcase/*` referenced by `src/data/portfolio.ts`. Do not store source project secrets or unsanitized screenshots in `src/data/` or `public/`.

## Route Ownership

Route wiring belongs in `src/App.tsx`. Current routes include `/`, `/projects`, `/projects/:id`, `/assistant`, `/assistant/admin`, `/blog`, and `/blog/:slug`. Large or less common pages are lazy-loaded, as shown by `ProjectDetailPage`, `BlogPostPage`, and `NotFoundPage`.

Route-level rendering belongs in `src/pages/*Page.tsx`. Shared display primitives belong in `src/components/`, for example `ProjectCard`, `ResponsiveImage`, `Navigation`, `SeoManager`, and `PublicAssistantWidget`.

## Data Ownership

Structured public content belongs in `src/data/`. The main project catalog pattern is `src/data/portfolio.ts`: define exported union types, interfaces, label maps, small link helpers, then the `projects` array. Blog content is split under `src/data/blog*.ts` and `src/data/blog-posts/`.

Keep complex business data in `src/data/` first. Add a backend or CMS only when the feature genuinely needs runtime editing, access control, or persistence.

## Styling Ownership

Global styles are regular CSS files imported from `src/App.tsx` and `src/main.tsx`. Split CSS by concern, such as `src/styles/theme.css`, `navigation.css`, `flow-pages.css`, and `hero-split.css`. Avoid adding CSS-in-JS libraries.

## Naming

- React component files use PascalCase, for example `ProjectCard.tsx` and `AssistantAdminPage.tsx`.
- Hooks use `use*.ts`, for example `src/hooks/useTheme.ts`.
- Data and utility modules use lower camel case, for example `portfolio.ts`, `siteLinks.ts`, and `seo.ts`.
- Page components end with `Page`.

## Avoid

- Do not turn the site into a personal portfolio voice; the project position is a product website and solution showcase.
- Do not modify `../reference-projects`; it is a read-only source for research and inventory.
- Do not add `douyu`, `yihuan-helper`, or `ques` to the showcase scope.
- Do not scatter large public content arrays inside components; keep them in `src/data/`.
