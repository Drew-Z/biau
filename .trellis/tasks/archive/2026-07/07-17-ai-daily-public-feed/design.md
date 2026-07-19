# AI Daily public feed and deep edition design

## Scope

This task publishes the approved Flash projection as a near-real-time public
surface. It does not publish Edition drafts, invoke providers, fetch sources,
or bypass Content Studio review. The reviewed static daily edition remains a
separate durable archive produced through Publish Export.

## Service Boundary

The existing Content Studio deployment owns the public projection because it
already owns `STUDIO_DATABASE_URL` and the AI Daily tables. Public routes are
mounted only in `ASSISTANT_SERVICE_MODE=studio` and local `all` mode:

```text
GET /public/ai-daily/feed
GET /public/ai-daily/events/:publicId
```

They use a dedicated router, CORS policy, rate limiter, serializers, and error
contract. They are not mounted under `/studio/api`, do not accept the Studio
bearer token, and cannot call authenticated Studio mutation handlers.

## Public Eligibility

Feed items must satisfy all of the following at query time:

- `AiDailyFlashItem.lifecycleState = ACTIVE`
- `currentApprovedRevisionId` is present
- the current revision has `status = APPROVED`
- `lastApprovedAt` is inside the configured public window, default 72 hours
- `retentionUntil` is null or later than the request time

Detail status semantics:

| Stored state | Response |
| --- | --- |
| Unknown public id | `404 ai-daily-public-item-not-found` |
| Never approved / held / inconsistent current revision | `404 ai-daily-public-item-not-found` |
| Withdrawn | `410 ai-daily-public-item-withdrawn` |
| Retention or public-window expired | `410 ai-daily-public-item-expired` |
| Active current approved revision | `200` public DTO |

The stable `publicId` always resolves to the current approved revision.
Superseded revisions never receive their own public URL.

## Public DTO

Feed and detail share one item serializer:

```ts
interface AiDailyPublicItem {
  publicId: string
  revision: number
  title: string
  factSummary: string
  whyItMatters: string
  uncertainty: string | null
  approvedAt: string
  updatedAt: string
  corrected: boolean
  correctedAt: string | null
  citations: AiDailyPublicCitation[]
}
```

Allowed citation fields are `title`, `publisher`, public canonical/original
URL, `publishedAt`, bounded `excerpt`, and optional bounded locator data.
Public URL validation rejects credentials, non-HTTPS URLs, localhost, private
or link-local IP literals, metadata hosts, and local/internal hostnames.

The serializer excludes database ids, stable event keys, cluster identities,
revision ids, selection/evidence versions, provider/model/prompt/schema data,
review/audit data, source bindings, evidence bodies, hashes, editor identity,
and raw provider responses.

Feed metadata is derived from the returned public page and clearly labels its
scope. It includes generation time, public window, last approval, latest
projection, pipeline freshness, stale state, and page-level citation coverage.

## Pagination And Query Budget

- `limit` defaults to 20 and is bounded to 1-40.
- Ordering is `lastApprovedAt DESC, publicId DESC`.
- The opaque keyset cursor contains only the last public approval timestamp
  and public id; invalid cursors return `400 invalid-ai-daily-public-cursor`.
- The repository performs one bounded `limit + 1` projection query per feed
  request and one unique lookup per detail request.
- `AiDailyFlashItem` receives a compound index on
  `[lifecycleState, lastApprovedAt, publicId]`.

## HTTP Cache And Rate Limit

Every successful public payload receives:

```text
Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=300
ETag: SHA-256 of the exact public payload
```

`If-None-Match` returns `304` without a response body. The ETag changes when a
correction, approval, withdrawal-visible state, cursor page, or metadata value
changes.

The route uses a bounded in-memory per-client window limiter with
`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After`.
This protects one process without pretending to be a distributed quota.

## CORS

`AI_DAILY_PUBLIC_CORS_ORIGINS` is a comma-separated explicit allowlist. A
request without `Origin` is allowed for server-to-server and same-origin use.
Allowed browser origins receive an exact `Access-Control-Allow-Origin` value
and `Vary: Origin`; disallowed origins receive a stable `403` response.

## Frontend Data Flow

```text
/ai-daily -> public API client -> decoder -> feed view
/ai-daily/:publicId -> public API client -> decoder -> detail view
```

The public client is independent from `requestStudioApi` and never reads or
sends a Studio token. It uses `VITE_AI_DAILY_API_BASE_URL`, falling back to the
configured Studio API base only as a host value.

The browser stores the last successful payload in component memory, sends its
ETag on later requests, keeps old data on transient failure, refreshes no more
than once every 60 seconds while visible, and pauses while `document.hidden`.
`304` keeps the existing payload and refresh timestamp.

## UI And Publication Boundaries

- `/ai-daily` is a public, lazy-loaded feed with freshness, coverage, empty,
  stale, loading, error, and pagination states.
- `/ai-daily/:publicId` is a vertically readable article-style detail page
  with public citations and correction indication.
- Both routes receive SEO, normalized analytics, mobile overflow checks, and a
  static sitemap index entry.
- Dynamic event URLs are not generated into the static sitemap until a
  reviewed public snapshot exists in Git; the feed remains the discovery path.
- Hidden/unreviewed Flash and Edition content remains absent from public build,
  assistant index, and sitemap generation.

## Security Failure Mode

Serialization fails closed. If the stored current revision or any required
public field is invalid, that item is omitted from the feed and detail returns
`404`; invalid citations are omitted individually. Unexpected database errors
flow to the existing centralized low-sensitive error middleware.
