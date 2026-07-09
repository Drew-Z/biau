# Internal RAG / Studio / AI Daily 验收手册

这份手册用于生产环境浏览器验收。不要把 `ADMIN_TOKEN`、`STUDIO_ADMIN_TOKEN`、数据库连接串、模型 key、RAG token 或后台地址发到聊天里，也不要写进仓库。跨项目人工队列统一记录在 [`docs/manual-gates.md`](./manual-gates.md)。

## 1. 内部知识库同步

入口：

```text
https://biau.playlab.eu.cc/assistant/admin
```

步骤：

1. 在管理页粘贴 `ADMIN_TOKEN`，点击“保存 token”。
2. 页面会自动执行一次“刷新全部状态”；如果 token 已经保存过，点击“API 连接”卡片里的“刷新全部状态”。
3. 这一次刷新会同时读取低敏摘要、成员列表、邀请码列表、内部知识文档、RAG 状态和最近用量。各页签仍会保留自己的错误提示，方便定位是 token、数据库、RAG 还是网络问题。
4. 切到“知识”页签，查看 RAG 管理卡片：
   - `RAG 服务` 应为“已配置”。
   - `同步 token` 应为“已配置”。
   - `公开知识库` 已同步时会显示 `ready · <n> chunks`。
   - `内部知识库` 如果仍是 `empty · 0 chunks`，说明 internal collection 还没有完成入库。
5. 查看“内部知识同步准备度”：
   - `可同步 = 0`：先创建内部知识文档，把状态设为“已审核”或“已启用”。
   - `可同步 > 0`：可以点击“同步内部知识库”。
6. 点击“同步内部知识库”，等待状态文本更新。
7. 页面会刷新内部知识、摘要和 RAG 状态；如果需要定向排障，再分别点击“刷新 RAG 状态”或“刷新知识”。
8. 确认 `内部知识库` 从 `empty · 0 chunks` 变为 `ready · <n> chunks`。

成功标准：

- 最近内部知识同步为 `COMPLETED`。
- `accepted：是`。
- `documentCount` 和 `chunkCount` 大于 0。
- RAG 状态中的 internal collection `pointCount` 大于 0。

如果仍未成功：

- `no-reviewed-internal-documents`：没有 `REVIEWED` / `ACTIVE` 内部文档。
- `rag-sync-not-configured`：internal API 和 RAG Orchestrator 的 `RAG_SYNC_TOKEN` 或 RAG base 配置不一致/未配置。
- `embedding_*` 或 `qdrant_*` 原因：看 Render 的 RAG Orchestrator 环境变量和部署日志，但不要公开真实值。

## 2. 内部成员模型渠道复核

入口：

```text
https://biau.playlab.eu.cc/assistant/admin
```

步骤：

1. 保存 `ADMIN_TOKEN` 后点击“刷新全部状态”。
2. 切到“成员”页签。
3. 确认成员列表里能看到已兑换邀请码的成员；如果刚创建或刚兑换成员但列表没变，优先点“刷新全部状态”，再点“刷新成员”做定向复核。
4. 在“模型渠道”下拉里为成员选择服务端已配置的渠道。
5. 等待状态文本显示“已为 <成员> 分配模型渠道”，并确认成员行里的当前渠道、provider、model 和配置状态已更新。

成功标准：

- 成员列表能显示成员名称、角色、状态、日限额和当前模型渠道。
- 页面只显示渠道 id/label、provider、model、configured / active 状态，不展示 key、base URL、请求头或 provider 响应。
- 成员禁用/启用或渠道切换后，摘要和成员列表不需要整页浏览器刷新即可更新。

如果仍未成功：

- 成员列表为空：确认成员已经使用邀请码兑换，并重新点“刷新全部状态”。
- 渠道显示“未配置”或“已停用”：检查 internal API 的服务端模型渠道环境变量；不要把真实 key、base URL 或模型中转地址发到聊天或写入仓库。
- `unsupported-model-channel`：前端选择的渠道 id 与服务端配置不一致，先重新部署 internal API，再刷新全部状态。

## 3. Studio 生产验收

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

当前低敏记录：

- `/studio` 已完成一次生产浏览器刷新验收，Studio token 可保存并刷新数据。
- Studio API 直连 health、草稿、来源、AI Daily issue 和 publish export 列表均已返回 `200`。
- 仍不要把 token、数据库 URL 或生产请求头写入聊天或仓库；后续只记录草稿 id/slug、状态、可见性和计数等低敏信息。

### 草稿审核路径

当草稿已经存在但不知道从哪里审核时，按这个顺序走：

1. 在 `/studio` 顶部保存 token 并点击“刷新数据”。
2. 看页面第一屏的“审核从草稿箱开始”指引，先确认“Hidden 待审 / 全部待审 / 可导出”和“下一篇待审核”摘要。
3. 如果“下一篇待审核”有内容，点击“打开下一篇待审核”；也可以在左侧“草稿箱”手动点击要审核的草稿。如果是助手创建的草稿，还可以用 `/studio?draft=<draft-id-or-slug>` 定位。
4. 中间“编辑草稿”区域是正文和元数据；检查标题、slug、栏目、标签、摘要、正文、知识点、关联项目、可见性和 `aiAssistance`。
5. 下方“公开文章预览”是访客视角；检查正文结构、来源卡、图片/流程图、项目关联和是否出现敏感信息。
6. 如果需要修改，先点“保存草稿”；如果不适合公开，不要审核通过。
7. 如果内容、来源、可见性和安全边界都通过，点击“审核通过”。
8. 审核状态变成 `approved` 后，再点击“创建导出记录”。

成功标准：

- 草稿状态从 `review-needed` 变为 `approved`。
- Publish Export 列表新增一条记录。
- 只记录低敏信息：草稿 id/slug、栏目、状态、可见性、export id 和检查结果。
- 不把 Studio token、数据库 URL、真实请求头、后台地址或模型渠道写入聊天或仓库。

## 4. 首次 AI Daily issue 到草稿

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

当前低敏记录：

- 首次生产 AI Daily issue 已转换出 hidden/review-needed 草稿。
- 当前 publish export 数量仍为 `0`，公开博客数据尚未由 Studio 自动写入仓库。
- 下一步是人工审阅草稿正文、来源和安全边界；审核通过后再创建 Publish Export，并在本地或 CI 导出公开静态数据。

## 5. 公开导出边界

线上 Studio 服务只记录草稿和发布意图，不直接写 Git 仓库。审核通过后，在本地或 CI 执行导出命令，并审查 Git diff 后再提交：

```powershell
$env:STUDIO_EXPORT_API_BASE="https://<studio-service>.onrender.com"
$env:STUDIO_ADMIN_TOKEN="<owner token>"
npm.cmd run studio:export -- --draft <draft-id-or-slug> --publish-export-id <export-id> --run-checks
```

`<studio-service>`、`<owner token>` 和真实 ID 只在你的终端或平台里填写，不写进文档或聊天。
