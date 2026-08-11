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

- [ ] Prepare one real business request and acceptance sheet; ask for explicit approval immediately before execution.
- [ ] Verify recovery by blocking a browser request before it reaches the API, restoring connectivity, and then completing the approved real request; observe desktop/mobile answer, citations and refresh persistence without inducing provider failure.
- [ ] Record only low-sensitive evidence and mark the product `产品可用`, `待验收` or truthful degraded state.
- [ ] Never turn this into a scheduled model probe.

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

- [ ] Ask for explicit approval before real-source/model execution.
- [ ] Generate one real Edition, review sources and claims in Studio, and require human approval.
- [ ] Run Publish Export, deploy the public payload and verify Feed/detail on desktop/mobile.
- [ ] Record low-sensitive acceptance evidence; leave Cron disabled.

### Rollback point

- Failed acceptance keeps the product in `待验收`/degraded state. It does not delete test data automatically or publish a failed Edition.

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
