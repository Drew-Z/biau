# Xunqiu Showcase And Backend Open-Source README Slice

## Scope

Repositories:

- `D:\workspace4Codex\xunqiu\xunqiu-showcase-site`
- `D:\workspace4Codex\xunqiu-backend-modern`

Goal: package the Xunqiu static showcase and Spring Boot backend as reusable open-source repository entries, while keeping the Android APK, legacy backend address, storage credentials, and release-signing boundary public-safe.

## Dependencies

- Parent task: `07-09-open-source-readme-and-deployment-packaging`.
- Local repo rules: no `AGENTS.md`, `CLAUDE.md`, or `.cursor/rules` found in either committable Xunqiu repository.
- Showcase branch: `main`.
- Backend branch: `main`.

## Evidence Read

Showcase:

- `README.md`
- `index.html`
- `docs.html`
- `_headers`
- `.gitignore`
- `docs/technical/overview.md`
- `docs/technical/legacy-app.md`
- `docs/technical/android64-rebuild.md`
- `docs/technical/video-pipeline.md`
- `docs/technical/validation-and-deploy.md`
- `assets/*`
- `downloads/latest-xunqiu64.apk`

Backend:

- `README.md`
- `pom.xml`
- `Dockerfile`
- `render.yaml`
- `.gitignore`
- `docs/render-deploy-checklist.md`
- `scripts/smoke-test.ps1`
- `src/main/resources/application.yml`
- `src/main/resources/application-prod.yml`
- `src/main/resources/db/migration/V1__schema.sql`
- `src/main/resources/db/migration/V2__seed.sql`
- `src/main/java/com/playlab/xunqiu/backend/api/*`
- `src/main/java/com/playlab/xunqiu/backend/config/*`
- `src/main/java/com/playlab/xunqiu/backend/service/*`
- `src/test/java/com/playlab/xunqiu/backend/*`

Android evidence only:

- `D:\workspace4Codex\xunqiu\xunqiu-android64\README.md`

## Changes

Showcase repository:

- Rewrote `README.md` into a full open-source style entry point.
- Documented static-site scope, Cloudflare Pages settings, public-safe assets, technical docs, and no-build quick start.
- Added Mermaid architecture showing the static showcase, stage APK, Android client, backend, PostgreSQL, and optional R2 boundary.
- Reframed `downloads/latest-xunqiu64.apk` as a stage/demo artifact, not an official app-store release.
- Added security, roadmap, and license gate notes.

Backend repository:

- Rewrote `README.md` as a reusable Spring Boot backend entry point.
- Removed the old legacy backend IP from public README guidance.
- Added architecture, quick start, configuration table, Docker, Render Blueprint, API surface, testing, security, roadmap, and license gate sections.
- Added `.env.example` as a public-safe environment reference with blank secrets.
- Rewrote `docs/render-deploy-checklist.md` to remove local absolute paths and old backend addresses.
- Changed `render.yaml` so `APP_PUBLIC_BASE_URL` is `sync: false` instead of a fixed historical Render service URL.
- Parameterized `scripts/smoke-test.ps1` with `-DemoPhone` and `-DemoPasswordSha1`, while keeping defaults aligned with local seed data.

## Validation

Showcase passed:

```powershell
git diff --check
Test-Path .\index.html
Test-Path .\docs.html
Test-Path .\downloads\latest-xunqiu64.apk
Test-Path .\assets\football-hero.jpg
Test-Path .\docs\technical\validation-and-deploy.md
```

Additional static check:

- Parsed local `href` targets in `index.html` and `docs.html`; all repository-relative targets exist.
- Sensitive-shape scan found no IP, `sk-*`, private key block, or non-empty secret assignment in changed docs/config. The showcase README still contains a sample `rg` command naming `DATABASE_URL`, which is documentation, not a value.

Backend passed:

```powershell
git diff --check
mvn test
mvn -DskipTests package
.\scripts\smoke-test.ps1 -BaseUrl "http://localhost:18080/free_kicker"
docker build --pull=false -t xunqiu-backend-modern:readme-check .
```

Backend details:

- `mvn test` passed with 10 non-PostgreSQL tests and 1 Testcontainers PostgreSQL test skipped.
- The PostgreSQL Testcontainers test was re-run directly and still skipped because the Java Docker client could not detect a valid Docker environment, even though the Docker CLI could build the image. This is recorded as an environment limitation, not a code failure.
- Local smoke required launching the jar with the JDK 17 executable because the default `java` on PATH points to JDK 8.
- Sensitive-shape scan over backend README, deployment docs, `render.yaml`, `scripts`, and `.env.example` found no real IPs, fixed historical Render URL, `sk-*`, private key block, or non-empty secret assignment.

Committed and pushed:

- Showcase repository: `117d3ba docs: package xunqiu showcase for open-source use`
- Backend repository: `87a0f1b docs: package xunqiu backend for open-source use`

## Manual Gates

- Choose and add licenses before advertising the repositories for unrestricted open-source reuse.
- Confirm GitHub repository descriptions/topics/visibility.
- Confirm whether `downloads/latest-xunqiu64.apk` should remain publicly downloadable, and publish SHA-256/release notes if approved.
- Provide official release signing/AAB/APK policy before calling any APK an official release.
- Fill `APP_PUBLIC_BASE_URL` in Render after Blueprint creation.
- Fill R2 variables only in Render or another secret manager if media upload should write to object storage.
- For backend production use, add authentication, rate limiting, stricter CORS, audit logging, backup strategy, and demo-seed separation.
