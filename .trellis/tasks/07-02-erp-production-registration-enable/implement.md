# ERP 生产真实注册开启执行清单

## 1. Context

- [x] Read ERP AGENTS and current auth/runtime code.
- [x] Confirm user approval for real production registration.
- [x] Inspect docs and main-site ERP copy.

## 2. ERP

- [x] Add auth route tests for production registration gate and operator default role.
- [x] Update ERP docs/runbook for `ERP_REGISTRATION_ENABLED=true`.
- [x] Run `npm.cmd run test --workspace @erp/api`.

## 3. Main Site

- [x] Update Ozon ERP project detail and `assistantContext`.
- [x] Regenerate assistant knowledge and sitemap if needed.
- [x] Run `assistant:index`, `blog:check`, `lint`, `build`.

## 4. Finish

- [x] Both repos: `git diff --check`.
- [x] Both repos: changed-file sensitive scan.
- [ ] Commit and push ERP current branch.
- [ ] Commit and push `blog-semi/main`.
- [ ] Archive child task and record journal.
