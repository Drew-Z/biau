# Design: Public assistant direct task routing

## Root cause

The model planner is allowed to select `direct`, `site`, `web`, or `combined`. A clearly non-factual creative command can still be misclassified as research. Once that happens, the graph retrieves irrelevant evidence and the claim verifier correctly replaces the draft with an evidence-insufficient response.

## Decision

Add a conservative deterministic classifier for only high-confidence direct tasks. Apply it in the Agent plan node before the model planner when the requested mode is `auto`. Reuse the same classifier in the planner fallback so model-configuration failure has identical routing semantics.

The classifier must use anchored command forms and avoid broad topic keywords. It covers:

- short greetings and thanks;
- explicit creative commands such as writing or generating a poem, story, couplet, slogan, title, or copy;
- explicit transformation commands such as rewriting, polishing, translating, continuing, shortening, expanding, or proofreading supplied text.

Explicit `site` and `web` modes remain authoritative and bypass this classifier.

## Verification

Add a graph-level fixture where the model planner would choose research but must not be called for `请生成一首古诗`. Assert no retrieval calls, direct answer publication, zero claims/citations, and `route=direct`. Add an explicit-mode fixture proving `web` still reaches research for the same surface form.
