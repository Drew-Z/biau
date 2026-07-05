# AI 日报内容流水线一期 Implement

## Step 1. Planning

- [x] 确认任务目标：先做半自动 MVP，不做无人审核的自动发布。
- [x] 读取 blog-content-pipeline 和 blog draft workflow 规范。
- [x] 补充 design.md。

## Step 2. Offline Draft Generator

- [x] 新增 `scripts/generate-ai-daily-draft.mjs`。
- [x] 添加 `npm.cmd run ai-daily:draft`。
- [x] 支持 `--source <json>`、`--out <markdown>`、`--force`。
- [x] 未传 `--force` 时不覆盖已有草稿。
- [x] 输出 evidence-first scaffold，并记录 `model channel: none`。

## Step 3. Sample Inputs And Docs

- [x] 新增 AI 日报示例来源 JSON。
- [x] 生成一期样例日报草稿，标记 `draft/manual-review`。
- [x] 新增使用文档，说明模型配置边界、来源格式和发布前检查。

## Step 4. Validation

- [x] `npm.cmd run ai-daily:draft -- --source <sample> --force`
- [x] `npm.cmd run blog:check`
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] `git diff --check`
- [x] 敏感扫描本次新增/修改文件。

## Step 5. Finish

- [x] 更新 PRD 验收状态和证据。
- [x] 如有新命令契约，更新 `.trellis/spec/backend/ai-daily-workflow.md`。
- [x] 提交并推送 `blog-semi/main`。
