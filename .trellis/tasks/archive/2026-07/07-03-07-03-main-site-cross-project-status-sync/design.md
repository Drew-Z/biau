# Design

## Scope

This started as a public-data synchronization task inside `blog-semi`. During review, the user identified that "brand alignment" was still too shallow on some deployed surfaces, so the task also applies small external frontend changes in ERP and Playlab to make BIAU Port / 泊岸 visible in the page chrome. It still does not change deployment configuration or private credentials.

## Data Sources

- ERP repo commits already pushed:
  - production self-registration defaults to open unless explicitly disabled;
  - entry title/favicon now identify `BIAU Port 泊岸`;
  - login hero and authenticated sidebar now show BIAU Port / 泊岸 as the visible shell while preserving `Ozon ERP` as the product name.
- Legal RAG repo commit already pushed:
  - web title/favicon and sidebar/login brand now identify `BIAU Port / 泊岸`.
- Game blog repo commit already pushed:
  - `BIAU Playlab` capitalization and favicon aligned.
  - navigation subtitle and footer now state BIAU Port / 泊岸 ownership.
- Xunqiu showcase repo commit already pushed:
  - index/docs/404 title/favicon and footer/brand identify `BIAU Port / 泊岸`.
- Pet audit already archived:
  - only debug APK found; public download remains closed.
  - Pet static showcase page title/favicon now use BIAU Port / 泊岸.

## Target Files

- `src/data/portfolio.ts`: visitor-readable project details and assistant context.
- `src/data/statusTargets.ts`: reliability checks, gates, and next actions.
- `src/data/assistant.ts`: public assistant facts and prompts.
- `public/pet-app-showcase/index.html`: static Pet showcase title/favicon.
- External repo frontend shell files:
  - ERP login page and workspace layout;
  - Playlab site metadata, navigation, and footer.
- Generated outputs from scripts:
  - assistant search/index artifacts, if the script writes them;
  - sitemap, if route/project metadata changes its output.

## Safety

- Do not copy secrets from external projects.
- Do not mention private hostnames or deployment dashboards.
- Do not imply live redeployment has completed; only say code/config is prepared or pushed when appropriate.
- Preserve product names (`Ozon ERP`, `Legal RAG`, `BIAU Playlab`, `寻球`) while identifying them as part of the BIAU Port / 泊岸 showcase network.

## Rollback

Revert the static data changes and regenerate the assistant index/sitemap if a public fact is later found inaccurate.
