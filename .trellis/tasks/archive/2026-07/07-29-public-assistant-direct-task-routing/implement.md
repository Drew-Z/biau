# Implementation plan: Public assistant direct task routing

## 1. Routing

- [x] Add one reusable high-confidence direct-task classifier in the public planner module.
- [x] Apply it before the model planner only for `auto` requests.
- [x] Reuse it in deterministic fallback planning.

## 2. Regression coverage

- [x] Add the exact `请生成一首古诗` graph regression.
- [x] Prove direct routing skips planner, site retrieval, and web research.
- [x] Prove explicit `web` mode still owns routing.

## 3. Validation

- [x] Run `assistant:public-agent-check` and `assistant:public-model-check`.
- [x] Run `server:build`, `lint`, `build`, and `git diff --check`.
- [x] Update the public-research-assistant spec with the direct-route contract.
