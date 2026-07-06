# AI Daily Studio Authoring Flow Design

## Direction

AI Daily and Studio should behave like an editorial workflow, not an automatic publishing pipeline:

- source pack or issue data enters as structured input;
- drafts remain hidden/review-needed;
- preview and export use shared block contracts;
- public publishing requires explicit review;
- model calls are meaningful generation tasks only, not liveness probes.

## Candidate Improvements

- Add or tighten a local check for AI Daily draft structure.
- Make `verify` or smoke scripts cover an existing AI Daily/Studio contract.
- Improve issue detail or Studio preview empty/error states.
- Add a sample/dry-run check that proves generated drafts stay hidden and review-needed.
- Document manual gates where production variables or first real issue conversion are required.

## Safety

No live model calls, no private source URLs, no API keys, no database URLs, no unreviewed public publication.
