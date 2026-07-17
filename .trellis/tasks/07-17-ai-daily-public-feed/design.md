# AI Daily public feed and deep edition design

## Public Projection

The API reads projection-only tables/queries and uses stable public IDs. Feed and detail share one public item DTO. Superseded revisions resolve to the current approved revision.

```text
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: projection hash
```

The frontend pauses polling in background tabs and displays pipeline/editorial staleness independently from HTTP availability.

## Static Edition

The daily article continues through draft review, Publish Export, Git-tracked static data, build, and deployment. Feed approval never implies daily-edition approval.

## Security

Public routes have their own middleware boundary, origin policy, limit caps, rate limit, and field serializers. They cannot call authenticated Studio mutation handlers.
