# Xunqiu Showcase Health And Doc Entry Sync Design

## Scope

Touched repositories may include:

- `D:/workspace4Codex/xunqiu/xunqiu-showcase-site`: static HTML/Markdown showcase docs.
- `D:/workspace4Cursor/blog-semi`: portfolio data, public assistant knowledge, sitemap.

The independent backend repository is evidence for health/smoke behavior. Do not change backend code unless a concrete issue blocks the documentation sync.

## Public Data Boundary

Do not copy legacy README IPs, JDBC values, test passwords, signing paths, or Render/R2 environment values into public surfaces. Use generic terms such as "Render health endpoint", "smoke-test script", and "stage APK copy".

## Health Wording

Because the public health URL may cold-start or timeout, public copy should say:

- health/smoke checks exist and what they cover;
- cold start or timeout requires retry/log inspection;
- the static showcase does not prove backend uptime;
- Render/R2 demo links are suitable for showcase validation, not a production SLA claim.

## Main Site Source

Use `src/data/portfolio.ts` as the single source for project detail and assistant facts, then regenerate:

- `server/data/public-knowledge.json`
- `public/sitemap.xml` if route set changes or by regular release hygiene.
