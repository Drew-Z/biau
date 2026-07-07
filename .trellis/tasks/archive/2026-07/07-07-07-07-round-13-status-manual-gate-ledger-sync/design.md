# Design

## Scope

Modify:

- `scripts/check-manual-gates.mjs`
- `docs/manual-gates.md`

## Approach

Keep the checker offline and text-based. It already reads documentation files and scans for required sections, links, and secret-like values. Extend it to also read `src/data/statusTargets.ts`, extract top-level `reliabilityProjects` entries, and compare the discovered ids against an explicit ledger coverage map.

The extractor should target the project object shape:

```ts
{
  id: 'legal-rag',
  title: 'Legal RAG 法律机器人',
  category: 'ai-workbench',
}
```

This avoids matching nested reliability check ids.

## Coverage Contract

For each reliability project id:

- the checker must know the project id;
- the ledger must include one or more low-sensitive coverage phrases for that project;
- coverage phrases should point at existing manual-gate rows, script names, or platform categories.

If a future project is added to `reliabilityProjects` without updating the ledger coverage map, the check fails. If a ledger row is removed while status data still depends on it, the check fails.

## Compatibility

No UI or generated status JSON changes are needed. The existing `npm.cmd run verify` path already calls `docs:manual-gates-check`, so the stronger contract is automatically part of broad validation.
