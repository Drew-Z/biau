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

// src/data/productRegistry.ts
declare const PRODUCT_IDS: readonly [
  'biau-port',
  'public-assistant',
  'ai-daily',
  'canvas',
  'legal-rag',
  'chatus',
  'pet-workspace',
  'ozon-erp',
  'xunqiu',
  'anchor-learning',
  'enterprise-document-agent',
  'biau-playlab',
  'roleplay-demo',
]
type ProductId = (typeof PRODUCT_IDS)[number]

interface ProductIdentity {
  id: ProductId
  name: { zh: string; en: string }
  descriptor: { zh: string; en?: string }
  publicProjection: 'public' | 'planned' | 'internal' | 'reference'
}

// src/data/projectPublication.ts
type ProductAvailability = 'online' | 'degraded' | 'offline' | 'unchecked' | 'planned'
type ProductAccess = 'public' | 'login-gated' | 'case-only'
type ProjectLinkIntent = 'entry' | 'documentation' | 'repository' | 'evidence' | 'status'

interface ProjectPublication {
  projectId: string
  productId: ProductId
  availability: ProductAvailability
  access: ProductAccess
  owner: string
  statusHref: string
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
npm.cmd run sitemap:check
npm.cmd run project-registry:check
npm.cmd run project-details:check
npm.cmd run assistant:kg-check
npm.cmd run status:contract
npm.cmd run public-links:check
npm.cmd run docs:project-notes-generate
npm.cmd run docs:project-notes-check
```

`sitemap:check` is read-only and exits 1 for missing routes, duplicate URLs, a wrong origin, query/hash URLs, or invalid locations. Run `site:status:publish` separately only within the task's authorized snapshot/publication scope.

## 3. Contracts

- `src/data/portfolio.ts` is the canonical public project narrative. Treat every field, link, screenshot, caption, and `assistantContext` entry as publishable.
- `src/data/productRegistry.ts` owns public product identity. Display names, descriptors, aliases, family attribution, and public/planned/internal/reference projection must not be redefined in page components.
- `src/data/projectPublication.ts` owns public-entry policy. Maturity, availability, and access are independent dimensions; `login-gated` is an access boundary, not proof that an entry is online.
- Every external project link declares an intent. Only `entry` links are governed by availability; valid `documentation`, `repository`, and `evidence` links remain visible when a product entry becomes unchecked or offline.
- `planned`, `unchecked`, `offline`, or `case-only` projects never expose a direct product-entry CTA. Project cards and details replace the first blocked entry with a status/planning action while preserving the case study.
- Cloud-provider dashboards are management surfaces, never public product URLs. A known Pages/Render project name may be stored as a technical alias, but an account-scoped Dashboard URL must not enter portfolio links, assistant knowledge, screenshots, or status targets.
- A planned tool such as `canvas` may appear in the catalog with truthful scope and an online checklist, but it must have no fabricated screenshot, public URL, online badge, or active status target.
- A hero project with `externalLink` creates one L0 `SiteStatusTarget`; its `targetMeta` key must equal the hero project id. L0 HTTP reachability proves only that one URL responds, not that adjacent routes or product workflows work.
- Capability-level `ReliabilityCheck` entries require separately recorded evidence. Use `production-observed` only for a dated, scoped run record; test source proves coverage definition, not a passing run.
- Record observation dates separately from release dates. Artifact size/hash/archive metadata proves the artifact, not signing, installation, business-flow acceptance, or distribution approval. "Not verified in this run" must never become "not implemented/completed in the source project". A health endpoint returning configuration and counts is not a model-generation probe.
- When describing another project's execution boundary, inspect the actual default and fallback branches. Queue/background scheduling does not imply mock or read-only behavior; a successful envelope or generated media URL does not prove a business action or upload occurred. Record source HEAD plus dirty-worktree scope, and do not refresh `verifiedAt` from source inspection. Historical outages must retain their observation date in `unavailableReason`, current summaries and assistant context.
- For games, follow the configured entry scene through the active controller/player scripts before describing controls or gameplay. A dormant alternate script, mobile theme, canvas check, or in-game score badge does not establish touch support or release acceptance. Record source build labels, historical release tags, local export hashes, deployed-resource parity and device playtests separately. Content update dates and asset commit dates are not capture dates; existing recording files must not be described as missing merely because newer recordings are needed.
- A newly deployed static demo requires both a production browser acceptance and deployed-asset parity. Hash the exact asset URLs referenced by the deployed HTML, including version query parameters; an unversioned cache entry is not the user-facing asset when the document references a versioned URL.
- Project details require at least three in-body visuals, including one runtime screenshot and one architecture/workflow/data-flow/diagram. A `screenshot` visual requires a nonblank `image`; text-only workflow/data-flow blocks remain valid. Raster visuals require PNG and same-stem WebP variants.
- `assistant:index` and `sitemap:generate` regenerate local projections from their source data. Validate the output before an authorized commit/publication; generation success alone does not establish coverage. `sitemap:check` requires all `projects`, `reliabilityProjects`, public blog posts, and shared static routes at the canonical site origin.
- `site:status:publish` writes a separate generated snapshot and requires the task's snapshot/publication authorization. A local-only task may preserve the snapshot and record planned drift. `mergeSiteStatusPayload` overlays current summary/gates/nextActions but preserves generated checks and their historical evidence. Plain `site:status` is read-only.
- `docs/project-notes/evidence-register.md` rows use repository-relative paths. `working-tree` is allowed for the current task record before commit; immutable commits are preferred after publication.
- Cross-project conclusions name the project-specific evidence IDs they derive from. A comparison document cannot be its only evidence.
- `docs/project-notes/` is a Simplified Chinese engineering archive. Descriptive headings, table labels, narrative text, and interview fields are Chinese; code symbols, repository-relative paths, URLs, SHAs, Evidence IDs, evidence labels, and stable scope values remain unchanged.
- `scripts/project-notes-question-bank-topics.ts` is the source of truth for interview content. Sixty evidence-bound topics generate exactly 300 Q&A groups: Chatus 65, Anchor 60, public assistant 60, AI Daily 65, and cross-project 50.
- Every generated Q&A block uses continuous `QA-<SCOPE>-NNN` numbering and the seven fields `范围` / `问题` / `深入追问` / `参考回答` / `失败场景` / `验证方式` / `证据`. Each scope must cite at least one evidence ID from its own evidence family.
- Regenerate the interview bank before checking it. Never hand-edit `interview-question-bank.md`; edit the structured topic source and rerun `docs:project-notes-generate` so source and output cannot drift.
- External-link failures remain failures unless the product contract explicitly accepts that status. Do not whitelist a real `403` merely to make the gate green.
- When a Node `HEAD`/fetch scan fails while a browser `GET` in the same observation window succeeds, record the transport difference and keep the browser result scoped to L0 entry reachability; do not rewrite publication status from either result without the richer product-flow evidence required by the project gate.

## 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Project image is missing, too small, or lacks WebP | `project-details:check` fails. |
| Screenshot lacks alt, caption, or public source URL | `project-details:check` fails. |
| Screenshot image is absent, empty, or whitespace | `project-details:check` fails with `screenshot is missing an image`; text-only structural visuals still pass. |
| Sitemap omits a project/status/public-blog/static route, repeats a URL, or uses another origin/query/hash | `sitemap:check` exits 1; regenerate from source and inspect coverage. |
| Assistant generated JSON differs from portfolio data | `assistant:kg-check` fails until `assistant:index` runs. |
| Reliability `relatedTargetId` has no L0 target | `status:contract` fails. |
| `blog-semi` evidence path does not exist at its recorded commit/current tree | `docs:project-notes-check` fails. |
| Cross-project evidence does not name underlying project evidence | `docs:project-notes-check` fails. |
| A dossier loses its Chinese headings or falls below its Chinese-content floor | `docs:project-notes-check` fails. |
| The structured topic source and generated Markdown differ byte-for-byte | `docs:project-notes-check` fails and asks for `docs:project-notes-generate`. |
| A generated Q&A field is missing, too short, duplicated, or uses a legacy English field name | `docs:project-notes-check` fails. |
| Q&A count is not exactly `65/60/60/65/50`, numbering has a gap, or an evidence family does not match scope | `docs:project-notes-check` fails. |
| External URL returns non-accepted status | `public-links:check` fails and the status page remains truthful. |
| Public-link failures cluster on one domain family while DNS resolves and TLS connections reset | Record the local network limitation; do not write or downgrade the public status snapshot from that run. |
| Planned/unchecked/offline/case-only publication exposes an `entry` URL | `project-registry:check` fails or UI regression must fail. |
| External project link has no explicit intent | `project-registry:check` fails. |
| Public display text omits the registered Chinese or English identity | `project-registry:check` fails unless the use is an allowed technical/history context. |
| Reference-only/internal learning directory enters catalog or assistant knowledge | `project-registry:check` fails. |
| L0 entry is online but a richer synthetic is absent | Report entry reachability only; keep the capability check `planned` or `unchecked`. |
| Source defaults to real execution, rejects non-real jobs, or skips upload while returning a URL | Describe those exact branches; reject claims of opt-in-only writes, a complete mock flow, or verified media availability. |
| Production browser checks pass but a referenced asset hash differs | Treat the deployment as incomplete, redeploy the current output, and repeat browser plus hash acceptance. |

## 5. Good / Base / Bad Cases

- Good: add portfolio, hero, status metadata, sanitized visuals, a dated production observation, dossiers, generated knowledge/status/sitemap, and run every relevant gate.
- Good: keep a dated historical debug-only observation, add a later release-archive correction, and preserve download restrictions until separately approved. Keep historical status snapshots unchanged when the task excludes snapshot writes.
- Good: update one structured interview topic, regenerate the full bank, and let the checker prove exact counts, continuous IDs, Chinese fields, evidence scope, and sensitive-content boundaries.
- Good: mark a login-gated project `unchecked`, replace its workbench entry with `/status/<id>`, and keep its public health evidence and technical documentation visible.
- Good: add `画帆 BIAU Canvas` as `planned + case-only`, name `cloudflare-imgbed` only as the technical deployment subject, and wait for a public domain/privacy/evidence gate before enabling a CTA.
- Base: a project can exist only in the catalog with internal detail navigation; omit `externalLink` when there is no truthful public target.
- Base: an online public project keeps its direct entry; its `statusHref` is the fallback for an unchecked/offline entry, not an extra mandatory button on every online detail page.
- Bad: count a screenshot-shaped text block as runtime evidence, or rely on `build` to detect a missing sitemap route.
- Bad: point the hero at a login URL, observe HTTP 200, then claim authenticated workflows, model calls, or all related routes are verified.
- Bad: use a Cloudflare/Render Dashboard link as the public tool URL or keep an unchecked product entry active because an old synthetic once passed.
- Bad: append hand-written blocks directly to `interview-question-bank.md`, keep generic repeated follow-ups, or lower the checker from exact targets to loose minimums.

## 6. Tests Required

- `project-details:check`: assert section count, unique visual ids, screenshot/diagram mix, nonblank screenshot images, alt/caption/source fields, dimensions, and PNG/WebP pairs. Negative fixtures must remove/set empty/set whitespace on a screenshot image in memory and expect exit 1, without mutating the worktree.
- `sitemap:check`: verify generated route coverage; an old sitemap without `/projects/roleplay-demo` and `/status/roleplay-demo` must fail. The check runs in `verify` and Site Quality CI alongside `project-details:check`.
- `project-registry:check`: assert identity completeness, unique names, publication coverage, explicit link intent, CTA disable policy, planned Canvas boundary, and forbidden reference/internal projections.
- `assistant:kg-check`: assert generated documents/chunks/entities/relations match current public data.
- `status:contract`: assert unique target ids and valid `relatedTargetId` joins.
- `docs:project-notes-generate`: deterministically render the 60 structured topics into the same 300-question byte sequence on repeated runs.
- `docs:project-notes-check`: assert required Chinese dossiers/headings, exact Q&A distribution, continuous IDs, seven-field content floors, unique questions, scope-matched evidence, local evidence paths, and sensitive-pattern exclusions.
- `public-links:check`: report every failed public URL; distinguish task-added links from unrelated existing outages in the handoff.
- Static-demo production acceptance: run the browser suite against the public origin and compare key HTML/script assets byte-for-byte using their deployed reference URLs.
- `lint`, `build`, and `check:ui`: assert typed projections compile and all public project/status routes remain readable at desktop and mobile widths.
- `check:ui`: assert an unavailable entry becomes a status action in the home carousel, project cards, detail quick links, and visual source links while independent evidence/documentation remains reachable.

## 7. Wrong vs Correct

### Wrong vs correct: screenshot and release evidence

```typescript
// Wrong: declaring the type does not prove a runtime image exists.
{ type: 'screenshot', title: '角色库', description: '公开页面' }
// Correct: use an actual public asset, readable alt/caption, and a source URL.
{ id: 'roleplay-public-entry-check', type: 'screenshot', title: '角色库入口',
  description: '公开角色库与独立故事入口的真实页面截图。',
  image: '/images/projects/showcase/roleplay-library.png',
  alt: 'Roleplay 公开角色库首页，包含角色卡和场景筛选',
  caption: '截图记录公开角色库与独立故事入口，不保存访客消息或私有配置。',
  sourceLabel: '角色库', sourceUrl: 'https://roleplay.playlab.eu.cc' }
```

Wrong: "签名和安装尚未完成" based only on reading an APK. Correct: "本次仅核验归档与摘要；未验签或安装，分发批准需另行确认。"

Wrong: "队列模式不会真实写入" or "返回媒体 URL，所以上传已验证". Correct: trace the executor/default-off condition and storage branch, then preserve the separate runtime gate. In B2's ERP source, `adapter = env.OZON_ADAPTER || 'real'` and `env.OZON_ENABLE_REAL_WRITE !== 'false'` permit credential checks by default; non-real jobs throw. In the Xunqiu source, missing storage configuration skips upload but still returns file metadata. These are dated source observations, not production probes. For content-only synchronization, compare unrelated project/hero/status records and all publication policy fields to the pre-batch projection, regenerate assistant knowledge, and test the updated project/status pages at desktop and 320/390/430 across themes and languages.

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

### Wrong: hand-edited interview output

```markdown
### QA-ANCHOR-061
- Question: Why is local-first useful?
- Answer: It improves privacy.
```

### Correct: structured Chinese topic source

```typescript
topic(
  'local-first SQLite 持久化',
  '来源、知识点和学习进度默认写入客户端 sqflite repository。',
  '本地优先降低默认上传范围并提供离线连续性。',
  // alternative, failure, recovery, boundary, verification, evidence...
)
```

Then run `npm.cmd run docs:project-notes-generate` followed by `npm.cmd run docs:project-notes-check`.

### Wrong: availability and access collapsed into one label

```typescript
{ status: 'login-gated', href: cloudDashboardUrl }
```

### Correct: independent publication dimensions and public-safe projection

```typescript
{
  availability: 'unchecked',
  access: 'login-gated',
  externalHref: publicWorkbenchUrl,
  statusHref: '/status/legal-rag',
}

// getProjectCta(...) returns a disabled status-only projection until the
// public entry and login boundary are verified again.
```
