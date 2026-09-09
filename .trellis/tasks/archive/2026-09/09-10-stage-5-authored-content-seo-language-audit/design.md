# 审计设计

## Evidence Flow

```text
public route/page component
  -> typed data/projection
  -> authored/payload field classification
  -> lang/SEO projection inspection
  -> coverage matrix + decision gates
```

## Classification

- `interface`: fixed labels already owned by a typed UI copy record.
- `authored`: project/article/home text whose source language and editorial meaning must be preserved unless explicitly approved.
- `payload`: approved assistant or AI Daily content returned from a contract; language changes cannot alter request identity, citations, facts, or revision state.
- `seo`: title, description, canonical, Open Graph, sitemap and route metadata generated from public content or fixed UI.
- `production`: edition, Feed, model, deployment, or schedule state requiring an existing manual gate.

## Output

`audit.md` will contain a route-by-route matrix with source file/line evidence, current language semantics, URL/SEO behavior, translation risk, and recommended next action. `verification.md` will record commands, exit status, changed-file scope, and protected-boundary checks.

## Rollback

The audit is record-only. Rollback means removing only this task's uncommitted audit artifacts; no application or public data rollback is required.\n
