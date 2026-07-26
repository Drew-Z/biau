# Project Engineering Notes

This directory preserves source-backed implementation knowledge for four systems that are easy to describe too loosely in a portfolio: Chatus, Anchor Learning, the BIAU Port public assistant, and AI Daily. The material is written for architecture review, maintenance, and technical interviews; it is not runtime configuration.

## Scope And Privacy Boundary

- Chatus is documented as an invitation-only workspace. These notes do not include its private repository URL, access material, member data, provider identity, managed credentials, or operational metrics.
- Anchor's browser Demo is documented separately from the Flutter client. The Demo has bundled data and no backend, upload, analytics, or live AI request.
- Public-assistant notes cover the public projection only. Prompts, internal diagnostics, private retrieval collections, credentials, and provider configuration remain out of scope.
- AI Daily notes distinguish implemented code, deployed infrastructure, production observations, and still-disabled behavior. No real model call is triggered by these documents or their checks.

## Evidence Labels

- `source-verified`: confirmed from code, tests, or a versioned repository contract.
- `production-observed`: recorded by a production acceptance or incident artifact; it is not a promise of current health.
- `documented-design`: an explicit intended design or rollout boundary that may not be fully enabled.
- `portfolio-claim`: a public summary that has not yet been upgraded to stronger repository evidence.

Evidence IDs resolve through the [evidence register](./evidence-register.md). Cross-repository entries use repository label, commit, path, and symbol or section. They never use a developer-machine absolute path.

## Document Map

- [Chatus dossier](./chatus.md)
- [Anchor dossier](./anchor.md)
- [Public assistant dossier](./public-assistant.md)
- [AI Daily dossier](./ai-daily.md)
- [Cross-project patterns](./cross-project-patterns.md)
- [Interview question bank](./interview-question-bank.md)
- [Evidence register](./evidence-register.md)

## Validation

Run `npm.cmd run docs:project-notes-check`. The checker enforces the eight required files, mandatory headings, evidence references, repository-safe links, sensitive-pattern exclusions, four project buckets with at least 25 Q&A items each, a cross-project bucket with at least 20 items, and at least 120 questions overall. Cross-repository commit/path checks use the maintainer worktree's `../chatus` and `../learn/anchor` checkouts; no private remote URL is embedded in the documents or checker.
