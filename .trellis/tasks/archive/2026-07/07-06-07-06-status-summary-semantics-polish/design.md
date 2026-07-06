# Status summary semantics polish design

## Scope

This task touches the main-site status view only:

- shared status view helpers in `src/data/siteStatusView.ts`;
- `/status` rendering in `src/pages/SiteStatusPage.tsx`;
- UI regression assertions in `scripts/check-ui.mjs`;
- optional CSS if the existing layout needs small adjustments.

It does not change synthetic probe behavior, production monitoring, external
URLs, generated status file shape, or project-specific reliability definitions.

## Current Problem

`SiteStatusPage` renders five cards named by `statusMeta`:

- `online`, `degraded`, `offline`, `unchecked` count entry targets from
  `status.summary`;
- `planned` counts reliability checks from `reliabilitySummary.planned`.

This mixed scope makes the row look like one unified status histogram even
though the numbers are from two different layers.

The overview headline also only checks `offline` and `unchecked`, so a degraded
entry target can still show the "主要入口可访问" success headline.

## Target Model

Introduce a small shared projection for status overview metrics:

- `getEntryStatusSummary(status)` or equivalent remains focused on entry
  targets.
- `getReliabilityStatusSummary(projects)` counts layered reliability checks.
- A top-level "needs attention" derived boolean should include degraded,
  offline, and unchecked entry targets, plus degraded/offline/unchecked
  reliability checks. Planned reliability items should be shown as roadmap/gate,
  not as a hard failure.

`SiteStatusPage` should render two visually adjacent but semantically distinct
summary groups:

1. Entry reachability cards:
   - 可用入口
   - 受限入口
   - 异常入口
   - 未检测入口
2. Reliability coverage cards:
   - 已在线能力
   - 受限能力
   - 未检测能力
   - 待接入能力

The exact copy can be concise, but each card must reveal its scope in label or
hint.

## Validation Strategy

`scripts/check-ui.mjs` already checks status route counts from shared data. Add
assertions that:

- entry summary cards expose labels containing "入口";
- reliability summary cards expose labels containing "能力" or "可靠性";
- all displayed numeric counts are derived from `siteStatusTargets` /
  `staticReliabilityProjects` rather than hard-coded literals;
- detail links still use `/status/:projectId`.

Run:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
```

## Rollback

If the UI change becomes noisy, revert to the previous card row while keeping any
shared helper extraction that improves testability. The generated JSON and
synthetic scripts are not part of this task.
