# Blog Content Backlog - 2026-07-02

## Mode Gate

- Writing mode: review-only / Codex-only backlog.
- Model channel: none.
- Live model calls: not run.
- Publishing: not performed.
- Runtime blog data: not changed.

## Evidence Sources Read

- `src/data/blogShared.ts`
- `src/data/blog.ts`
- `src/data/blogCuration.ts`
- `scripts/blog-rewrite-plan.json`
- `content-drafts/README.md`
- `content-archive/legacy-blog/rewrite-queue.json`
- `.agents/skills/blog-content-pipeline/SKILL.md`
- `.agents/skills/blog-content-pipeline/references/review-and-prompts.md`
- `.agents/skills/blog-content-pipeline/references/usage.md`

## Current Inventory

- Public featured posts: 10.
- Legacy archived sources: 87.
- Scripted rewrite plan entries: 13.
- Current non-public drafts: 12 Markdown files plus draft support assets.
- Public columns:
  - `knowledge`: reusable technical understanding and engineering methods.
  - `project-notes`: project retrospectives, tradeoffs, lessons, and iteration direction.
  - `resources`: user-curated resources with personal judgment.
  - `ai-daily`: source-backed short-cycle AI updates.
  - `build-log`: site, assistant, workflow, and content-system construction notes.

## Recommended Next Queue

| Priority | Candidate | Column | Recommended Mode | Why Next | Main Gate |
|---:|---|---|---|---|---|
| 1 | `rag-overview-public` | knowledge | review-only, then optional model-assisted polish | Lowest overlap with project pages and useful as evergreen entry point. | Recheck current Legal RAG facts and keep it conceptual. |
| 2 | `chunk-strategy-public` | knowledge | review-only, then optional model-assisted polish | Existing draft is close to a durable technical note. | Verify chunk claims against current RAG evidence before promotion. |
| 3 | `embedding-vector-search-public` | knowledge | Codex scaffold first | Good follow-up to the RAG basics sequence. | Needs fresh evidence and examples before drafting. |
| 4 | `agent-tool-calling-public` | knowledge | Codex evidence pack, then model-assisted draft if approved | Can connect ERP PendingAction, Pet gates, and Legal RAG review tools without being one project note. | High risk of overclaiming automation; needs tight permissions framing. |
| 5 | `blog-content-system-build-log-draft` | build-log | review-only update | The content pipeline and model wizard now have more real evidence. | Avoid repeating already published build-log content. |

## Project Notes Queue

Project detail pages are now much richer, so project-note articles should not
repeat stable feature lists. Treat these drafts as optional essays about
tradeoffs, migration decisions, failure modes, and lessons learned.

| Candidate | Keep / Reframe | Reason |
|---|---|---|
| `legal-rag-project-notes-draft` | Reframe | Focus on citation quality, contract risk schema, and evaluation lessons. |
| `ozon-erp-project-notes-draft` | Reframe | Focus on auth entry, protected writes, plugin boundary, and queue/run-mode decisions. |
| `xunqiu-modernization-project-notes-draft` | Keep after evidence refresh | Migration story is distinct from the project page if it centers on risk reduction. |
| `playlab-games-project-notes-draft` | Reframe | Use as a game showcase publishing-method note, not a duplicate catalog. |
| `pet-workspace-project-notes-draft` | Keep as WIP only | Must clearly say WIP and APK pending; no fake production claims. |
| `blog-semi-project-notes-draft` | Reframe | Better as a build-log or knowledge note about public content governance. |

## Column-Specific Guidance

### Knowledge Notes

- Best immediate lane for polished public posts.
- Prefer evergreen topics from the rewrite plan.
- Use project examples as evidence, not as the article body.
- Image policy: diagrams or real safe screenshots only when they explain the concept.

### Project Notes

- Publish only when the article adds process, tradeoff, or lesson value beyond
  the project detail page.
- Avoid duplicating tech stack, route lists, deployed links, and stable capability lists.
- Human review should decide whether each project note is worth publishing.

### Resource Picks

- Do not auto-generate resource lists.
- Wait for user-selected resources, then add personal judgment: why it matters,
  who it helps, what limitation to watch.
- Model assistance can polish structure, but resource selection should be human-led.

### AI Daily

- Requires current web sources and date-sensitive verification.
- Use `smart-search-cli` or equivalent source retrieval before drafting.
- Do not write daily posts from memory or model-only summaries.
- Human approval needed for source selection and final publishing.

### Build Log

- Good fit for Trellis, assistant, content-pipeline, and deployment workflow changes.
- Must record what actually changed and what remains manual.
- Avoid internal diary tone; write for someone building a similar site.

## Model Strategy For Future Runs

- Codex owns evidence packs, safety review, comparison, and final ingestion.
- Use `strong` for long-form drafting only after setup and explicit approval.
- Use `review` for polish after Codex compares the model draft against evidence.
- Use `fast` for outlines or clustering only when a live call is explicitly approved.
- Default to serial model calls. Use separate relays before any parallel comparison.
- Keep provider labels non-secret; never commit real relay URLs or API keys.

## Image Policy

- Prefer real project screenshots when the UI/state is safe.
- Prefer self-made diagrams for architecture, workflow, and data-flow posts.
- Generated images are optional covers only, not evidence.
- Do not generate fake dashboards, product screenshots, metrics, logs, customer logos, or deployment states.
- Any image generation prompt needs human approval before use in a public asset.

## Human Approval Required

- Publishing or promoting any draft into runtime blog data.
- Deleting legacy archive entries or removing draft files.
- Running live model generation, live model doctor, or image generation.
- Choosing resources for `resources`.
- Choosing sources for `ai-daily`.
- Claiming a project is production-ready or publicly downloadable.
- Adding real APK links, deployment URLs, credentials, private endpoints, or sensitive metrics.

## Safe Next Commands

```powershell
npm.cmd run blog:plan
npm.cmd run blog:draft -- --slug rag-overview-public --force
npm.cmd run blog:draft -- --slug chunk-strategy-public --force
npm.cmd run blog:check
```

Use model-assisted commands only after the mode gate, model setup/status/doctor
checks, evidence pack, and explicit approval for that specific generation step.
