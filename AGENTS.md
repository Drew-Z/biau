# AGENTS.md

请始终使用简体中文与用户沟通。代码、命令、路径、报错信息可以保留英文；解释、说明、总结必须使用中文。

## Project

这是一个基于 React、Vite、TypeScript、自定义设计令牌和 Lucide 图标的产品官网。目标是把 AI 产品、业务系统、移动端应用、互动体验和资源内容组织成一个可筛选、可搜索、可演示的解决方案网站。

## Operating Principles

- 证据优先，不把猜测说成事实。
- 项目内规则优先于通用偏好；当前用户请求优先于长期默认规则。
- 修改前先理解项目上下文、现有实现和影响范围。
- 优先小步、可回退、可验证的改动，避免无关重构和格式化噪音。
- 不要删除、覆盖或回滚用户已有改动，除非用户明确要求。
- 不要写入真实 IP、账号、密钥、数据库连接串、云端 API 地址、签名文件路径等敏感信息。

## Codex Workflow

本项目已启用完整 Trellis。复杂任务使用 Trellis 的“先澄清、再规划、再实现、最后验证沉淀”流程；小任务可以直接完成，但仍要先看相关上下文。

- 模糊需求：先用 grill-me 风格逐步追问，必要时一次只问最关键的问题。
- 本地代码理解：优先读项目文件、用 `rg` 搜索、查看现有实现和测试；只有需要语义检索时再考虑外部 MCP 或语义工具。
- 外部资料：涉及当前事实、框架 API、部署平台或第三方行为时，查官方文档或可靠来源，并在结论里说明依据。
- 计划落档：多文件改动、新功能、重构或高风险任务，优先创建 `.trellis/tasks/<task>/`，整理 `prd.md`、必要的 `design.md` 和 `implement.md`，再执行。
- 执行闭环：实现后运行最小相关验证；有可复用经验时更新 `.trellis/spec/`、`CONTEXT.md`、`docs/adr/` 或 `docs/agents/`。

详细流程见 `docs/agents/codex-workflow.md`。

## Development

- 先检查现有代码和目录结构，再修改。
- 优先做小步、可验证的改动。
- 不要删除或覆盖用户已有内容。
- 修改后尽量运行 `npm run build` 和 `npm run lint`。
- UI 优先复用现有 class-based CSS、设计令牌和 `lucide-react`，不要无依据引入新的组件框架。
- 复杂业务数据先放在 `src/data/`，后续再考虑接入后端或 CMS。

## Shell Preference

- Windows 环境下优先使用简单命令。
- 给用户展示命令时优先使用 PowerShell 7 语法；需要执行项目脚本时可以直接使用 `npm.cmd`。
- 不要使用破坏性 Git 命令，例如 `git reset --hard`、`git clean -fd`、`git checkout -- <file>`，除非用户明确要求。
- 用户已确认本项目可以在每次成功提交后默认执行 `git push origin main`，除非用户明确说明“不要推送”“先别推”或当前分支不是 `main`。
- 不要安装无条件 `post-commit` 自动推送 hook；自动推送应由代理在提交后显式执行并确认结果。

## Agent skills

### Codex workflow

For Codex-style clarification, planning, implementation, validation, and finish-work, see `docs/agents/codex-workflow.md`.

### Codex-only development

- 本项目仅使用 Codex 开发；主会话负责方案、实现、最终验证和交付，不再启动 Claude Code 后台任务或双工具交接流程。
- `AGENTS.md` 是项目指令入口，`.codex/` 保存 Codex 配置与 hooks，`.agents/skills/` 保存 skills，`.trellis/` 保存任务、规范和开发记录。
- `.trellis/config.yaml` 使用 `codex.dispatch_mode: inline`；主会话通过 `trellis-before-dev` 读取规范、直接实施，再按 `trellis-check` skill 验证。
- 确需宽而重的只读探索时，遵循用户的子代理规则；子代理不承担代码修改、方案取舍和最终验证。
- 旧协作记录与 worktree 仅作历史成果保留，不作为当前任务入口；有未提交或未合并成果的 worktree 不得直接删除。
- 通用 Trellis 解析器中的多平台兼容逻辑和已有 Logo Lab 比较资产继续保留，不把工具退出误当成业务代码清理。

### Issue tracker

New work should use Trellis tasks under `.trellis/tasks/`. Older lightweight issues and PRDs may still exist under `.scratch/`; see `docs/agents/issue-tracker.md` when handling legacy `.scratch/` files.

### Triage labels

This repo uses the default five triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo. Domain docs live in `CONTEXT.md` and architectural decisions live under `docs/adr/` when they exist. See `docs/agents/domain.md`.
