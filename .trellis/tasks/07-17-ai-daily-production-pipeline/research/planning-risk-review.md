# Planning risk review and resolutions

An independent read-only review found the following design risks. They were resolved before implementation approval:

1. Candidate-to-`SourceItem` promotion was missing.
   - Resolution: canonical URL upsert, manual-field precedence, candidate provenance, transactional ordered issue-source links.
2. Reruns could overwrite human drafts.
   - Resolution: first draft only; later synthesis becomes an immutable generated revision requiring an explicit optimistic-lock editor action.
3. Earlier planning confused vendor neutrality with optional production capability.
   - Resolution: adapters stay provider-neutral, but production requires real-time discovery and quality generation. No-provider execution remains a degraded disaster-recovery fixture, not production acceptance.
4. Exported and publicly deployed states were conflated.
   - Resolution: issue can derive `EXPORTED`; deployed/public availability remains a static-site fact.
5. Fetch security was underspecified.
   - Resolution: DNS/IP/redirect/content-type/body/time bounds and robots/source opt-out are explicit requirements and fixtures.
6. Evidence retention was not measurable.
   - Resolution: 64 KiB stored page text, 8 KiB Studio preview, 1 KiB retained citation excerpt, 30-day TTL.
7. Manual and scheduled runs could use different idempotency keys.
   - Resolution: edition-date advisory lock and unique issue date; trigger mode is metadata only.
8. Evidence-poor runs lacked a normal terminal state.
   - Resolution: `COMPLETED_WITH_GAPS` with `NEEDS_MORE_EVIDENCE` and no draft.
