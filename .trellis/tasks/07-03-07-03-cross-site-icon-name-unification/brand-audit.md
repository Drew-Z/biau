# Brand Audit

## Contract

统一父品牌为 `BIAU Port / 泊岸`，项目名保持独立。浏览器壳、可见壳、主站数据和状态说明都要能证明项目属于泊岸展示体系。

## Surface Matrix

| Project surface | Repository / path | Browser shell | Visible shell | Main-site data | Action in this task | Status |
| --- | --- | --- | --- | --- | --- | --- |
| BIAU Port main site | `D:/workspace4Cursor/blog-semi` | `index.html`, `src/utils/seo.ts`, `/favicon.svg` | `Navigation.tsx` shows `BIAU PORT` + `泊岸` and uses `BiauPortMark` | `portfolio.ts`, `statusTargets.ts`, `assistant.ts` already describe cross-site alignment | Standardized `og:site_name` to `BIAU Port / 泊岸`; normalized favicon SVG formatting to match sibling sites | Updated |
| Ozon ERP | `D:/workspace4Cursor/erp/apps/web` | `index.html` title + `biau-port-icon.svg` | `LoginView.vue` and `WorkspaceLayout.vue` show BIAU Port / 泊岸 + Ozon ERP; `/register` exists and is visible when registration is enabled | Main site records registration and brand shell status | No code edit required in this task; verified by targeted search. API `isSelfRegistrationEnabled()` defaults to open unless `ERP_REGISTRATION_ENABLED` explicitly closes it | Verified |
| Legal RAG | `D:/workspace4Cursor/legal-rag/apps/web` | `index.html` title + `biau-port-icon.svg` | `LoginPanel.vue` and `AppSidebar.vue` show BIAU Port / 泊岸 + Legal RAG; login panel can display low-privilege public demo credentials when deployment provides the public demo credential variable | Main site records demo-gate and brand shell status | No code edit required in this task; verified by targeted search. Credentials remain deployment configuration, not committed content | Verified |
| BIAU Playlab | `D:/workspace4Cursor/game/blog` | Astro `BaseLayout.astro` uses `siteMeta.favicon`; favicon hash matches ERP/Legal/Xunqiu | `Nav.astro` subtitle and `Footer.astro` footer show parent brand | Main site records Playlab naming and favicon alignment | No code edit required in this task; verified by targeted search and hash | Verified |
| Pet App showcase source | `D:/workspace4Cursor/pet/gamer/pet-app-showcase-site` | Missing BIAU Port title/favicons before this task | First screen only said `Gamer Pet App` before this task | Main site already points to `/pet-app-showcase/` and records APK gate | Add BIAU Port / 泊岸 title, favicon, visible parent-brand bridge, and README guidance | Updated |
| Xunqiu showcase | `D:/workspace4Codex/xunqiu/xunqiu-showcase-site` | `index.html`, `docs.html`, `404.html` use BIAU Port 泊岸 and shared favicon | Nav/footer show BIAU Port / 泊岸 ownership | Main site records title/favicon and APK gate | No code edit required in this task; verified by targeted search and hash | Verified |
| Xunqiu backend modern | `D:/workspace4Codex/xunqiu-backend-modern` | Backend service, no public browser shell in this repo | Not applicable | Main site treats backend as supporting service, not standalone visitor page | No brand UI edit; keep as backend-only evidence | Not applicable |

## Follow-Ups

- Add a static assertion that compares favicon hashes across main, ERP, Legal RAG, Playlab, Pet source, and Xunqiu showcase.
- Extend synthetic checks to assert title/favicon/visible parent-brand text for Pet and Xunqiu static pages.
- If a deployment platform requires PNG/ICO icons, generate those from the canonical SVG in a dedicated asset task.
