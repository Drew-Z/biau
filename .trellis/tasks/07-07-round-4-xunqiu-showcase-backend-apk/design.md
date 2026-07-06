# Xunqiu showcase backend and APK consistency design

## Scope

This task verifies Xunqiu public showcase, modern backend smoke status, compatibility API reporting, and APK release wording. BIAU Port owns the public status script/data. `D:\workspace4Codex\xunqiu` is the showcase/legacy workspace, and `D:\workspace4Codex\xunqiu-backend-modern` is the modern Spring Boot backend.

## Boundaries

- Do not publish old backend IPs, private databases, R2 bucket URLs, Render dashboard URLs, test passwords, signing paths, or local artifact paths.
- The showcase may offer a stage APK if already public, but BIAU Port status must call it a stage package, not a fully approved release.
- Production backend URL and R2/database configuration remain manual gates unless already provided through safe environment variables.
- If editing either Xunqiu repo, first recheck that repo's own rules and git state. Prefer main-site status/reporting improvements unless a repo-local bug blocks the public demo.

## Current Evidence

- Showcase source exists under `D:\workspace4Codex\xunqiu\xunqiu-showcase-site`.
- The static site documents BIAU Port / 泊岸 branding, technical docs, and `downloads/latest-xunqiu64.apk` as a 64-bit stage APK.
- Modern backend repo `D:\workspace4Codex\xunqiu-backend-modern` is a Spring Boot 3 / Java 17 / PostgreSQL / Flyway service with `scripts/smoke-test.ps1`.
- Current `public/status/xunqiu-synthetic.json` is unconfigured because `XUNQIU_SYNTHETIC_API_BASE_URL` is absent.
- Existing `scripts/check-xunqiu-synthetic.mjs` can check backend health and compatibility APIs, but it should preserve existing reports when unconfigured and sanitize network failures.

## Technical Design

1. Improve Xunqiu synthetic safety:
   - Missing API base should preserve an existing report by default, with a force flag for deliberate unchecked regeneration.
   - Network failures should persist low-sensitive classes such as `timeout`, `dns_error`, `tls_error`, `connection_error`, or `network_error`.
   - Reports should not store API base URL, request URLs, private hosts, raw errors, response bodies, or credentials.

2. Add APK gate evidence:
   - Scan only configured/public artifact roots and persist sanitized artifact metadata: file name, build type, size, timestamp, and gate summary.
   - Keep `publicDownloadApproved=false` unless a human-approved signed release checklist exists.
   - Distinguish `stage-apk-found`, `release-candidate-found`, `debug-only`, and `no-artifact`.

3. Refresh public status:
   - Run `xunqiu:synthetic` without API base to verify preserve behavior or write safe unchecked output.
   - Run `site:status` so status detail reflects current showcase entry and APK gate wording.
   - Update manual gates and static status copy only where it improves clarity.

## Rollback

- If artifact classification is too broad, revert the script and regenerate the previous report.
- If a stage APK exists but lacks formal release evidence, keep public release gate closed and state the limitation.
- If backend base URL is not configured, do not infer or scrape it from private docs; leave health/compat checks unchecked and record the manual gate.
