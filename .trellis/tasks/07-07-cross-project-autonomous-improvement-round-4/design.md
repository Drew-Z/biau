# Cross-project Autonomous Improvement Round 4 Design

## Task Structure

The parent task owns cross-project priority, manual gates, integration review, and final wrap-up. Child tasks own independently verifiable deliverables. Work should start with P1 children and only move to P2 when P1 is complete, blocked by manual gates, or waiting for external state.

## Execution Boundary

`blog-semi` is the public aggregation layer. Related projects may be edited when the change directly improves one of these surfaces:

- public project page truthfulness;
- demo entry usability;
- status/reliability observation;
- assistant or Studio knowledge quality;
- release/download gate clarity.

Before touching a related project, read its local rules and scripts. Do not apply `blog-semi` conventions blindly to other repositories.

## Data and Secret Safety

All production secrets, tokens, database URLs, admin credentials, provider URLs, signing material, private dashboards, and unapproved APK URLs stay out of Git and Trellis artifacts. Production checks must log only coarse status, safe identifiers, and public-safe summaries.

## Reliability and Content Flow

Status pages should distinguish public entry checks, synthetic business checks, metrics, and observability. Content work should prefer Studio hidden/review-needed drafts or repo-reviewed static data changes. Public publication requires explicit review gates.

## Rollout Shape

Each child task is a small iteration:

1. inspect current project state;
2. decide the smallest aligned improvement;
3. implement only after the child task is started;
4. run local or low-sensitive production validation;
5. update main-site data/specs/docs when needed;
6. commit by repository.

If production work needs user action, record the gate and switch to another local task.
