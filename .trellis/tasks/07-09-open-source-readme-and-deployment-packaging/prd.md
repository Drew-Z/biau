# Open-Source README And Deployment Packaging

## Goal

把 BIAU Port 主站和关联仓库整理成正常开源项目形态：README 清楚说明项目价值、功能、架构、快速开始、配置、部署、测试和安全边界；项目描述不再像内部记录或展示草稿，而是让外部开发者可以 clone、配置、运行、部署、二次开发。

## Target Repositories

Initial scope:

- `D:\workspace4Cursor\blog-semi`
- `D:\workspace4Cursor\legal-rag`
- `D:\workspace4Cursor\erp`
- `D:\workspace4Cursor\pet`
- `D:\workspace4Codex\xunqiu`
- `D:\workspace4Codex\xunqiu-backend-modern`
- `D:\workspace4Cursor\game`

Each repository must be inspected from real files, scripts, deployment configs, and current implementation. Do not rely only on existing README because it may be stale.

## Execution Decision

This is a parent task with independently verifiable repository slices.

- Repository audits, README gap analysis, asset inventory, and manual-gate collection may run in parallel because they are read-heavy and repo-scoped.
- README/deployment implementation should be committed per repository so each slice remains easy to verify and roll back.
- The current inline session executes one implementation slice at a time; no implement/check sub-agents are dispatched.
- `blog-semi` README sections that describe the internal assistant should wait until the LangGraph Agent Workspace task is stable, so the public architecture description stays truthful.
- Shared template edits, main-site project/status data sync, assistant knowledge indexing, and final cross-repo checks stay sequential.

## Requirements

### R1. Open-Source README Standard

Each target repository should converge on a consistent open-source README structure:

1. Banner / product screenshot / architecture visual when public-safe assets exist.
2. Project name and one-line value statement.
3. Badges for stack, license, build/test, runtime version, deployment mode when accurate.
4. Table of contents.
5. What it is / who it is for.
6. Features.
7. Architecture.
8. Quick Start.
9. Configuration.
10. Deployment.
11. Project structure.
12. Scripts / API / commands.
13. Testing.
14. Roadmap.
15. Security and privacy.
16. License / contribution notes.

### R2. One-Command Local Start Where Feasible

- Prefer real commands that work from a fresh clone.
- Add or fix `.env.example` when required.
- Add Dockerfile / `docker-compose.yml` only when the project can truthfully support containerized startup without secret leakage.
- Do not claim "one-click deploy" or "one-command start" unless the script/config actually exists and is verified.

### R3. Deployment Path

For each repo, document one or more accurate deployment paths:

- Static site: Cloudflare Pages / Vercel / Netlify style build command and output dir.
- Node API: Render / Docker / local process manager, env table, health check.
- Java backend: JDK/Maven version, build/test/package, deploy env, health endpoint.
- Android app: Gradle/JDK/Android SDK requirements, debug build, release signing gate, APK/AAB public release boundary.
- Game/static showcase: build, preview, static host, playable asset constraints.

### R4. Public-Safe Content

README and docs must not include:

- real API keys, tokens, admin passwords, invite codes
- database URLs or private backend URLs
- model relay base URLs
- production private dashboards
- signing paths / keystore material
- local absolute paths except clearly marked development examples
- unapproved APK download URLs

### R5. Visuals And Diagrams

- Prefer existing public-safe screenshots and diagrams from each repository.
- If diagrams are needed, use Mermaid or repo-native SVG/text diagrams that describe architecture without private endpoints.
- Do not invent screenshots or fake production metrics.

### R6. Cross-Repo Consistency

- Keep repository descriptions aligned with BIAU Port / 泊岸 as the parent ecosystem, while preserving each product name.
- Keep terminology consistent: "Quick Start", "Configuration", "Deployment", "Testing", "Roadmap", "Security".
- Each README should be usable independently without needing to read the main site first.

## Out Of Scope

- Do not publish or rotate secrets.
- Do not make private repositories public from code.
- Do not expose debug APKs as official releases.
- Do not create fake badges, fake downloads, fake cloud deploy buttons, or fake test status.
- Do not rewrite the product itself unless README/deployment verification reveals a small blocking bug.

## Acceptance Criteria

- [ ] A reusable README template/checklist exists in the main repo docs.
- [ ] Each target repository has an inspected status note: current README quality, runnable commands, missing env/deploy pieces, public-safe assets, and manual gates.
- [ ] At least the first priority repository receives a polished README and verified quick-start/deployment instructions.
- [ ] Any "one-command" or "Docker" claim is backed by an actual command/config and a local verification result.
- [ ] Manual gates are listed for items that need user action, such as public repo settings, cloud deploy buttons, release signing, official APK upload, demo credentials, or analytics/tracing provider setup.
- [ ] Main BIAU Port project/status/blog data is updated only when public facts changed and after relevant checks pass.

## References

- Dify README: `https://github.com/langgenius/dify`
- Open WebUI README: `https://github.com/open-webui/open-webui/blob/main/README.md`
- LangGraph README: `https://github.com/langchain-ai/langgraph`
- GitHub README docs: `https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes`
