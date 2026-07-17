# Real-time product shape

Research date: 2026-07-17

## Decision

The best BIAU Port form is:

```text
rolling AI flash feed + one daily deep edition
```

Technical implementation:

```text
approved dynamic read-only API feed + reviewed static daily article
```

## Reader Experience

### AI Flash Feed

- Covers approved events from the latest 48-72 hours.
- Updates without rebuilding the whole static site.
- Shows a Chinese fact summary, why it matters, uncertainty/correction state, update time, and original source links.
- Is designed for scanning and current awareness.

### Daily Deep Edition

- Publishes once per morning after clustering and cross-source verification.
- Explains the important events and cross-event trends rather than repeating every flash card.
- Uses the existing Content Studio review and Publish Export workflow.
- Remains the SEO, archive, and long-term citation surface.

## Why This Beats The Alternatives

| Shape | Real-time | Editorial depth | BIAU fit | Decision |
| --- | --- | --- | --- | --- |
| one daily article | low | high | fits static export but can lag one day | insufficient alone |
| morning/noon/evening editions | medium | medium | repeats stories and triples review load | reject |
| rolling feed only | high | low-medium | weak archive and trend explanation | insufficient alone |
| rolling feed + daily edition | high | high | uses Studio database and static export well | selected |

## Automation And Human Authority

Automated:

- collection and broad discovery;
- original-page extraction;
- canonicalization, dedupe, clustering, and ranking;
- evidence-bound flash and daily drafts;
- approved-record projection, pagination, cache, and feed refresh.

Human approval required:

- new public flash wording;
- why-it-matters analysis;
- merge/split decisions that change meaning;
- strong factual claims, corrections, and withdrawals;
- the complete daily edition.

Real-time therefore means high-frequency automated evidence processing plus a short approval action, not unreviewed model publication.

## Public API

Recommended routes:

```text
GET /public/ai-daily/feed?cursor=...
GET /public/ai-daily/events/:publicId
```

Recommended cache:

```text
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: <projection hash>
```

The frontend refreshes at most once per minute while visible and keeps the last successful result during API errors.

## Data Exposure Boundary

The public API returns approved projection fields only. It excludes:

- unapproved or held events;
- full evidence bodies;
- provider/model metadata;
- prompts and raw outputs;
- internal database IDs;
- review history and operator identity;
- credentials and private endpoints.

## Reference Patterns

- HotDaily demonstrates daily/history/trend/detail reader views and a read/qualified/selected funnel.
- NewsPrism demonstrates event-level clustering, source diversity, replay, and static reports.
- CondenseIt demonstrates source management, transparent ranking, budget, and schedule controls.
- Horizon demonstrates a ranked daily briefing and item detail pattern.

These references support the information architecture, not direct code reuse.

## Core Product Principle

```text
high-frequency discovery
  -> original evidence
  -> short human approval
  -> minute-level public feed
  -> daily high-quality static synthesis
```

This shape matches BIAU Port better than either a purely static daily article or an unreviewed automated news stream.
