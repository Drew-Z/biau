# Frontend State Management

## Current State Model

The frontend uses React local state, route state from `react-router-dom`, derived values with `useMemo`, and browser persistence through `localStorage`. There is no Redux, Zustand, MobX, React Query, or SWR in the project.

## Top-Level UI State

`src/App.tsx` owns cross-page UI state:

- `language`: toggles between `zh` and `en`, with simplified Chinese as the primary content language.
- `harborScene`: persisted under `biau-port-harbor-scene` and mirrored to `document.documentElement.dataset.harborScene`.
- theme mode: provided by `useTheme()`, persisted under `theme`, and applied through the `light-theme` root class.

Keep theme, language, and harbor scene controls consistent across pages. Do not introduce a second, disconnected source of truth for these states.

## Route and Derived State

Route-sensitive classes are derived in `getPageClass(pathname)` inside `src/App.tsx`. Add new route classes there when a new page family needs global styling.

Use `useMemo` for derived collections when the grouping logic is non-trivial and based on stable imported data. `src/pages/ProjectsPage.tsx` groups `projects` into AI, fullstack, and games sections this way.

## Data State

Public catalog and article data are static TypeScript exports in `src/data/`. Keep display data typed and sanitized. Runtime assistant conversations and admin state belong to the assistant API/frontend flow, not to global stores.

## Scenario: Project Detail Content And Assistant Projection

### 1. Scope / Trigger

- Trigger: a project page needs richer case-study content and the public assistant should answer from the same project facts.
- Owner: `src/data/portfolio.ts` is the single source for project display data, optional detail sections, and assistant-facing project context.

### 2. Signatures

- `Project.detailContent?: ProjectDetailContent` groups visitor-readable case-study sections by keys such as `overview`, `workflow`, `architecture`, `quality`, `limitations`, and `roadmap`.
- `Project.assistantContext?: string[]` stores concise public facts for generated/local assistant knowledge.
- `getProjectAssistantSummary(project: Project): string` returns the public assistant summary.
- `getProjectAssistantTags(project: Project): string[]` returns deduplicated searchable tags.

### 3. Contracts

- `detailContent` is for page rendering and must remain sanitized public copy.
- `assistantContext` is for retrieval quality, not hidden/private knowledge; it must not include credentials, raw local paths, account data, private dashboards, or secrets.
- `scripts/generate-assistant-knowledge.ts` and `src/data/assistant.ts` must both use the projection helpers instead of duplicating summary/tag construction.
- `server/data/public-knowledge.json` keeps the existing knowledge item shape: `{ id, title, summary, href, tags, visibility }`.

### 4. Validation & Error Matrix

- Missing `detailContent` -> project detail page falls back to the generic header, highlights, stack, and links.
- Empty `assistantContext` -> assistant summary falls back to `project.summary`.
- Generated and local assistant summaries diverge -> update the shared helper in `portfolio.ts`, not individual consumers.
- Unsafe public content -> remove or rewrite the content before running `assistant:index`.

### 5. Good/Base/Bad Cases

- Good: Legal RAG stores architecture, workflow, quality, limitations, and roadmap in typed `detailContent`, then exposes concise RAG/contract-review facts through `assistantContext`.
- Base: a simple project only defines `summary`, `stack`, `highlights`, and `links`.
- Bad: a page component hard-codes a long project article while the assistant generator separately hand-builds a different summary.

### 6. Tests Required

- Run `npm.cmd run assistant:index` after changing project assistant fields.
- Run `npm.cmd run lint` and `npm.cmd run build` after changing `src/data/portfolio.ts`, `src/data/assistant.ts`, or project detail rendering.
- Attempt `npm.cmd run verify` for broad project-page or assistant-knowledge changes.

### 7. Wrong vs Correct

#### Wrong

```typescript
const projectKnowledge = projects.map((project) => ({
  summary: project.summary,
  tags: [project.category, project.status, ...project.stack],
}))
```

#### Correct

```typescript
const projectKnowledge = projects.map((project) => ({
  summary: getProjectAssistantSummary(project),
  tags: getProjectAssistantTags(project),
}))
```

## Scenario: Assistant MVP Browser State

### 1. Scope / Trigger

- Trigger: `/assistant`, `/assistant/admin`, and the public widget share assistant API payloads and browser-persisted MVP tokens.

### 2. Signatures

- Storage keys live in `ASSISTANT_STORAGE_KEYS` from `src/data/assistant.ts`.
- Citation payloads are normalized with `normalizeAssistantCitations(value: unknown)`.
- Member payloads are normalized with `normalizeAssistantMember(value: unknown)`.

### 3. Contracts

- `biau-assistant-member-token`: member bearer token issued by `/auth/redeem-invite`.
- `biau-assistant-member`: serialized basic member profile `{ id, name, role, dailyQuota }`.
- `biau-assistant-session-id`: current internal chat session id returned by `/chat/internal`.
- `biau-assistant-admin-token`: manually entered owner/admin token for `/assistant/admin`.
- These values are browser convenience state, not production-grade secure storage.

### 4. Validation & Error Matrix

- Missing `VITE_CHAT_API_BASE_URL` -> keep local public-knowledge fallback and do not attempt invite/admin calls.
- Missing member token -> show invite redemption and allow local fallback chat.
- `401 missing-or-invalid-token` -> explain token problem and keep the page usable through local fallback.
- `503 database-not-configured` -> explain backend persistence is missing and keep local fallback.
- Malformed citation/member payload -> drop invalid entries instead of casting with `as`.

### 5. Good/Base/Bad Cases

- Good: token-bearing internal chat stores the returned `sessionId` and reuses it for the current browser session.
- Base: no API URL still lets public/internal assistants answer from sanitized site data.
- Bad: demo/example sessions are presented as persisted history.

### 6. Tests Required

- `check:ui` should still be able to click an `/assistant` suggestion without a backend and see user plus assistant bubbles.
- `lint` and `build` must pass after touching browser storage or payload normalizers.
- `verify` must be attempted for broad assistant changes because it exercises preview/UI behavior.

### 7. Wrong vs Correct

#### Wrong

```tsx
const payload = (await response.json()) as { citations?: AssistantKnowledgeItem[] }
```

Each component now owns a private version of the API contract.

#### Correct

```tsx
const payload = (await response.json()) as unknown
const citations = isRecord(payload) ? normalizeAssistantCitations(payload.citations) : []
```

Normalize once through the assistant data module and let UI components consume typed results.

## Scenario: Public Blog Curation

### 1. Scope / Trigger

- Trigger: blog content is bulk-generated or draft-like, but only a curated subset should be public.
- Owner: `src/data/blogCuration.ts` is the source of truth for blog visibility, role, priority, project relations, public selectors, and assistant tags.

### 2. Signatures

- `BlogVisibility = 'featured' | 'archive' | 'hidden'`.
- `BlogContentRole = 'case-study' | 'technical-method' | 'resource' | 'roadmap'`.
- `BlogColumn = 'knowledge' | 'project-notes' | 'resources' | 'ai-daily' | 'build-log'`.
- `blogColumnMeta` from `src/data/blogShared.ts` is the single source for blog column Chinese/English labels, descriptions, scope, and avoid notes.
- `getPublicBlogPosts()` returns posts allowed in public lists, search, project readings, sitemap, and assistant knowledge.
- `getPublicBlogPostSummary(slug)` gates `/blog/:slug` detail SEO and direct access.
- `getLoadableBlogPostSlugs()` from `src/data/blogContent.ts` returns only public post loaders.

### 3. Contracts

- Default curation for unspecified runtime posts is `hidden`.
- Legacy generated posts belong under `content-archive/legacy-blog/` with a rewrite queue, not in the runtime `src/data/blog-posts/` directory.
- Hidden runtime drafts are allowed only for actively staged articles and must not be registered in `src/data/blogContent.ts`.
- `src/pages/BlogPage.tsx`, `src/pages/BlogPostPage.tsx`, `src/pages/ProjectDetailPage.tsx`, `src/components/SeoManager.tsx`, `scripts/generate-sitemap.mjs`, `src/data/assistant.ts`, and `scripts/generate-assistant-knowledge.ts` must use public selectors, not raw `blogPosts`, for public surfaces.
- Blog public filters and related-reading scoring use `post.column`, not legacy `category` values. The blog domain should not reintroduce `BlogCategory` / `categoryLabels`; those names are only valid for project categories in `src/data/portfolio.ts`.
- `BlogContentRole` remains a curation role and must not be treated as the first-level blog column.
- Hidden article direct URLs should render the existing missing-article state.

### 4. Validation & Error Matrix

- Hidden post appears in public selector -> `npm.cmd run blog:audit` fails.
- Hidden runtime post has a public loader -> `npm.cmd run blog:audit` fails.
- Legacy archive entry lacks its archived source file or rewrite queue entry -> `npm.cmd run blog:audit` fails.
- Featured post lacks valid priority/role -> `npm.cmd run blog:audit` fails.
- Public assistant index includes hidden post -> regenerate with `npm.cmd run assistant:index` and rerun `blog:audit`.

### 5. Good/Base/Bad Cases

- Good: a rewritten project case is added to `blogCuration` as `featured`, gets a loader in `blogContent.ts`, and appears in sitemap/assistant after generation.
- Base: an active draft can remain in `blogPosts` and `src/data/blog-posts/` as `hidden`; bulk legacy material stays in `content-archive/legacy-blog/` until rewritten.
- Bad: a component imports `blogPosts` and filters it directly for a public page, bypassing curation.

### 6. Tests Required

- Run `npm.cmd run blog:audit` after changing `blogCuration.ts`, `blogContent.ts`, project/blog relations, or sitemap generation.
- Run `npm.cmd run assistant:index` after changing public blog visibility or assistant tags.
- Run `npm.cmd run sitemap:generate` after changing public blog visibility.
- Run `npm.cmd run lint` and `npm.cmd run build` for frontend changes; broad blog/assistant changes should run `npm.cmd run verify`.

### 7. Wrong vs Correct

#### Wrong

```tsx
const post = blogPosts.find((item) => item.slug === slug)
```

This makes hidden content available to a public route.

#### Correct

```tsx
const post = getPublicBlogPostSummary(slug)
```

The route follows the same public curation contract as lists, assistant knowledge, and sitemap generation.

### React Effect Gotcha

React 19 lint can flag effect bodies that call functions which synchronously set state. For owner/admin actions such as refreshing assistant summary counts, prefer an explicit button/action handler unless the page genuinely needs subscription-style synchronization.

## When to Add a State Library

Do not add a state library for a single page or a small interaction. Consider one only if multiple distant route trees need frequent synchronized updates that are awkward with local state and props.

## Avoid

- Do not store secrets or private business data in frontend state or `src/data/`.
- Do not duplicate derived data arrays in multiple files; derive from `src/data/portfolio.ts` or shared data modules.
- Do not use `npm run dev` as validation for state changes; run lint/build because build catches TypeScript errors.
