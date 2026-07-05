# 跨项目可靠性定时观测与状态页闭环 Implement

## Step 1. Planning Closure

- [x] 盘点现有 synthetic/status/monitor 脚本。
- [x] 确认状态详情页已经使用 `/status/:projectId` 独立路由。
- [x] 补充 design.md 和 implement.md。

## Step 2. Aggregated Runner

- [x] 新增 `scripts/check-reliability-suite.mjs`。
- [x] 添加 `npm.cmd run reliability:check`。
- [ ] 默认顺序执行：
  - `main-site:synthetic`
  - `legal-rag:synthetic`
  - `erp:synthetic`
  - `xunqiu:synthetic`
  - `pet:synthetic`
  - `site:status`
  - `site:monitor --json`
- [x] 产出 `public/status/reliability-suite.json`。
- [x] 支持 `--strict`、`--timeout`、`--skip <id>`。

## Step 3. Scheduling Documentation

- [x] 更新 `docs/site-monitoring.md`，说明 `reliability:check` 和状态 JSON。
- [x] 更新 `docs/observability-strategy.md`，把 GitHub Actions artifact 方案作为第一版定时路线。
- [x] 如改动足够稳定，新增 `.github/workflows/reliability-check.yml`；否则先文档落档。

## Step 4. Validation

- [x] `npm.cmd run reliability:check`
- [x] `npm.cmd run reliability:check -- --strict`
- [x] `npm.cmd run site:status`
- [x] `npm.cmd run docs:observability-check`
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] `git diff --check`

## Step 5. Finish

- [x] 更新 PRD 验收状态和证据。
- [x] 更新相关 spec，如新增 public status report contract。
- [ ] 提交并推送 `blog-semi/main`。
