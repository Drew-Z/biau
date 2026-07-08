# Internal RAG / Studio / AI Daily 验收手册

这份手册用于生产环境浏览器验收。不要把 `ADMIN_TOKEN`、`STUDIO_ADMIN_TOKEN`、数据库连接串、模型 key、RAG token 或后台地址发到聊天里，也不要写进仓库。

## 1. 内部知识库同步

入口：

```text
https://biau.playlab.eu.cc/assistant/admin
```

步骤：

1. 在管理页粘贴 `ADMIN_TOKEN`，点击“保存 token”。
2. 切到“知识”页签。
3. 点击“刷新 RAG 状态”。
4. 查看 RAG 管理卡片：
   - `RAG 服务` 应为“已配置”。
   - `同步 token` 应为“已配置”。
   - `公开知识库` 已同步时会显示 `ready · <n> chunks`。
   - `内部知识库` 如果仍是 `empty · 0 chunks`，说明 internal collection 还没有完成入库。
5. 点击“刷新知识”，查看“内部知识同步准备度”：
   - `可同步 = 0`：先创建内部知识文档，把状态设为“已审核”或“已启用”。
   - `可同步 > 0`：可以点击“同步内部知识库”。
6. 点击“同步内部知识库”，等待状态文本更新。
7. 再点击“刷新 RAG 状态”，确认 `内部知识库` 从 `empty · 0 chunks` 变为 `ready · <n> chunks`。

成功标准：

- 最近内部知识同步为 `COMPLETED`。
- `accepted：是`。
- `documentCount` 和 `chunkCount` 大于 0。
- RAG 状态中的 internal collection `pointCount` 大于 0。

如果仍未成功：

- `no-reviewed-internal-documents`：没有 `REVIEWED` / `ACTIVE` 内部文档。
- `rag-sync-not-configured`：internal API 和 RAG Orchestrator 的 `RAG_SYNC_TOKEN` 或 RAG base 配置不一致/未配置。
- `embedding_*` 或 `qdrant_*` 原因：看 Render 的 RAG Orchestrator 环境变量和部署日志，但不要公开真实值。

## 2. Studio 生产验收

入口：

```text
https://biau.playlab.eu.cc/studio
```

步骤：

1. 粘贴 `STUDIO_ADMIN_TOKEN`，点击“保存并连接”。
2. 确认页面顶部显示：
   - `API base 已配置`。
   - `数据库在线`。
3. 确认草稿箱、来源池、AI 日报 issue 和发布导出记录能刷新。
4. 如果助手创建过 Studio 草稿，使用 `/studio?draft=<draft-id>` 打开并确认能定位同一条草稿。

成功标准：

- Studio health 可读。
- 草稿列表可读。
- 新建/编辑草稿能保存为内部数据库记录。
- 审核和 Publish Export 仍需要人工确认，不会自动公开。

如果 `/studio/api/health` 未带 token 返回 `missing-studio-token`，这是正常门禁，不代表 Studio 坏了。

## 3. 首次 AI Daily issue 到草稿

入口：

```text
https://biau.playlab.eu.cc/studio
```

步骤：

1. 在 Studio 里先创建或确认来源池条目，来源必须是公开 URL，摘要和影响说明要人工可核查。
2. 在“创建日报 Issue”里从“已有来源”下拉选择来源标题，点击“加入本期”，确认“本期已选来源”列表正确。
3. 创建 AI Daily issue。
4. 打开 `/studio/ai-daily/<issue-id>`。
5. 填写或套用 brief JSON，至少补齐：
   - `summary`
   - `publicAngle`
   - `keySignals`
   - `toVerify`
6. 如需补充来源，继续在详情页选择本期来源并保存 Issue。
7. 页面显示 Issue 满足审核入口后，点击“进入审核”。
8. 点击“转为内容草稿”。
9. 回到 `/studio` 草稿箱继续预览和人工审核。

成功标准：

- 转换出来的草稿是 `ai-daily` 栏目。
- 状态是 `review-needed`。
- 可见性是 `hidden`。
- `aiAssistance` 是 `none`，表示没有模型自动润色或摘要。
- 公开发布仍需人工审核并执行 static export。

## 4. 公开导出边界

线上 Studio 服务只记录草稿和发布意图，不直接写 Git 仓库。审核通过后，在本地或 CI 执行导出命令，并审查 Git diff 后再提交：

```powershell
$env:STUDIO_EXPORT_API_BASE="https://<studio-service>.onrender.com"
$env:STUDIO_ADMIN_TOKEN="<owner token>"
npm.cmd run studio:export -- --draft <draft-id-or-slug> --publish-export-id <export-id> --run-checks
```

`<studio-service>`、`<owner token>` 和真实 ID 只在你的终端或平台里填写，不写进文档或聊天。
