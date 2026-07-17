# Generation strategy

Research date: 2026-07-17

## Decision

Use an evidence-bound, three-role generation pipeline:

```text
cheap structured extractor
  -> strong Chinese composer
  -> risk-triggered independent verifier
  -> deterministic citation and wording gate
```

Production requires generation capability. A manual evidence brief remains a degraded recovery path, not the target product.

## Why Not One Large Prompt

A single prompt that receives raw webpages, chooses stories, writes Chinese prose, and cites sources mixes discovery, evidence, ranking, and writing failure modes. It is difficult to replay and easy for unsupported facts to enter polished copy.

Separating roles provides:

- smaller structured inputs;
- better batching and caching;
- independent validation points;
- cheaper extraction;
- a strong model budget focused on actual editorial work;
- clear attribution when a stage fails.

## Extractor Role

Input:

- bounded original-page evidence;
- stable source and evidence IDs;
- source tier and metadata.

Output:

- atomic facts;
- exact supporting quotes and locators;
- dates, versions, prices, entities, and source type;
- conflicts and uncertainty;
- possible event duplicates.

The extractor does not write the public article. It must support strict structured output and at most one schema repair.

## Composer Role

Input:

- validated fact cards only;
- ranking and selection metadata;
- explicit editorial style and length constraints.

Output:

- restrained Chinese titles;
- compact factual summaries;
- why-it-matters analysis;
- cross-event trends;
- structured flash-card and daily-edition content.

The composer cannot browse freely, invent URLs, or add facts outside the evidence package.

## Verifier Role

Use a different model/provider slot to review only high-risk claims:

- headline events;
- numbers, dates, prices, versions, policy, availability, and security;
- single-source claims;
- correction or event-state changes;
- composer wording without direct quote coverage.

The verifier returns `entailed`, `contradicted`, `insufficient`, or `unverifiable` with evidence IDs and a reason code. It cannot add facts.

## Deterministic Gate

Model agreement is not evidence. Publication rules are computed from stored data:

- every verifiable sentence has evidence IDs;
- URLs belong to fetched source records;
- official, price, API, and availability wording has suitable Tier 1 support;
- contradicted or insufficient high-risk claims are removed or held;
- duplicate and sensational wording is rejected;
- generated confidence numbers are ignored as publication truth.

## Call Budget

For 15-30 qualified candidates:

- extractor: 2-5 batched calls;
- composer: 1 call;
- verifier: 1 batched call, split only when required;
- schema repair: at most one per stage.

Expected total: 4-7 calls per edition.

This is more efficient than running three models independently on every article and then asking a fourth model to merge them.

## Model Selection

Do not declare a model best from public rankings alone. Evaluate actual configured candidates on a BIAU-owned dataset with separate scores for each role.

Required cases:

- official English and Chinese releases;
- the same event reported by multiple sources;
- numeric/date/version claims;
- corrections and partial rollouts;
- low-evidence rumors;
- long technical pages;
- events with conflicting sources.

Rubric:

- factual fidelity;
- claim-level citation coverage;
- natural Chinese readability;
- information density;
- restrained titles;
- clear fact/opinion separation;
- uncertainty handling;
- duplication control.

The chosen extractor, composer, and verifier may be different models. Every role supports a primary and ordered fallback that must pass the same minimum rubric.

## Official Capability Notes

OpenAI, Anthropic, Gemini, and xAI currently document structured-output capabilities suitable for role adapters. Provider-specific citation features can help, but BIAU still keeps its own evidence IDs, quotes, and deterministic citation gate.

Anthropic's native citations and structured outputs have compatibility constraints when used together, so BIAU should not make provider-native citation format its domain contract.

The architecture therefore standardizes BIAU schemas first and treats provider formats as adapters.
