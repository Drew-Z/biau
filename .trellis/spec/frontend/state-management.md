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

## Scenario: Content Studio Draft Preview State

### 1. Scope / Trigger

- Trigger: changing `/studio` draft editing, `StudioContentBody`, body block parsing, preview rendering, or future static blog export.
- Goal: keep the editor textarea, browser preview, saved Studio payload, and future export path aligned.

### 2. Signatures

- `bodyJsonFromText(value: string): StudioContentBody`
- `textFromBodyJson(draft: Pick<StudioDraft, "bodyJson">): string`
- `StudioDraftPreview` consumes `{ title, slug, column, tag, detail, readTime, date, body, knowledgePoints, projectIds }`.
- `StudioContentBlock.type` supports `paragraph`, `heading`, `list`, `image`, `flow`, and `source-card`.

### 3. Contracts

- The editor stores textarea state in the page, but all structured body conversion must go through `src/utils/studioDraftBody.ts`.
- The preview must render from the same `StudioContentBody` that save requests send to `/studio/api/content-drafts`.
- Public-preview styling should reuse public blog detail classes such as `detail-header`, `detail-block`, `blog-post-body`, and `blog-post-body-text`, with Studio-scoped CSS only for sizing and editor metadata.
- Related project preview derives from `src/data/portfolio.ts` and the draft `projectIds` field.
- The preview is editorial UI only; it must not expose admin tokens, database URLs, model provider URLs, or private source data.

### 4. Validation & Error Matrix

- Empty textarea -> preview renders a placeholder body section and save sends `{ blocks: [] }`.
- `## Heading` -> stored as a `heading` block and starts a preview section.
- `- item` lists -> stored as a `list` block and previewed with `detail-highlights`.
- `![alt](url "caption")` -> stored as an `image` block; the URL must still be public-safe before publishing.
- Mermaid fenced blocks starting with ` ```mermaid ` -> stored as a `flow` block and previewed as readable source until a diagram renderer is added.
- Unknown or malformed text -> stored as a `paragraph`, not discarded.

### 5. Good/Base/Bad Cases

- Good: changing the textarea immediately updates preview and saving persists the same block structure.
- Good: loading a saved draft uses `textFromBodyJson()` so headings/lists/images do not collapse into plain unlabeled paragraphs.
- Base: a simple article with only paragraphs still previews and saves correctly.
- Bad: adding a second body parser inside the export script that interprets headings or images differently from Studio preview.
- Bad: importing `StudioPage.tsx` from a Node validation script just to reuse body parsing.

### 6. Tests Required

- Run `npm.cmd run lint` and `npm.cmd run build` after changing Studio preview or parser code.
- Run `npm.cmd run check:ui` after changing Studio layout; `/studio` must be part of the route set.
- Export scripts should consume saved `StudioContentBody` directly or import the shared parser helpers; do not reparse page component state.
- Run `npm.cmd run studio:export -- --sample --dry-run` after changing the Studio draft-to-blog mapping.

### 7. Wrong vs Correct

#### Wrong

```tsx
const blocks = bodyText.split('\n\n').map((text) => ({ type: 'paragraph', text }))
```

This silently makes preview, save, and export disagree once headings, lists, images, or flows are supported.

#### Correct

```tsx
const previewBody = bodyJsonFromText(draftForm.bodyText)
```

One parser owns the lightweight authoring format, and both preview and save use its `StudioContentBody`.

## Scenario: Studio AI Daily Source Selection

### 1. Scope / Trigger

- Trigger: changing `/studio` source-pool creation, AI Daily issue creation, selected source display, or source-id editing.
- Goal: keep the visitor-facing editor workflow title-based and clear while preserving the backend contract that AI Daily issues store source item ids.

### 2. Signatures

- `IssueFormState.sourceIdsText: string` remains the form-local backing field for newline/comma-separated source ids.
- `selectedIssueSourceIds = splitList(issueForm.sourceIdsText)` derives the id list.
- `selectedIssueSources` maps ids through the loaded `StudioSourceItem[]` for display.
- `appendSourceToIssue(sourceId: string)` appends one source id and guards empty/duplicate selection.
- `removeSourceFromIssue(sourceId: string)` removes one source id from `sourceIdsText`.

### 3. Contracts

- The primary UI path must let editors choose saved sources by readable source title, not by manually typing source ids.
- The source creation form is only for adding new source items; it must not look like the source selector for the current issue.
- The selected-source summary must show readable titles and source names before issue creation.
- Manual source-id editing may exist as an advanced fallback, but it should not be the default visible workflow.
- Saving a new source may set it as the current picker option, but should not silently add it to an issue.

### 4. Validation & Error Matrix

- Empty picker selection -> show a status message and do not mutate `sourceIdsText`.
- Duplicate source selection -> show a status message and keep the id list stable.
- `sourceIdsText` contains ids not in the loaded source pool -> show a warning that some ids are not loaded.
- No saved sources -> disable the picker and direct the editor to add a public source first.

### 5. Good/Base/Bad Cases

- Good: editor saves a public source, chooses it from the existing-source dropdown, clicks "加入本期", and sees it in "本期已选来源".
- Base: advanced editor pastes known source ids into the collapsed advanced field and still sees loaded matches.
- Bad: the main AI Daily issue form exposes only a textarea labelled `来源 ID`, forcing editors to copy internal ids by hand.

### 6. Tests Required

- Run `npm.cmd run lint` and `npm.cmd run build` after changing `/studio` source or issue state.
- Run `npm.cmd run check:ui` after changing Studio layout or first-load state.
- Run `npm.cmd run studio:smoke` to keep Studio export, project-detail plan, status plan, and offline AI Daily draft checks green.

### 7. Wrong vs Correct

#### Wrong

```tsx
<textarea value={issueForm.sourceIdsText} />
```

This makes internal ids the only practical creation path.

#### Correct

```tsx
<select value={sourcePickerId} onChange={(event) => setSourcePickerId(event.target.value)}>
  {sortedSources.map((source) => (
    <option key={source.id} value={source.id}>{source.title}</option>
  ))}
</select>
```

The UI speaks in source titles, while the saved issue payload still receives source ids.

## Scenario: Project Detail Content And Assistant Projection

### 1. Scope / Trigger

- Trigger: a project page needs richer case-study content and the public assistant should answer from the same project facts.
- Owner: `src/data/portfolio.ts` is the single source for project display data, optional detail sections, and assistant-facing project context.

### 2. Signatures

- `Project.detailContent?: ProjectDetailContent` groups visitor-readable case-study sections by keys such as `overview`, `workflow`, `architecture`, `quality`, `limitations`, and `roadmap`.
- `ProjectDetailSection.visual?: ProjectVisualBlock` attaches an optional body-level visual to a case-study section.
- `ProjectVisualBlock.type` is one of `screenshot`, `architecture`, `workflow`, `data-flow`, `status`, `release`, or `diagram`.
- `Project.assistantContext?: string[]` stores concise public facts for generated/local assistant knowledge.
- `getProjectAssistantSummary(project: Project): string` returns the public assistant summary.
- `getProjectAssistantTags(project: Project): string[]` returns deduplicated searchable tags.

### 3. Contracts

- `detailContent` is for page rendering and must remain sanitized public copy.
- `visual.image`, when present, should reference a public-safe asset under `/images/projects/` or another explicitly public route. It must not point at private dashboards, local absolute paths, unapproved APK downloads, or screenshots containing credentials.
- Visual blocks must be rendered as content inside the relevant section; do not hard-code project-specific illustrations in `ProjectDetailPage.tsx`.
- Missing `visual` keeps the old text/list rendering path. The optional visual field must not make simple project pages fail.
- `assistantContext` is for retrieval quality, not hidden/private knowledge; it must not include credentials, raw local paths, account data, private dashboards, or secrets.
- `scripts/generate-assistant-knowledge.ts` and `src/data/assistant.ts` must both use the projection helpers instead of duplicating summary/tag construction.
- Site-level public assistant entries such as `site:intro` or `site:status` belong in `publicKnowledgeBase`; the generation script should emit that same public knowledge source instead of rebuilding a separate list.
- `server/data/public-knowledge.json` keeps the existing knowledge item shape: `{ id, title, summary, href, tags, visibility }`.

### 4. Validation & Error Matrix

- Missing `detailContent` -> project detail page falls back to the generic header, highlights, stack, and links.
- Missing `visual` -> the case-study section renders text/items/links only.
- Missing or wrong public image path -> fix the data or asset before release; do not leave a broken body image on a public project page.
- Empty `assistantContext` -> assistant summary falls back to `project.summary`.
- Generated and local assistant summaries diverge -> update the shared helper in `portfolio.ts`, not individual consumers.
- Unsafe public content -> remove or rewrite the content before running `assistant:index`.

### 5. Good/Base/Bad Cases

- Good: Legal RAG stores architecture, workflow, quality, limitations, and roadmap in typed `detailContent`, then exposes concise RAG/contract-review facts through `assistantContext`.
- Good: a project section stores `visual: { type: 'workflow', image: '/images/projects/showcase/legal-rag-flow.svg', ... }`, and `ProjectDetailPage` renders it through the shared visual figure component.
- Base: a simple project only defines `summary`, `stack`, `highlights`, and `links`.
- Bad: a page component hard-codes a long project article or project-specific image while the data model and assistant generator separately hand-build different facts.

### 6. Tests Required

- Run `npm.cmd run assistant:index` after changing project assistant fields.
- Run a small asset-existence check or equivalent when adding many `visual.image` references.
- Run `npm.cmd run lint` and `npm.cmd run build` after changing `src/data/portfolio.ts`, `src/data/assistant.ts`, or project detail rendering.
- Run `npm.cmd run check:ui` or an equivalent Playwright route check when changing project detail rendering.
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

## Scenario: Studio Project Detail Draft Planning

### 1. Scope / Trigger

- Trigger: adding or changing Studio flows that prepare project detail page content, body-level screenshots, workflow diagrams, architecture notes, or assistant-facing project facts.
- Goal: let Studio help draft project-detail material without letting an unreviewed database draft directly mutate `src/data/portfolio.ts`.

### 2. Signatures

- Template helper: `createProjectDetailDraftTemplate(project: Project): StudioProjectDetailDraftTemplate`.
- Template fields mirror the Studio draft form: `title`, `slug`, `column`, `tag`, `detail`, `readTime`, `bodyText`, `knowledgePointsText`, `projectIdsText`, `visibility`, and `aiAssistance`.
- Planning command: `npm.cmd run studio:project-detail-plan -- --sample <projectId>`.
- Local draft planning command: `npm.cmd run studio:project-detail-plan -- --source <draft.json> [--project <projectId>]`.

### 3. Contracts

- Generated project-detail templates must keep `visibility: "hidden"` and `aiAssistance: "none"` until a real review/model task changes that state.
- The template must set `column: "project-notes"` and include exactly one target project id in `projectIdsText`.
- Template body headings should align with `projectDetailGroupLabels`: overview, workflow, architecture, quality, limitations, and roadmap.
- Images in the template or source draft may be planned as `ProjectVisualBlock.image` only when they are public-safe paths; preferred paths start with `/images/projects/`.
- Mermaid `flow` blocks are planning evidence only. They may become visual metadata, but publishing should convert important diagrams into public SVG/screenshot assets first.
- The planning command outputs JSON only; it must not write `src/data/portfolio.ts`, public images, assistant knowledge, or sitemap files.

### 4. Validation & Error Matrix

- Unknown `--sample <projectId>` or `--project <projectId>` -> command exits with `未知项目 ID`.
- Missing `--sample` and `--source` -> command exits with a usage error.
- Invalid source JSON -> command exits with `source JSON 不是有效 Studio draft payload`.
- Source draft without `projectIds` and no `--project` -> command exits with a project-id requirement.
- Non-`project-notes` draft -> plan succeeds with a warning.
- Non-hidden draft -> plan succeeds with a warning; do not treat it as publish-ready.
- `visual.image` outside `/images/projects/` -> plan succeeds with a warning for manual review.

### 5. Good/Base/Bad Cases

- Good: select a project in `/studio`, generate a hidden project-detail draft, review the preview, then run the planning command before manually editing `portfolio.ts`.
- Good: the planning output includes `detailContent`, `assistantContext`, `warnings`, and `manualNext`, giving a clear handoff for the static public project page.
- Base: a draft with only headings, paragraphs, and lists still maps into text-only `ProjectDetailSection` groups.
- Bad: a Studio API route writes directly into `src/data/portfolio.ts` from a request handler.
- Bad: a project-detail template defaults to `featured`, exposes private screenshots, or implies a model-assisted draft when no approved model task ran.

### 6. Tests Required

- Run `npm.cmd run studio:project-detail-plan -- --sample <known-project-id>` after changing the template helper or planning command.
- Run `npm.cmd run lint` and `npm.cmd run build` after changing Studio UI, `src/utils/studioProjectDraft.ts`, or project-detail planning types.
- Run `npm.cmd run check:ui` after changing `/studio` layout or project-detail template controls.
- If `src/data/portfolio.ts` is manually updated from a plan, also run `npm.cmd run assistant:index`, a public asset existence check for added images, `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:ui`.

### 7. Wrong vs Correct

#### Wrong

```typescript
await writeFile('src/data/portfolio.ts', generatedProjectContent)
```

This makes an internal Studio draft mutate the public project catalog without a Git diff review or asset safety check.

#### Correct

```typescript
const plan = buildProjectDetailExportPlan(draft)
console.log(JSON.stringify(plan, null, 2))
```

The planner produces reviewable structured output; a human or later checked exporter owns the explicit `portfolio.ts` change.

## Scenario: Studio Resource Draft Template

### 1. Scope / Trigger

- Trigger: adding or changing Studio flows that prepare `resources` column content, resource recommendation notes, or resource-sharing drafts.
- Goal: let Studio create structured resource notes without treating a pasted link as public-ready content.

### 2. Signatures

- Template helper: `createResourceDraftTemplate(input?: StudioResourceDraftTemplateInput): StudioResourceDraftTemplate`.
- `StudioResourceDraftTemplateInput.resourceType` is one of `tool`, `article`, `repository`, `model`, `course`, or `asset`.
- Template fields mirror the Studio draft form: `title`, `slug`, `column`, `tag`, `detail`, `readTime`, `bodyText`, `knowledgePointsText`, `projectIdsText`, `visibility`, and `aiAssistance`.
- UI labels live in `studioResourceDraftTypeLabels`.

### 3. Contracts

- Generated resource templates must set `column: "resources"`, `visibility: "hidden"`, and `aiAssistance: "none"`.
- Resource templates are first-draft editing scaffolds only; they must not create publish export records or write public blog data.
- Resource body sections should include resource positioning, application scenarios, usage path, judgment evidence, cautions, maintenance, and key takeaways.
- Query strings and URL fragments should not be copied into generated body text because they may contain tracking tokens or private parameters.
- Resource posts should preserve personal judgment and usage boundaries. They must not become unscreened generated link lists.

### 4. Validation & Error Matrix

- Missing title -> template uses a neutral draft title and slug that the editor can revise.
- Invalid URL -> template keeps a placeholder requiring a valid public URL.
- Non-HTTP URL -> template keeps a placeholder requiring an HTTP/HTTPS public URL.
- URL with query or hash -> template writes only origin + pathname and asks for manual review.
- Resource template saved as draft -> stays hidden until the normal review/export gate approves it.

### 5. Good/Base/Bad Cases

- Good: editor enters a public repository URL, generates a hidden resource draft, adds real usage notes, then routes it through review and `studio:export`.
- Good: a URL with tracking parameters is sanitized in template text before the editor saves the draft.
- Base: editor generates a blank resource scaffold and fills title/link later.
- Bad: a resource template defaults to `featured` or creates a publish export intent automatically.
- Bad: a generated resource post claims personal usage or benchmark results that were never verified.

### 6. Tests Required

- Run a small `tsx` assertion after changing `src/utils/studioResourceDraft.ts` to verify `column`, `visibility`, `aiAssistance`, and URL sanitization.
- Run `npm.cmd run lint` and `npm.cmd run build` after changing Studio UI or resource template helpers.
- Run `npm.cmd run check:ui` after changing `/studio` template layout.
- Run `npm.cmd run studio:export -- --sample --dry-run` to confirm existing static export mapping still works.

### 7. Wrong vs Correct

#### Wrong

```tsx
const draft = { column: 'resources', visibility: 'featured', bodyText: pastedUrl }
```

This treats an unreviewed resource link as public content and may preserve unsafe query parameters.

#### Correct

```tsx
const template = createResourceDraftTemplate({ title, url, resourceType })
setDraftForm((current) => ({ ...current, ...template }))
```

The helper owns the resource scaffold contract, defaults to hidden, and leaves publication to the normal review/export flow.

## Scenario: Studio Status Page Draft Planning

### 1. Scope / Trigger

- Trigger: adding or changing Studio flows that prepare `/status` or `/status/:projectId` explanation copy, reliability gates, or status-page update plans.
- Goal: let Studio draft status-page copy without letting an unreviewed database draft mutate `src/data/statusTargets.ts`.

### 2. Signatures

- Template helper: `createStatusDraftTemplate(project: ReliabilityProject): StudioStatusDraftTemplate`.
- Planning command: `npm.cmd run studio:status-plan -- --sample <status-project-id>`.
- Local draft planning command: `npm.cmd run studio:status-plan -- --source <draft.json> [--project <status-project-id>]`.
- Status source of truth remains `src/data/statusTargets.ts`; render helpers remain in `src/data/siteStatusView.ts`.

### 3. Contracts

- Generated status templates must set `visibility: "hidden"` and `aiAssistance: "none"`.
- Status drafts should use `column: "build-log"` and tag `可靠性观察` because they describe site operations and release gates, not public project case studies.
- Template body must separate current summary, layered checks, manual gates, next actions, and update plan.
- The planning command outputs JSON only. It must not write `src/data/statusTargets.ts`, generated public status JSON, public routes, or monitoring config.
- Status explanations must not publish real credentials, admin passwords, model provider URLs, database URLs, private dashboards, or sensitive metrics.

### 4. Validation & Error Matrix

- Unknown `--sample <status-project-id>` or `--project <status-project-id>` -> command exits with `未知状态项目 ID`.
- Missing `--sample` and `--source` -> command exits with a usage error.
- Invalid source JSON -> command exits with `source JSON 不是有效 Studio draft payload`.
- Source draft without an inferable status project id and no `--project` -> command exits with a project-id requirement.
- Non-`build-log` draft -> plan succeeds with a warning.
- Non-hidden draft -> plan succeeds with a warning; do not treat it as publish-ready.
- Missing manual gates or next actions -> plan succeeds with warnings.

### 5. Good/Base/Bad Cases

- Good: select Legal RAG in `/studio`, generate a hidden status draft, adjust gates, then run `studio:status-plan -- --source draft.json --project legal-rag` before manually editing `statusTargets.ts`.
- Good: `pet-gamer` status drafts may relate back to the public project id `pet-workspace`, while the status plan still uses `pet-gamer`.
- Base: a sample status plan produces `summary`, `gates`, `nextActions`, `checksNote`, and `manualNext`.
- Bad: a Studio API route writes `reliabilityProjects` directly from request body into `statusTargets.ts`.
- Bad: a status template claims a live model/API/credentialed flow is online without a real synthetic result or manual gate.

### 6. Tests Required

- Run `npm.cmd run studio:status-plan -- --sample <known-status-project-id>` after changing the template helper or planning command.
- Run `npm.cmd run lint` and `npm.cmd run build` after changing Studio UI, `src/utils/studioStatusDraft.ts`, or the planning script.
- Run `npm.cmd run check:ui` after changing `/studio` template controls or status route rendering.
- If `src/data/statusTargets.ts` is manually updated from a plan, also run `npm.cmd run site:status`, `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:ui`.

### 7. Wrong vs Correct

#### Wrong

```typescript
await writeFile('src/data/statusTargets.ts', generatedStatusData)
```

This bypasses Git diff review and can turn an unreviewed draft into public reliability claims.

#### Correct

```typescript
const plan = buildPlan(draft, project)
console.log(JSON.stringify(plan, null, 2))
```

The planner produces a reviewable update candidate while a human or later checked exporter owns the explicit status data change.

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
- In `PublicAssistantWidget`, `serviceState` represents API/model health for the
  widget header, while each assistant message's `meta.mode` / `meta.reason`
  represents how that specific answer was produced. Do not let one fallback
  answer such as `no_public_context` downgrade a previously confirmed
  `serviceState === 'model'`.

### 4. Validation & Error Matrix

- Missing `VITE_CHAT_API_BASE_URL` -> keep local public-knowledge fallback and do not attempt invite/admin calls.
- Missing member token -> show invite redemption and allow local fallback chat.
- `401 missing-or-invalid-token` -> explain token problem and keep the page usable through local fallback.
- `503 database-not-configured` -> explain backend persistence is missing and keep local fallback.
- Malformed citation/member payload -> drop invalid entries instead of casting with `as`.
- Public widget receives `meta.mode: 'fallback'` with `reason: 'no_public_context'`
  after health has confirmed a model provider -> keep the header in
  `模型增强在线`; the message meta already communicates `未命中公开资料`.

### 5. Good/Base/Bad Cases

- Good: token-bearing internal chat stores the returned `sessionId` and reuses it for the current browser session.
- Good: public widget health shows `model`, a generic unsupported question returns
  fallback meta, and the header remains `模型增强在线` while the message says
  `未命中公开资料`.
- Base: no API URL still lets public/internal assistants answer from sanitized site data.
- Base: public widget health never reaches a model provider and answer meta is
  `not_configured`, so the header may show API fallback or local fallback.
- Bad: demo/example sessions are presented as persisted history.
- Bad: `setServiceState(result.meta.mode === 'model' ? 'model' : 'fallback')`
  couples global provider availability to one answer path and makes the model
  appear disconnected after a fallback answer.

### 6. Tests Required

- `check:ui` should still be able to click an `/assistant` suggestion without a backend and see user plus assistant bubbles.
- `lint` and `build` must pass after touching browser storage or payload normalizers.
- `verify` must be attempted for broad assistant changes because it exercises preview/UI behavior.
- Public assistant model/status regressions should include API smoke coverage for
  generic current-site questions that cite `site:intro`, plus a widget state
  check when the header status behavior changes.

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

#### Wrong

```tsx
setServiceState(result.meta.mode === 'model' ? 'model' : apiBase ? 'fallback' : 'local')
```

This treats an answer fallback as proof that the provider is not configured.

#### Correct

```tsx
setServiceState((current) => {
  if (result.meta.mode === 'model') return 'model'
  if (current === 'model' && result.meta.reason !== 'not_configured') return 'model'
  return apiBase ? 'fallback' : 'local'
})
```

Health-derived service status stays separate from per-answer fallback reasons.

## Scenario: Internal Assistant Answer Diagnostics

### 1. Scope / Trigger

- Trigger: changing `/assistant` answer status panels, internal chat response parsing, citation display, retrieval diagnostics, or model-channel display in the member workspace.
- Goal: show useful answer-level diagnostics without letting route components redefine backend payload contracts or expose provider secrets.

### 2. Signatures

- Backend response owner: `ChatResponse.meta` from `server/src/types.ts`.
- Frontend decoder: `normalizeAssistantAnswerMeta(value: unknown): AssistantAnswerMetaSummary | null`.
- Retrieval decoder: `normalizeAssistantRetrievalSummary(value: unknown): AssistantRetrievalSummary | undefined`.
- UI state: `/assistant` stores `lastAnswerMeta: AssistantAnswerMetaSummary | null` and derives the right-panel display from that typed value plus the latest assistant citations.
- Local safety check: `npm.cmd run assistant:meta-check` executes `scripts/check-assistant-meta-normalizers.ts` against intentionally unsafe Agent metadata.

### 3. Contracts

- Components must parse answer metadata through `src/data/assistant.ts`; they must not cast `payload.meta` inline.
- Persisted message payloads may include `message.meta`; `normalizeAssistantMessage()` must decode it through `normalizeAssistantAnswerMeta()` so history reload and immediate send use the same contract.
- `/assistant` should restore `lastAnswerMeta` from the latest assistant message when loading a historical session, and clear it while switching sessions so diagnostics do not bleed between conversations.
- `/assistant` may let users inspect a specific assistant message's normalized `meta`, but the selected trace id must be browser UI state only. Switching members, sessions, archiving, token reset, or local fallback must clear stale inspected-message state.
- The answer panel may render only low-sensitive fields: `mode`, `model`, `provider`, `reason`, `citationCount`, `intent`, `grounding`, safe `modelChannel`, retrieval summary counts/classes, Agent run status, typed tool trace summaries, and guardrail summaries.
- Tool trace artifacts must be decoded through `src/data/assistant.ts`. The only current artifact is a safe Studio draft summary (`kind: "studio-draft"`) with title, column, `review-needed`, `hidden`, and a same-site Studio link. New artifacts should use `/studio?draft=<id>` so Studio can locate the draft; legacy `/studio` links remain renderable. Route components must not render raw draft body JSON, Prisma payloads, admin tokens, bearer tokens, API URLs, or secret-bearing query parameters.
- Safe `modelChannel` means `{ id, label, provider, model, configured, isDefault, isActive }`; never render or persist `apiKey`, `baseUrl`, raw env JSON, request headers, or provider response bodies.
- Retrieval diagnostics may show counts, `source`, `store`, `retrievalMode`, `sufficiency`, and `fallbackReason`; never show Qdrant URLs, embedding keys, RAG API keys, sync tokens, or raw private document text.
- Agent diagnostics must be normalized through `normalizeAssistantAnswerMeta()` and may show only `agent`, `tools`, `guardrails`, and `fallbackReason` safe projections. Components must not render raw tool payloads, raw JSON dumps, provider diagnostics, RAG chunks, private document bodies, prompts, endpoint URLs, or stack traces.
- New internal Agent responses expose LangGraph node ids in `agent.steps`, such as `input_guard`, `validate_plan`, `execute_tools`, `compose_answer`, `self_check`, and `persist_trace`. Frontend normalizers may keep legacy step names only for historical messages; UI labels should describe the graph nodes instead of the old self-built sequential runtime.
- Reset member/session flows must clear stale `lastAnswerMeta` so a new session does not display diagnostics from a previous member or archived conversation.
- Citation titles are display data only; the authoritative citation payload still comes from normalized assistant messages.

### 4. Validation & Error Matrix

- Missing `meta` -> panel shows waiting/local fallback state and uses latest normalized citations when available.
- Malformed `meta` -> decoder returns `null`; component must not throw.
- Historical assistant message with valid `meta` -> panel restores model/channel/retrieval state after session load.
- Clicking an assistant message's `查看运行轨迹` action -> panel shows that message's normalized Agent/tool/guardrail projection without rendering raw JSON or hidden fields.
- Session selection before messages finish loading -> clear previous `lastAnswerMeta`.
- Missing `retrieval` -> answer mode/model/channel still renders, with no diagnostic chip group.
- Local fallback answer -> `lastAnswerMeta` is cleared and the panel must not imply a live provider was used.
- Member logout, new invite redemption, new session, or session archive -> stale answer diagnostics are cleared.
- Unsafe backend addition such as `baseUrl` or `apiKey` in `meta` -> frontend decoder must ignore it; spec violation if UI renders it.
- Unknown Agent tool ids, unknown workflow steps, invalid tool permissions, mismatched Studio artifact links, external artifact links, and extra secret-bearing fields -> decoder drops or sanitizes them; `assistant:meta-check` must fail if serialized normalized meta contains raw endpoint/key/prompt-like values.

### 5. Good/Base/Bad Cases

- Good: internal API returns model answer plus sanitized retrieval meta; `/assistant` displays "模型回答", the safe channel label, citation count, and candidate count.
- Good: user reopens a prior session and the diagnostics panel reflects the latest assistant message in that session, not the previous active conversation.
- Good: user clicks an older assistant message with safe `meta` and the inspector replays that run summary while staying inside the normalized frontend contract.
- Good: model provider fails but citations exist; panel displays fallback reason and safe model-channel summary without exposing endpoint details.
- Base: backend is not configured; local fallback still shows a bounded state and no stale diagnostics.
- Bad: `AssistantPage.tsx` reads `(payload.meta as { retrieval?: ... })` directly and starts a second copy of the API contract.
- Bad: UI prints raw model relay URL, RAG URL, Qdrant endpoint, or provider error body as a diagnostic.

### 6. Tests Required

- Run `npm.cmd run lint` and `npm.cmd run build` after changing answer meta normalizers or `/assistant` diagnostics.
- Run `npm.cmd run assistant:meta-check` after changing `normalizeAssistantAnswerMeta()`, Agent tool trace decoding, Studio draft artifacts, guardrail decoding, or `/assistant` diagnostic projections. It must assert that unsafe fields such as `baseUrl`, `apiKey`, raw prompts, unknown tool ids, unknown steps, external Studio links, and mismatched draft links do not survive normalization.
- Run `npm.cmd run check:ui` after changing `/assistant` right-panel rendering or empty/error states.
- Run backend smoke tests when changing `ChatResponse.meta` shape, because the frontend decoder depends on that contract.
- Sensitive-scan changed files for `apiKey`, `baseUrl`, model relay URLs, RAG URLs, Qdrant endpoints, member tokens, admin tokens, invite codes, and raw private document content.

### 7. Wrong vs Correct

#### Wrong

```tsx
const meta = (payload as { meta?: { model?: string; baseUrl?: string } }).meta
setLastAnswerMeta(meta as AssistantAnswerMetaSummary)
```

The page now owns a private payload contract and may accidentally retain or render secret-bearing fields.

#### Correct

```tsx
const payload = (await response.json()) as unknown
const meta = isRecord(payload) ? normalizeAssistantAnswerMeta(payload.meta) : null
setLastAnswerMeta(meta)
```

The data module owns the boundary decoder, and the component consumes a sanitized projection.

#### Wrong

```tsx
const tools = Array.isArray(meta.tools) ? meta.tools : []
```

This preserves unknown tool ids and any extra fields the backend accidentally added.

#### Correct

```tsx
const meta = normalizeAssistantAnswerMeta(payload.meta)
const tools = meta?.tools ?? []
```

`assistant:meta-check` covers the defensive decoder with unsafe sample payloads.

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

## Scenario: Internal Assistant Durable Memory UI

### 1. Scope / Trigger

- Trigger: changing `/assistant` member memory loading, archive/restore actions, memory normalizers, or memory panel state.
- Goal: let a member inspect and manage only their own Agent-created durable memories without making memory availability a prerequisite for chat.

### 2. Contracts

- `AssistantMemory` and `normalizeAssistantMemories()` own the browser payload boundary.
- Initial member workspace loading may request profile, sessions, and active memories together, but a memory request failure must not clear a valid member or session list.
- `showArchivedMemories` controls `includeArchived=true`; it is page-local UI state and is not a second backend source of truth.
- Archive/restore updates the returned normalized row and removes archived rows from the default ACTIVE-only view.
- A completed `memory.write` tool trace triggers a list refresh; the UI does not infer or create a memory from raw user text.
- Clearing the local member token clears member memory state.
- The panel exposes no content hash, source message id, member id, token, or provider metadata.

### 3. Validation

- No token -> visible gated memory panel and disabled refresh/toggle controls.
- Empty list -> explicit consent guidance, not a fake example memory.
- Long title/content -> wraps inside the panel without horizontal overflow.
- Mobile -> memory list remains bounded and vertically scrollable; document vertical scrolling remains available.
- Run `lint`, `build`, and `check:ui` after changes.

## Avoid

- Do not store secrets or private business data in frontend state or `src/data/`.
- Do not duplicate derived data arrays in multiple files; derive from `src/data/portfolio.ts` or shared data modules.
- Do not use `npm run dev` as validation for state changes; run lint/build because build catches TypeScript errors.

### Scenario: Mobile Assistant Workspace Drawer

`AssistantPage` owns mobile drawer visibility as ephemeral local UI state. The
existing member, session, and memory states remain the only data sources; the
mobile drawer reuses the desktop sidebar DOM rather than creating a second
state tree. A `matchMedia('(max-width: 920px)')` effect controls modal semantics
and closes the drawer when returning to desktop. The open-state effect owns and
cleans up Escape handling, root scroll locking, navigation suppression, and
trigger focus restoration.