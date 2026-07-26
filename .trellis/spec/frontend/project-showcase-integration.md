# Project Showcase Integration

## 1. Scope / Trigger

Use this contract when adding or materially changing a project that appears in the home hero, project catalog, project detail page, status page, sitemap, or public-assistant knowledge. It prevents one data edit from leaving stale generated artifacts, overstated status evidence, broken links, or private implementation details in a public projection.

## 2. Signatures

The typed source contracts remain in the existing data modules:

```typescript
// src/data/portfolio.ts
interface Project {
  id: string
  links: ProjectLink[]
  detailContent: ProjectDetailContent
  assistantContext?: string[]
}

// src/data/hero.ts
interface HeroProject {
  id: string
  detailLink: string
  externalLink?: string
}

// src/data/statusTargets.ts
interface SiteStatusTarget {
  id: string
  projectId: string
  url: string
  expectation: 'public-entry' | 'login-gated' | 'static-site'
}
```

Generation and validation commands:

```powershell
npm.cmd run assistant:index
npm.cmd run sitemap:generate
npm.cmd run site:status
npm.cmd run project-details:check
npm.cmd run assistant:kg-check
npm.cmd run status:contract
npm.cmd run public-links:check
npm.cmd run docs:project-notes-check
```

## 3. Contracts

- `src/data/portfolio.ts` is the canonical public project narrative. Treat every field, link, screenshot, caption, and `assistantContext` entry as publishable.
- A hero project with `externalLink` creates one L0 `SiteStatusTarget`; its `targetMeta` key must equal the hero project id. L0 HTTP reachability proves only that one URL responds, not that adjacent routes or product workflows work.
- Capability-level `ReliabilityCheck` entries require separately recorded evidence. Use `production-observed` only for a dated, scoped run record; test source proves coverage definition, not a passing run.
- A newly deployed static demo requires both a production browser acceptance and deployed-asset parity. Hash the exact asset URLs referenced by the deployed HTML, including version query parameters; an unversioned cache entry is not the user-facing asset when the document references a versioned URL.
- Project details require at least three in-body visuals, including one runtime screenshot and one architecture/workflow/data-flow/diagram. Raster visuals require PNG and same-stem WebP variants.
- `assistant:index`, `sitemap:generate`, and `site:status` are generated projections. Regenerate them after their source data changes and commit the synchronized output.
- `docs/project-notes/evidence-register.md` rows use repository-relative paths. `working-tree` is allowed for the current task record before commit; immutable commits are preferred after publication.
- Cross-project conclusions name the project-specific evidence IDs they derive from. A comparison document cannot be its only evidence.
- External-link failures remain failures unless the product contract explicitly accepts that status. Do not whitelist a real `403` merely to make the gate green.

## 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Project image is missing, too small, or lacks WebP | `project-details:check` fails. |
| Screenshot lacks alt, caption, or public source URL | `project-details:check` fails. |
| Assistant generated JSON differs from portfolio data | `assistant:kg-check` fails until `assistant:index` runs. |
| Reliability `relatedTargetId` has no L0 target | `status:contract` fails. |
| `blog-semi` evidence path does not exist at its recorded commit/current tree | `docs:project-notes-check` fails. |
| Cross-project evidence does not name underlying project evidence | `docs:project-notes-check` fails. |
| External URL returns non-accepted status | `public-links:check` fails and the status page remains truthful. |
| L0 entry is online but a richer synthetic is absent | Report entry reachability only; keep the capability check `planned` or `unchecked`. |
| Production browser checks pass but a referenced asset hash differs | Treat the deployment as incomplete, redeploy the current output, and repeat browser plus hash acceptance. |

## 5. Good / Base / Bad Cases

- Good: add portfolio, hero, status metadata, sanitized visuals, a dated production observation, dossiers, generated knowledge/status/sitemap, and run every relevant gate.
- Base: a project can exist only in the catalog with internal detail navigation; omit `externalLink` when there is no truthful public target.
- Bad: point the hero at a login URL, observe HTTP 200, then claim authenticated workflows, model calls, or all related routes are verified.

## 6. Tests Required

- `project-details:check`: assert section count, unique visual ids, screenshot/diagram mix, alt/caption/source fields, dimensions, and PNG/WebP pairs.
- `assistant:kg-check`: assert generated documents/chunks/entities/relations match current public data.
- `status:contract`: assert unique target ids and valid `relatedTargetId` joins.
- `docs:project-notes-check`: assert required dossiers/headings, Q&A minimums, evidence references, local evidence paths, and sensitive-pattern exclusions.
- `public-links:check`: report every failed public URL; distinguish task-added links from unrelated existing outages in the handoff.
- Static-demo production acceptance: run the browser suite against the public origin and compare key HTML/script assets byte-for-byte using their deployed reference URLs.
- `lint`, `build`, and `check:ui`: assert typed projections compile and all public project/status routes remain readable at desktop and mobile widths.

## 7. Wrong vs Correct

### Wrong

```typescript
{
  label: '完整 Demo 已验证',
  relatedTargetId: 'project-entry', // Only one URL received an HTTP check.
}
```

### Correct

```typescript
{
  label: 'Demo HTTP 入口',
  description: '检查公开 Demo URL 是否返回可接受的 HTTP 响应。',
  evidence: 'L0 只证明入口可达；交互能力由独立、带日期的浏览器验收记录支持。',
  relatedTargetId: 'project-entry',
}
```
