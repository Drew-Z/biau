# Extract blog content pipeline skill

## Goal

把当前项目内的 `.agents/skills/blog-content-pipeline` 整理成一个可独立维护、可推送到远程仓库 `git@github.com:Drew-Z/blog-content-pipeline.git` 的 skill 文件夹，同时保留当前项目可继续使用的 skill 副本，并补齐使用规范：

- 使用前如何配置模型渠道。
- 如何选择 `strong`、`fast`、`review` profile。
- 如何用 skill 处理新文章、legacy 重写、草稿审稿和发布。
- 博客内容什么时候需要图片生成、什么时候不需要，以及图片生成的审稿/安全规则。

## Confirmed Facts

- 当前 skill 位于 `.agents/skills/blog-content-pipeline/`。
- 当前 skill 文件包括 `SKILL.md`、`agents/openai.yaml`、`references/templates.md`、`references/review-and-prompts.md`。
- 当前项目已经支持 `BLOG_DRAFT_*`、`BLOG_DRAFT_STRONG_*`、`BLOG_DRAFT_FAST_*`、`BLOG_DRAFT_REVIEW_*` 环境变量占位。
- `scripts/generate-blog-draft.mjs` 支持 `--profile <profile>`，并兼容旧 `GEMINI_*`。
- 远程仓库 `git@github.com:Drew-Z/blog-content-pipeline.git` 可访问，但 `git ls-remote --heads` 没有返回分支，按空仓库处理。
- 工作区 `D:/workspace4Cursor/blog-content-pipeline` 当前不存在，可以作为独立 skill repo 路径。

## Requirements

- R1: 在 `D:/workspace4Cursor/blog-content-pipeline` 创建独立 Git 仓库，内容为一个标准 Codex skill 文件夹，而不是嵌在当前网站仓库里。
- R2: 独立仓库必须关联远程 `git@github.com:Drew-Z/blog-content-pipeline.git` 并推送初始内容。
- R3: 当前 `blog-semi` 项目内的 `.agents/skills/blog-content-pipeline` 继续保留可用副本，避免 Codex skill discovery 因外部仓库拆分而中断。
- R4: 独立 skill 内要包含简洁但完整的使用规范：安装/同步位置、模型配置、profile 选择、常用调用场景、验证命令。
- R5: 使用规范只写公开安全占位变量，不写真实中转地址、账号、API key、私有 URL 或本地秘密路径。
- R6: 将图片生成策略纳入 skill：区分项目截图、自制图示、授权图片、生成图片；明确生成图片只适合封面/抽象概念/非真实 UI，不可伪造产品截图或证据。
- R7: 如有必要，更新当前项目内 skill 副本，使它与独立 skill 同步。
- R8: 不在当前任务里生成或发布博客文章，也不配置真实模型账号。

## Acceptance Criteria

- [ ] `D:/workspace4Cursor/blog-content-pipeline` 存在并是独立 Git 仓库。
- [ ] 独立仓库包含有效 skill 结构：`SKILL.md`、`agents/openai.yaml`、`references/`。
- [ ] 独立仓库包含使用规范和图片生成策略，且不包含秘密信息。
- [ ] 独立仓库 remote `origin` 指向 `git@github.com:Drew-Z/blog-content-pipeline.git`。
- [ ] 独立仓库至少有一个 commit，并成功推送到远程。
- [ ] 当前项目内 `.agents/skills/blog-content-pipeline` 仍可被 Codex 使用，并与独立仓库内容保持同步。
- [ ] 运行 skill 结构检查，验证 frontmatter、reference 文件、openai metadata。
- [ ] 当前项目工作树最终干净，Trellis 任务归档并记录 journal。

## Out Of Scope

- 不生成正式博客内容。
- 不运行真实模型生成。
- 不配置图片生成服务账号。
- 不把当前项目改成依赖 Git submodule，除非后续明确需要。
- 不删除当前项目内 skill 副本。
