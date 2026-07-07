# Round 13 assistant studio artifact link check

## Goal

Strengthen local checks for internal assistant Studio draft artifacts so deep links, legacy links, and unsafe/mismatched artifact hrefs stay covered.

## Requirements

- R1. Expand local assistant metadata checks for Studio draft artifact hrefs.
- R2. Preserve support for current deep links: `/studio?draft=<id>`.
- R3. Preserve support for legacy persisted artifact links: `/studio`.
- R4. Allow slug-based same-site draft lookup when the href target matches the artifact slug.
- R5. Canonicalize same-site Studio draft links with extra query params back to `/studio?draft=<target>`.
- R6. Reject external links, mismatched draft targets, unknown artifact kinds, unsafe statuses, and secret-like extra fields.
- R7. Do not call live models, Studio APIs, databases, or cloud services.

## Acceptance Criteria

- [x] `npm.cmd run assistant:meta-check` covers id deep links, slug deep links, legacy links, extra-query canonicalization, external links, and mismatched links.
- [x] Safe artifacts survive only as sanitized low-sensitive summaries.
- [x] Unsafe artifacts do not survive normalization.
- [x] Required local validation passes.

## Out of Scope

- Creating real Studio drafts.
- Changing production assistant or Studio deployment settings.
- Reworking the Assistant or Studio UI.
