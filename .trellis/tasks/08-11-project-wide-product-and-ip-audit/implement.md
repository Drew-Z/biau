# Implementation Plan

## Delivery Strategy

The parent task is implemented as five independently verifiable slices. Each slice ends with its own focused checks and can be reverted without undoing the others. No implementation/check subagents are used in inline mode.

Dependencies are explicit:

- Slice A (truth model) is required by Slices B, C and D.
- Slice B (entry governance) is required before Canvas can be projected safely in Slice D.
- Slice E (product acceptance) can begin with deterministic checks after Slice A, but its real-business gates remain manual.
- Naming display migration in Slice C must not change stable technical identifiers.

## Slice A. Product Identity And Publication Contracts

### Implementation

- [x] Add `src/data/productRegistry.ts` with the approved identities, descriptors, aliases, family and public projection.
- [x] Add `src/data/projectPublication.ts` with maturity, availability, access, owner, evidence and status-link declarations.
- [x] Add explicit link intents (`entry`, `documentation`, `repository`, `evidence`, `status`) before applying availability policy.
- [x] Add a single CTA projection helper; do not duplicate status branching across components.
- [x] Keep URLs in `src/data/siteLinks.ts` and stable project IDs/slugs unchanged.
- [x] Add a contract checker for identity completeness, project mapping, forbidden public references and CTA policy.
- [x] Document the distinction between maturity, availability and access.

### Validation

- [x] Run the new registry/publication contract check.
- [x] Run `npm.cmd run lint`.
- [x] Run `npm.cmd run build`.

### Rollback point

- Registry files and their consumers can be reverted without touching routes, services or persistent data.

## Slice B. Existing-project Availability And CTA Governance

### Implementation

- [x] Inventory every external project action in Hero, project cards/details, visual blocks, blog content and assistant context, and classify its intent.
- [x] Create `docs/project-publication-audit.md` with status, access, evidence, CTA decision, owner and next action for every public project.
- [x] Map current projects into `projectPublication.ts` using existing low-sensitive evidence; do not infer online from marketing copy.
- [x] Route only product-entry actions in Hero, cards, details and visual blocks through the CTA helper; keep valid documentation, repository and evidence links independent.
- [x] Preserve every valid case study, screenshot and retrospective while replacing unavailable actions with status explanations/status-page links.
- [x] Ensure login-gated projects say “受控入口/需要登录” and never imply anonymous public use.
- [x] Audit hard-coded project links in blog content and public assistant knowledge; remove only false usability claims, not historical context.

### Validation

- [x] Run the publication contract check.
- [x] Run `npm.cmd run public-links:check` without `--write-status`; record the current Cloudflare-domain connection-reset limitation without changing public snapshots.
- [x] Run `npm.cmd run status:contract`.
- [x] Run `npm.cmd run project-details:check`.
- [x] Run `npm.cmd run check:ui:smoke` and focused desktop/mobile screenshots.
- [x] Confirm `public/status/blog-semi-synthetic.json` is neither reverted nor staged.

### Rollback point

- Revert publication declarations and CTA helper consumers; case content and stable URLs remain unchanged.

## Slice C. Public Naming Migration

### Implementation

- [x] Research current English-name search/domain/trademark conflicts without testing any model/provider.
- [x] Record each conflict conclusion and any replacement in `naming-proposal.md`.
- [x] Replace copied display names in Hero, portfolio, status labels, navigation, metadata and main README with registry projections.
- [x] Apply public names and technical descriptors together, for example `律航 LexBeacon｜Legal RAG`.
- [x] Rename the public assistant display to `知航 / BIAU Beacon` and AI Daily to `潮讯 / TideBrief`; keep API routes and page routes stable.
- [x] Update public assistant knowledge generation and regenerate knowledge assets.
- [x] Add stale-name allowlist checks so technical/history contexts remain valid while accidental public copies fail.
- [x] Keep Playlab game names unchanged and exclude reference/internal learning directories.

### Validation

- [x] Run the naming registry/stale-name contract check.
- [x] Run `npm.cmd run assistant:index`.
- [x] Run `npm.cmd run assistant:kg-check`.
- [x] Run `npm.cmd run sitemap:generate` and review generated changes.
- [x] Run `npm.cmd run lint` and `npm.cmd run build`.
- [x] Review desktop/mobile metadata, headings, cards and status labels for overflow.

### Rollback point

- Restore registry display values and generated projections; do not rename routes or technical resources.

## Slice D. Canvas Planned Onboarding And Tools Section

### Implementation

- [x] Add `canvas` identity as `画帆 / BIAU Canvas`, family `tool`, public projection `planned`.
- [x] Add a `tool` portfolio category and a visible “工具” section without repurposing the current platform/blog category.
- [x] Add a planned Canvas card/detail placeholder with truthful positioning, owner and unknowns.
- [x] Set publication to `planned + case-only`; provide no fabricated public URL, screenshot, online badge or direct CTA.
- [x] Add a documented online checklist for domain, title/favicon, mobile/core flow, privacy/storage/quota/deletion, evidence, status, assistant knowledge and synthetic.
- [x] Do not add Canvas to active site-status targets until a public URL and online evidence exist.

### Validation

- [x] Run registry/publication contracts and confirm Canvas cannot expose a direct CTA.
- [x] Run `npm.cmd run project-details:check`.
- [x] Run `npm.cmd run check:ui:smoke` and focused tool-section screenshots at desktop/mobile widths.
- [x] Run `npm.cmd run lint` and `npm.cmd run build`.

### Rollback point

- Remove the planned projection and tool-section entry; no external resource or persistent data is affected.

## Slice E. Product-level Public Assistant And AI Daily Acceptance

### E1. Public assistant deterministic audit/fixes

- [x] Build an acceptance matrix document from the PRD and link each row to an existing/new check.
- [x] Exercise controlled fixtures for cold start, timeout, network loss, model unavailable, empty RAG, partial citations and history persistence.
- [x] Fix discovered UI/state defects in the smallest owning module.
- [x] Validate edit/resend, retry, branch, cancel, history, full-screen and mobile overflow.
- [x] Ensure diagnostic copy is useful but never reveals provider, endpoint, key or internal stack details.

Focused checks:

- `npm.cmd run assistant:public-api-check`
- `npm.cmd run assistant:public-conversation-check`
- `npm.cmd run assistant:public-browser-state-check`
- `npm.cmd run assistant:public-persistence-check`
- `npm.cmd run assistant:public-quality-check`
- `npm.cmd run check:ui:smoke`

### E2. Public assistant manual product gate

- [x] Prepare one real business request and acceptance sheet; ask for explicit approval immediately before execution.
- [x] Use the user-approved bounded poetry task to verify candidate generation channels; keep only the successful `grok-4.5` Responses channel in the production configuration and leave unverified fallback/vision routes disabled.
- [x] Deploy the single-channel contract to Cloudflare Pages before Render Public API, then verify `/health`, relay authentication, and model allowlisting without calling the upstream model.
- [x] Execute the first approved real site question once, record the degraded result, identify the missing Render model-base configuration, repair it, and verify only non-model health/relay contracts.
- [x] Add dedicated BIAU Beacon public knowledge, aliases, entity relations, retrieval weighting and a no-model regression case after the first request was incorrectly grounded in Legal RAG.
- [x] Deploy the new knowledge assets to Public API and RAG Orchestrator at `fdd733a8`, complete the version-matched Public RAG sync, and verify public/API health plus Supabase pgvector vector/keyword/reranker readiness without sending a model request.
- [x] Obtain a new explicit approval before replaying the same real business question; the earlier approval was consumed by the failed request.
- [x] Deploy `d1ec7adb` across Cloudflare Pages, Public API and RAG Orchestrator, then verify production health and pure retrieval: `site:public-assistant` ranks first with deterministic reranking and no answer-generation request.
- [x] Verify the browser recovery action by blocking the first stream before it reaches the API, restoring connectivity, and explicitly retrying; the approved question reaches the API exactly once, so the browser fault does not induce a provider failure or duplicate turn.
- [x] Deploy `65c8af15` across Cloudflare Pages, Public API and RAG Orchestrator, then classify the next approved failure as `relay_function`, `relay_edge`, or `relay_upstream` without provider/model/endpoint/request identifiers.
- [x] Execute the third approved site question once. Production created exactly one Request/Turn/Revision, retrieval returned four site evidence items and three Beacon citations, but generation remained `degraded`; Cloudflare recorded three custom-domain relay `502` responses and zero matching upstream subrequests.
- [x] Switch Render's relay base from the visitor custom domain to stable `https://biau.pages.dev/api/model-relay`, update deployment drift checks, and redeploy without sending another model request.
- [x] Prepare the server-side CPA cutover with exact `free5/DeepSeek-V4-Flash` identity, no committed URL/key, and a production single-attempt generation boundary; do not modify the CPA repository.
- [x] Complete an approved real request with a non-degraded model answer. The 2026-08-16 real visitor SSE task returned `answered` / `model` with one generation attempt and one verified citation; the cited route returned `200`, the temporary session was deleted, and the earlier acceptance already proved desktop refresh persistence, offline recovery and 390px mobile containment without duplicate model calls.
- [x] Record only low-sensitive evidence and mark the product `产品可用`, `待验收` or truthful degraded state.
- [x] Never turn this into a scheduled model probe.

Operational note: a local documentation-tool preflight accidentally ran one unrelated Smart Search connectivity chat and model-list request. It did not use the production assistant or create another site Turn, but it violated this task's no-probe boundary and must not be repeated.

### E3. AI Daily deterministic audit/fixes

- [x] Build an editor/public acceptance matrix and map current pipeline states to user actions.
- [x] Validate source evidence, freshness, dedupe, ranking, generation state, editorial lifecycle, export and public payload through existing contracts/fixtures.
- [x] Fix misleading empty/error/stale actions or Studio navigation gaps found by the audit.
- [x] Ensure no UI/docs claim unattended daily publishing while Cron is disabled.

Focused checks:

- `npm.cmd run ai-daily:contracts-check`
- `npm.cmd run ai-daily:production-readiness-check`
- `npm.cmd run ai-daily:source-check`
- `npm.cmd run ai-daily:evidence-check`
- `npm.cmd run ai-daily:freshness-check`
- `npm.cmd run ai-daily:dedupe-check`
- `npm.cmd run ai-daily:ranking-check`
- `npm.cmd run ai-daily:quality-check`
- `npm.cmd run ai-daily:public-payload-check`
- `npm.cmd run ai-daily:public-feed-check`
- `npm.cmd run studio:review-policy-check`

### E4. AI Daily manual product gate

- [x] Obtain explicit approval before real-source/model execution and execute one bounded first-edition attempt plus one approved same-Edition rerun without automatic retry.
- [x] Prepare and explicitly approve zero-call CPA static proposal `ai-daily-cpa-deepseek-v4-flash-static-v1` (`508e23df7a6b53f7aee74fee6845fc5686f2b5988208e1a745be3868cefbb263`), producing bundle `4fa08db8374bef1e8bdc485ad626a69b3765da6efdbda6a8f7253aaa24a70248` with one exact model candidate per role and `modelCalls=0`; deliver the Render runtime/Secret File/hash and validate them through the Shell-less Studio startup check (`networkCalls=0`).
- [ ] Generate one real Edition, review sources and claims in Studio, and require human approval.
- [ ] Run Publish Export, deploy the public payload and verify Feed/detail on desktop/mobile.
- [ ] Record and seal the complete low-sensitive acceptance evidence after a future successful review/export/deployment; rollback evidence for the failed run is already sealed and Cron remains disabled.

### Rollback point

- Failed acceptance keeps the product in `待验收`/degraded state. It does not delete test data automatically or publish a failed Edition.
- The latest approved run is `cmsxar81600004bal6qbas8wr`. Both extractor calls, both composer calls, and both verifier calls succeeded, but deterministic validation rejected/discarded Revision 14 (`cmsxauh6s000c4bal87hkuhip`) for `scope_inflation` in subtitle, introduction, and one event impact block plus missing official evidence for claim `grok-bot-launch`. There is no draft, review, export, deployment, or public Feed. The zero-call `ai-daily-prompt-v7` repair now derives an explicit publishable claim set, event/trend removal and block-rewrite directives, prevents event-id renaming from restoring removed claims, and requires Chinese editorial text while preserving every evidence floor. Its 27-contract and build/documentation gates pass locally with zero external provider calls. Prompt drift invalidated the v6 bundle; replacement proposal `a5274c8a147de67e6ae00c912e0e370b46efbb4a2d8b668e3a51d6a21784edb8` and bundle `962243d6fe24a996d5b2994ba83edcac4fdb8f7f311c657d9194dc99d71aa464` are now approved and delivered through disabled-state deploy `dep-da1j8im417fc73ajorag`, whose startup/HTTP/queue checks made no model call. Production generation, stage diagnostics, public Feed, and business evaluation are disabled and Cron is not created. Another real provider call still requires a separate explicit Edition approval.

- 2026-08-18 approved v7 real Edition: generation-only deploy `dep-da1ruibl550s73all83g` and one protected submission created Run `cmsy2ipki00003sfrvpopyrp2` / work item `cmsy2ippu00013sfrufqm4ixh` (attempt 16). Exactly one extractor call failed with `provider_rate_limited`; composer/verifier were not reached. Revision 15 `cmsy2isvd00083sfrt5s54ll8` was `REJECTED` / `DISCARDED`, with no draft or public content. Generation was immediately disabled; closing deploy `dep-da1sihf40ujc738nkkq0` is live with zero queues/active stages/expired leases, Feed `404`, and zero error-level logs. The next action is a capacity/rate-limit decision followed by a new Edition approval.
- Studio generation diagnostics now translate the fixed `provider_rate_limited` category into low-sensitive Chinese copy and show the explicit recovery boundary: inspect channel quota/concurrency, restore capacity or deliver a newly approved mapping, then obtain a new Edition approval. The UI does not expose provider/model/endpoint identity or invite a direct retry.

## Final Integration Gate

- [x] Run `npm.cmd run lint`.
- [x] Run `npm.cmd run build`.
- [x] Run `npm.cmd run status:contract`.
- [x] Run `npm.cmd run project-details:check`.
- [x] Run `npm.cmd run public-links:check` without writing public snapshots; document current network resets rather than treating them as product evidence.
- [x] Run relevant public-assistant and AI Daily contract suites.
- [x] Run desktop/mobile UI smoke and inspect no-overflow screenshots.
- [x] Review `git diff --check` and ensure unrelated user changes are excluded; keep the locally failed `public/status/blog-semi-synthetic.json` snapshot unstaged.
- [x] Update manual-gate documentation with only genuinely unresolved production actions.
- [x] 2026-08-18 continuation: browser-only public entry observation refreshed across the master site, Legal RAG, Chatus, Anchor, Pet, Playlab, Xunqiu and ERP; Ozon publication CTA downgraded to `unchecked`, Playlab trial-root 404 recorded without disabling valid game entries, and the homepage contrast/mobile CTA hierarchy was rechecked at 1440, 390 and 320 widths.
- [x] Record the post-migration RLS drift found on three internal assistant tables; `anon` / `authenticated` have no direct table grants, and remediation is deferred to a separate migration-backed security task.
- [x] Align the homepage implementation with Figma frames `32:3` and `32:4`: keep the four real public route families, add the product-positioning/status summary, preserve publication-registry CTA decisions, and adopt the 8px deep-ink/cyan/amber port-board system. Validate 320/390/430 mobile containment and 1440 desktop composition through the full UI suite, lint, build, registry, status and performance gates.

## Files With Elevated Risk

- `src/data/portfolio.ts`: large content catalog; avoid broad formatting or unrelated copy churn.
- `src/components/PublicAssistantWidget.tsx`: large stateful UI; changes require focused conversation and viewport checks.
- `src/data/statusTargets.ts`: names, status semantics and generated projections can drift together.
- generated assistant knowledge and sitemap assets: regenerate only after source changes and review the diff.
- `public/status/*.json`: do not write or commit local failure snapshots without explicit approval.

## Before `task.py start`

- [ ] User reviews `prd.md`, `design.md`, `implement.md` and approves implementation.
- [ ] Confirm inline execution remains active; JSONL seed rows are not used as implementation instructions.
- [ ] Start the parent task only after approval.
