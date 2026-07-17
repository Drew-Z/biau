# Runtime provider policy

## Decision

The AI Daily domain does not bind itself to one named provider, but the production profile requires real-time discovery, original-page extraction, and quality generation capabilities.

smart-search was used to research this task. It is not automatically a production dependency.

## Recommended production mapping

- curated source registry
- RSS/Atom and public API adapters
- Brave Search API as broad discovery primary
- Firecrawl as selected-page extraction
- Tavily Search and Extract as fallback
- extractor, strong composer, and independent verifier model roles
- safe original-page fetch
- deterministic dedupe
- approved rolling feed plus reviewed static daily edition

## Provider-neutral contracts

- `DiscoveryProvider`: adds candidate URLs only; required in production
- `EmbeddingProvider`: assists event grouping
- `EvidenceExtractor`: retrieves original-page evidence; required in production
- structured extractor/composer/verifier providers: create and verify evidence-bound content; required in production

Missing configuration is allowed in `fixture` and `degraded`. In `production`, missing required capability configuration is `FAILED_CONFIG`; runtime failure or stale discovery produces `COMPLETED_WITH_GAPS` and never a normal current edition.

## Safety

- Search output is never citation evidence.
- Provider calls happen only inside a real edition task.
- No doctor, diagnose, ping, empty prompt, or liveness-only request.
- Provider-specific endpoints and keys remain platform-only.
- Tests use mock providers.
- Auth/config errors do not retry indefinitely; network/rate-limit failures use bounded retry.
