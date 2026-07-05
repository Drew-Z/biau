# AI 日报内容流水线

AI 日报 / AI Daily 是独立栏目，用来记录短周期 AI 模型、工具、开发平台和工程实践变化。第一版流水线只做半自动草稿，不做无人审核的每日自动发布。

## 推荐流程

1. 人工整理公开来源到 JSON。
2. 运行离线草稿生成器。
3. Codex 或人工做事实、版权、敏感信息和栏目适配 review。
4. 通过审核后，再进入公开博客数据和 sitemap 更新。

```powershell
npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --force
```

默认输出：

```text
content-drafts/ai-daily-YYYY-MM-DD.md
```

也可以指定输出：

```powershell
npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --out content-drafts/ai-daily-custom.md --force
```

## 来源格式

来源文件必须是公开可审查信息，不要写入 API key、后台链接、账号、内部端点或私有模型渠道。

```json
{
  "date": "2026-07-05",
  "title": "AI 日报标题",
  "items": [
    {
      "title": "来源标题",
      "url": "https://example.com/post",
      "source": "Official Blog",
      "publishedAt": "source-provided",
      "summary": "用自己的话概括，不复制原文。",
      "impact": "说明对开发者、产品或本站的影响。",
      "toVerify": ["发布前还要核对的问题"],
      "tags": ["model", "tooling"]
    }
  ]
}
```

## 模型边界

默认模式是 `Codex-only scaffold/review`，草稿会记录：

```text
model channel: none
```

如果后续需要模型辅助摘要或润色，先使用现有私有模型向导：

```powershell
npm.cmd run blog:model -- setup
npm.cmd run blog:model -- status --all --format markdown
npm.cmd run blog:model -- doctor --all --format markdown
```

默认 `doctor` 是离线配置检查，不发送模型请求，也不应明文回显 API key。只有在用户明确批准一个具体小型内容任务时，才可以运行 `doctor --live`、`blog:draft -- --generate` 或未来的 AI 日报模型生成命令。

## 发布前检查

- 每条事实都能追溯到来源链接。
- 摘要是转述，不包含大段复制。
- 没有私有链接、密钥、账号、后台路径或未公开部署细节。
- 没有把样例草稿包装成真实自动日报。
- 没有夸大来源原文，例如“首个”“最强”“彻底替代”。
- 通过 `npm.cmd run blog:check`、`npm.cmd run lint` 和 `npm.cmd run build`。

第一版 AI 日报草稿只能保持 `draft/manual-review`。是否每日自动运行、是否接入真实来源抓取和模型生成，需要在后续任务中单独设计和审核。
