# 博客模型 live 检查语义修复

## Goal

让博客模型配置工具和文档遵守“不要随手测活；如需 live 验证，应是用户明确批准的小模型任务”的约定。默认 `doctor` 继续保持离线、脱敏；显式 `--live` 不再发送空洞的 `Reply with OK`，而是发送一个极小、公开安全、与博客流程相关的结构化诊断任务。

## Requirements

- 本任务不调用任何外部模型，只修改脚本、文档和规范。
- `npm.cmd run blog:model -- doctor ...` 默认必须继续离线，不发送网络请求。
- 显式 `--live` 仍然保留，但所有用户可见文案必须强调它是“approved small model task”，不是普通 health check。
- `--live` 请求体必须从 `Reply with OK` 改为一个小型博客任务，例如要求模型基于给定约束返回 JSON，证明路由能完成内容类指令并保持公开安全边界。
- live 结果验证不需要评价文章质量，但要检查返回了可解析的 message content；如果返回空内容继续给出 actionable recovery。
- help、usage、content-drafts workflow 和 `.trellis/spec/backend/blog-draft-workflow.md` 要统一描述：
  - 默认 status/doctor 离线且 masked。
  - live doctor 只有在用户明确批准小任务时运行。
  - 它不会写入或覆盖草稿。
  - 它可能消耗模型额度/触发中转请求。
- 不打印 API key、真实 relay URL、Authorization header 或 `.env.local` 内容。

## Acceptance Criteria

- [x] `scripts/configure-blog-model.mjs` 不再包含 `Reply with OK` live 测活提示词。
- [x] `doctor --live` 的 user/system prompt 是一个小型、公开安全、博客相关的诊断任务，并保留脱敏错误输出。
- [x] `--help` / usage 文案不把 `--live` 描述成 casually minimal health check，而是明确为 approved small model task。
- [x] `.agents/skills/blog-content-pipeline/references/usage.md`、`content-drafts/blog-rewrite-workflow.md` 和 `.trellis/spec/backend/blog-draft-workflow.md` 与新语义一致。
- [x] 验证不实际触发 live 模型请求；只跑离线 status/doctor、blog 检查、lint/build 和敏感信息扫描。

## Validation

- `npm.cmd run blog:model -- --help`: 通过；help 显示 `doctor` 默认离线，`--live` 只在 approved small blog diagnostic model task 后使用。
- `npm.cmd run blog:model -- status --all --format markdown --local-env .trellis/workspace/zhang/nonexistent-blog-model.env`: 通过；使用临时 dummy 环境变量，不读取 `.env.local`。
- `npm.cmd run blog:model -- doctor --all --format markdown --local-env .trellis/workspace/zhang/nonexistent-blog-model.env`: 通过；输出确认 no model request was sent。
- `rg -n "Reply with OK|minimal live|minimal channel|minimal model request|minimal profile/model routing check|随手测活" scripts .agents\skills\blog-content-pipeline content-drafts .trellis\spec\backend\blog-draft-workflow.md -S`: 无匹配。
- `npm.cmd run blog:check`: 通过。
- `npm.cmd run lint`: 通过。
- `npm.cmd run build`: 通过；仅保留既有 Vite/Rolldown 动态导入和插件耗时 warning。
- `git diff --check`: 通过；仅显示 Windows 换行提示。
- 新增行敏感信息扫描：实际脚本/文档改动无命中。包含 task json 时 `07-02-blog-model-live-doctor-task-check` 会因 `task-check` 中的 `sk-` 片段触发误报，不是密钥。

## Notes

- Evidence already inspected:
  - `.agents/skills/blog-content-pipeline/SKILL.md`: live model request requires explicit approval for a small model task.
  - `scripts/configure-blog-model.mjs`: current `--live` sends `Reply with OK`.
  - `.trellis/spec/backend/blog-draft-workflow.md`: already says `doctor --live` is an explicit small diagnostic task, but signatures and examples still call it a minimal live check.
  - `content-drafts/blog-rewrite-workflow.md` and `.agents/skills/blog-content-pipeline/references/usage.md`: still describe `--live` as a minimal request/channel check.
- Follow-up candidate: `--env-file` is a problematic script alias on newer Node because Node itself may intercept it; prefer documented `--local-env` and consider removing or warning about `--env-file` in a future CLI polish task.
