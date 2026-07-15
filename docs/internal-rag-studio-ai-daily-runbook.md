# Operator RAG / Studio / AI Daily 验收手册

本手册只描述生产验收动作。不要把 Operator service token、Studio token、数据库 URL、模型 key、RAG token、Access 配置或私有地址写入聊天和仓库。当前人工步骤以 [`docs/manual-gates.md`](./manual-gates.md) 为准。

## 1. 登录泊岸站务

入口：

```text
https://biau.playlab.eu.cc/operator
```

1. 通过 Cloudflare Access 登录 owner 邮箱。
2. 页面应显示“站务服务已连接”，且不要求邀请码、member token 或 admin token。
3. `/operator/settings` 应能读取总览、知识、RAG、记忆、用量和模型通道的低敏状态。

失败分类：

- `401`：Access 身份缺失或 JWT 无效。
- `403`：邮箱不在 owner allow-list，或 Render 拒绝 identity。
- `502/504`：Cloudflare facade 已工作，但 Render Operator 不可达或超时。
- `503`：facade、Operator auth 或数据库尚未配置。

## 2. 同步站务知识

1. 打开 `/operator/settings`，进入“知识”。
2. 创建或编辑公开安全的站务文档；只有 `REVIEWED` / `ACTIVE` 文档进入同步计划。
3. 进入“RAG”，先查看配置和 collection 低敏状态。
4. 点击站务知识同步，等待最近运行变为 `COMPLETED` 且 `accepted=true`。

只记录 document/chunk/issue 数量和安全错误类别。不要记录正文、collection 名、embedding endpoint 或 token。

## 3. 验收 Operator draft-write

使用一个真实任务，例如：

```text
审查当前项目详情页的内容缺口，并创建一篇待审核的项目更新草稿。
```

成功标准：

- LangGraph 返回 planner、grounding、tools 和 guardrail 低敏轨迹。
- 只执行 read / draft-write 工具。
- 返回 `/studio?draft=<id>` artifact。
- 草稿为 `hidden + review-needed`。
- 没有发布、部署、Git 或云平台写入。

## 4. Studio 审核

入口：

```text
https://biau.playlab.eu.cc/studio
```

1. 保存 Studio token 并刷新数据。
2. 从待审核摘要、草稿箱或 Operator artifact 打开草稿。
3. 检查标题、slug、栏目、摘要、正文、来源、配图/流程图、关联项目和敏感信息。
4. 内容不足时保存修改或标记 `needs-changes`。
5. 内容通过后人工审核，再创建 Publish Export。

## 5. AI Daily issue

1. 在来源池创建具体公开来源，记录标题、URL、发布日期、摘要和待核查点。
2. 创建 AI Daily issue，并选择本期来源。
3. 在详情页补齐 summary、publicAngle、keySignals 和 toVerify。
4. 转为 `ai-daily` 草稿并回到 Studio 审核。
5. 未审核前不进入公开博客或助手知识。

## 6. 静态导出

线上服务只创建 export intent。本地或 CI 在私有环境变量中配置 Studio base/token 后执行：

```powershell
npm.cmd run studio:export -- --draft <draft-id-or-slug> --publish-export-id <export-id> --run-checks
```

最后人工检查 Git diff。真实 service URL、token 和生产 ID 不写入文档。
