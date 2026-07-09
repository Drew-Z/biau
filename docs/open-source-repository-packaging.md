# Open-Source Repository Packaging Checklist

This checklist is the shared packaging standard for BIAU Port repositories. It is meant for public README and deployment documentation work. Do not use it to publish secrets, production credentials, private URLs, admin passwords, model relay endpoints, database URLs, signing material, or unapproved APK links.

## README Structure

Use this layout as a baseline, then adapt it to the repository type:

```markdown
# Project Name

One-sentence value statement.

Badges for stack/runtime/license/build status when accurate.

## Preview
## What It Does
## Features
## Architecture
## Quick Start
## Configuration
## Deployment
## Project Structure
## Scripts And API
## Testing
## Roadmap
## Security
## License
```

## Repository Audit

Before editing a README, inspect the current repository rather than trusting the existing README:

- local instructions: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`;
- package and build files: `package.json`, workspace manifests, Dockerfiles, Compose files, CI workflows;
- runtime contracts: API routes, env parsing, migrations, health checks, scripts, static hosts, mobile build files;
- docs and public assets: architecture docs, deployment docs, screenshots, diagrams, release notes;
- validation commands: the cheapest commands that prove quick start, build, tests, and deploy config claims.

Record any manual gate instead of pretending it is complete:

- repository visibility, topics, GitHub description, Pages/Releases/Actions settings;
- cloud provider variables, custom domains, deploy buttons, dashboards;
- demo credentials and password rotation;
- production model/database/vector/analytics keys;
- release signing, APK/AAB upload, public download approval.

## Public-Safe Rules

README files and public docs may include:

- placeholder env names such as `DATABASE_URL` or `LLM_API_KEY`;
- fake or local demo values such as `http://localhost:4000`;
- public-safe screenshots that contain no credentials or private data;
- Mermaid diagrams without private hosts or secret-bearing labels;
- verified commands and honest limitations.

They must not include:

- real API keys, bearer tokens, invite codes, admin passwords, model keys, database URLs, or signing paths;
- private cloud dashboards, private backend URLs, IPs, or provider endpoints;
- fake badges, fake deploy buttons, fake metrics, or fake download counts;
- debug APKs or unapproved artifacts presented as official releases;
- old positioning such as resume/interview-only framing for normal open-source projects.

## Claim Verification

Only make claims that have evidence:

- "Quick Start" commands should be runnable from a fresh clone or clearly marked as requiring external services.
- Docker/Compose support should be backed by an existing config and at least `docker compose ... config`.
- Static deployment instructions should name the real build command and output directory.
- API deployment instructions should name health paths and required server-only env variables.
- Mobile release instructions must separate debug builds from release signing and public release approval.
- If a live production check needs credentials or cloud console access, write it as a manual gate.

## Repository-Type Notes

- **Static/Vite site**: document `npm ci`, build command, output directory, preview command, required `VITE_*` public variables, and hosting provider setup.
- **Node API**: document runtime version, env table, health endpoint, migration command, start command, Docker option, and smoke tests.
- **RAG project**: document ingestion, retrieval, rerank, model provider, vector store, evaluation fixtures, and fallback behavior without exposing provider credentials.
- **Android/app project**: document JDK/Gradle/SDK versions, debug build, release signing gate, checksum policy, and where public releases are approved.
- **Game/static showcase**: document playable route, asset pipeline, build/preview commands, browser constraints, and hosting target.

## Per-Repository Status Note

Use this table in task notes or repository docs when auditing:

| Field | Notes |
| --- | --- |
| Repository | Absolute local path and Git remote. |
| Current README | Good / stale / missing, with concrete reason. |
| Runtime stack | Derived from source/config, not old README copy. |
| Quick start | Verified commands and result. |
| Deployment | Existing provider docs/configs and missing gates. |
| Assets | Public-safe screenshots/diagrams available or missing. |
| Tests | Commands run and whether they avoid live secrets. |
| Manual gates | Cloud, credentials, releases, analytics, production validation. |
| Follow-up | Small fixes or later larger work. |
