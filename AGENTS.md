# AGENTS.md

请始终使用简体中文与用户沟通。代码、命令、路径、报错信息可以保留英文；解释、说明、总结必须使用中文。

## Project

这是一个基于 React、Vite、TypeScript 和 Semi Design 的产品官网。目标是把 AI 产品、业务系统、移动端应用、互动体验和资源内容组织成一个可筛选、可搜索、可演示的解决方案网站。

## Development

- 先检查现有代码和目录结构，再修改。
- 优先做小步、可验证的改动。
- 不要删除或覆盖用户已有内容。
- 修改后尽量运行 `npm run build` 和 `npm run lint`。
- UI 组件优先使用 Semi Design：`@douyinfe/semi-ui` 和 `@douyinfe/semi-icons`。
- 复杂业务数据先放在 `src/data/`，后续再考虑接入后端或 CMS。

## Shell Preference

- Windows 环境下优先使用简单命令。
- 给用户展示命令时优先使用 Git Bash 风格；需要执行项目脚本时可以直接使用 `npm.cmd`。
- 不要使用破坏性 Git 命令，例如 `git reset --hard`、`git clean -fd`、`git checkout -- <file>`，除非用户明确要求。

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

This repo uses the default five triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo. Domain docs live in `CONTEXT.md` and architectural decisions live under `docs/adr/` when they exist. See `docs/agents/domain.md`.

## Resume Protocol (for long-running optimization loops)

This repo runs a long-horizon "measure → rank → fix → verify → commit" loop. Network drops are common; **state lives on disk, not in conversation context**. Follow this protocol on every new session:

1. **First action**: read `LOOP-STATE.md` in full. If it exists and has a non-empty `Next Up` list, do NOT re-plan or re-explore.
2. Read the last 5 lines of `compare-out/history.jsonl` (if it exists) for recent scores.
3. Pick the #1 item in `Next Up` and execute it.
4. Constraints per iteration:
   - Touch 1–3 files only.
   - Target 10–15 minutes wall time. If the task is bigger, split it before starting.
   - Must pass `tsc --noEmit` AND `npm run build` before committing.
   - One iteration = one commit.
5. After commit:
   - Update `LOOP-STATE.md`: bump `Last Completed Iteration`, remove the finished item from `Next Up`, append discovered diffs to the bottom.
   - Append one line to `compare-out/history.jsonl` (format below).
6. Commit message format: `loop(<area>): <one-line summary>` — `area` is one of `infra`, `routing`, `projects`, `blog`, `home`, `compare`.

### `compare-out/history.jsonl` line format

One JSON object per line (JSONL):

```
{"t":"ISO timestamp","iter":N,"area":"projects","kind":"fix|infra|measure","score":0.48,"top_diffs":["card-radius","card-padding"],"commit":"short-sha","notes":"optional"}
```

`score` is the page-diff score from `scripts/focus-compare.mjs` (lower is better; 0 = pixel-identical). For pure infrastructure iterations use `"kind":"infra"` and omit `score`.

### Failure recovery

If a session ends mid-iteration (network drop, context loss):
- The next session reads `LOOP-STATE.md` and re-attempts the same `Next Up #1` item from scratch.
- Worst case loss is one iteration (≤15 min).
- Never amend or force-push to recover; create a new commit.
