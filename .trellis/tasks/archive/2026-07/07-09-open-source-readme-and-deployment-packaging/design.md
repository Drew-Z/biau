# Open-Source README And Deployment Packaging Design

## Work Model

This is a multi-repository parent task. Work should be split into child tasks per repository or per template milestone:

1. Shared template and audit checklist.
2. Main site `blog-semi`.
3. `legal-rag`.
4. `erp`.
5. `pet`.
6. `xunqiu` / `xunqiu-backend-modern`.
7. `game` / Playlab.

Each child task must be independently verifiable and must record repository-specific commands, manual gates, and push/deploy rules.

## Parallelization Policy

Planning and auditing can run in parallel across repositories because those steps are read-heavy and produce independent notes. Implementation should be parallelized only when file ownership is separate:

- Safe to run concurrently: repository audits, screenshot/diagram inventory, README gap analysis, manual-gate collection, and child-task planning for different repositories.
- Safe to implement concurrently in separate worktrees or sessions: README-only changes in different repositories, `.env.example` updates in different repositories, and independent docs/diagram additions.
- Should stay sequential: changes inside the same repository, anything touching `blog-semi` project/status data, assistant knowledge indexing, shared README template edits, and final cross-site sync.
- Should wait for the related feature task to stabilize: `blog-semi` README sections that describe the internal assistant architecture, because the LangGraph Agent Workspace task may still change the truthful implementation details.

Current session constraint: inline mode does not dispatch implementation/check sub-agents, so the main session should execute one implementation slice at a time. The task may still be planned as independently verifiable child tasks so another session or worktree can pick up a different repository without blocking.

## README Template Contract

Each README should use this high-level layout:

```markdown
# Project Name

<one-line value statement>

Badges

## Preview
## Why This Exists
## Features
## Architecture
## Quick Start
## Configuration
## Deployment
## Project Structure
## Scripts
## Testing
## Roadmap
## Security
## License
```

The template is a guide, not a forced exact copy. For example:

- Android repos need Build APK / Release Signing sections.
- Backend repos need API / Database / Migration sections.
- Static showcases need Preview / Asset Pipeline / Static Hosting sections.
- RAG repos need Ingestion / Retrieval / Model Provider / Vector Store sections.

## Repository Audit Contract

Before editing a repository README:

- Read project-local `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, README, package/build files, Docker/deploy configs, and scripts.
- Identify the true runtime stack and versions from source/config, not stale README text.
- Run the cheapest local verification command for quick-start claims.
- Record what cannot be verified without user/platform credentials as manual gates.

## Deployment Packaging Rules

- If a repo already has working Docker / Compose, document and verify it.
- If a repo lacks Docker but has simple Node/Java startup, prefer documented local startup first.
- Add Docker only when it is low-risk and can be verified locally.
- For mobile apps, document debug build separately from release signing. Never call debug APK an official public release.
- For cloud hosts, document provider-neutral steps first; provider-specific buttons are optional and require accurate public repo URLs.

## Main Site Integration

When README changes reveal public facts that should appear on BIAU Port:

- Update `src/data/portfolio.ts` only with public-safe facts.
- Regenerate assistant knowledge with `npm.cmd run assistant:index`.
- Run relevant checks such as `project-details:check`, `public-links:check`, `lint`, and `build`.

## Dependencies

- `blog-semi` internal assistant architecture documentation depends on `07-09-internal-assistant-langgraph-agent-workspace` reaching a stable implementation. Until then, the README task may audit the main repo and prepare templates, but should not finalize architecture claims for the internal assistant.
- Other repository README slices do not depend on the LangGraph task unless they document shared assistant APIs, shared RAG services, or BIAU Port deployment topology.

## Manual Gates

Manual gates must be explicit:

- GitHub repository visibility/description/topics.
- GitHub Pages / Releases / Actions settings.
- Cloud provider deploy buttons and account-side settings.
- Demo credentials.
- Production model, database, vector store, or analytics keys.
- Release APK/AAB signing and upload.

## Rollback

README/doc changes can be reverted per repository. Script/config changes must be small and verified before commit. Do not make a repo claim support for a startup path that has not been tested.
