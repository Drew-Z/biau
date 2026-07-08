# AI 日报内容流水线

AI 日报 / AI Daily 是独立栏目，用来记录短周期 AI 模型、工具、开发平台和工程实践变化。当前推荐路径已经从单个离线草稿脚本升级为 **Studio-first 内部编辑流程**：先维护来源池和单期 issue，再转成隐藏的待审核博客草稿，最后通过静态导出进入公开站。

公开站仍然只读取已审核、已导出的 Git-tracked 内容；数据库里的 AI Daily issue 和草稿不会直接公开。

生产就绪状态、服务分库边界和人工验收顺序见 [`docs/studio-ai-daily-production-readiness.md`](./studio-ai-daily-production-readiness.md)。

## 推荐流程

1. 在 `/studio` 粘贴 Studio 管理 token，进入内容工作台。
2. 在来源池录入公开来源：标题、URL、来源名、source tier、语言、发布时间、摘要和标签。
3. 在“创建日报 Issue”里从“已有来源”下拉选择来源标题，点击“加入本期”，再创建 AI Daily issue。
4. 编辑 issue brief JSON，记录本期摘要、公共角度、关键信号、待核查问题和发布边界。
5. 将 issue 转为内容草稿。系统只创建 `hidden + review-needed + aiAssistance: none` 的 `ai-daily` 草稿。
6. 在 Studio 草稿区继续编辑正文和预览效果，完成来源、事实、版权摘要、敏感信息和栏目适配审核。
7. 审核通过后创建 Publish Export 记录。
8. 在本地或 CI 执行 `studio:export`，把 approved draft 写入公开博客静态数据。
9. 审查 Git diff，通过后提交发布。

这个流程保留人工 review gate，不做无人审核的每日自动发布。

## Studio 后端配置

Studio 推荐使用独立数据库，方便和内部助手数据分开维护：

```text
ASSISTANT_SERVICE_MODE=studio
STUDIO_DATABASE_URL=<studio postgres connection string>
STUDIO_ADMIN_TOKEN=<owner token>
CORS_ORIGIN=<main site origin without trailing slash>
NODE_VERSION=22
```

前端需要指向 Studio 服务：

```text
VITE_STUDIO_API_BASE_URL=https://<studio-service>.onrender.com
```

不要把真实数据库连接串、token、私有 RSS token、模型中转站地址或后台链接写进仓库。首次上线新增 Studio 模型时，需要确认生产 migration 已执行。

## AI Daily issue brief 建议

`briefJson` 应保持为公开安全的 JSON 对象，例如：

```json
{
  "summary": "今天的 AI 信号集中在模型更新、开发工具和工程实践。",
  "publicAngle": "适合面向开发者解释变化的实际影响，不写成新闻速递堆叠。",
  "keySignals": [
    "官方来源发布了新的模型或平台能力",
    "开发工具生态出现可复用实践",
    "需要继续核查价格、可用区域或 API 行为"
  ],
  "toVerify": [
    "确认每条事实都有来源链接",
    "确认没有复制来源长段原文",
    "确认没有把社区传言写成已确认事实"
  ]
}
```

`briefJson` 不能包含 API key、数据库 URL、私有模型渠道、后台地址、账号密码或未公开部署信息。

`/studio/ai-daily/:issueId` 会在 textarea 下方显示本地 brief 质量反馈：

- JSON 格式错误、非对象，或缺少 `summary`、`publicAngle`、`keySignals`、`toVerify` 会阻止保存。
- 字段存在但内容偏薄，例如空摘要、空数组，会显示警告；编辑者可以继续补充，不会被误判成发布完成。
- 已保存的不完整对象会原样显示并提示问题，不会被自动替换成空模板。
- 页面还会显示 issue readiness。进入审核或转为内容草稿前，需要有可审核的 brief、至少 1 个公开来源、有效来源 URL，以及至少 1 个有可转述摘要的来源。
- 普通编辑态可以保存半成品；`review-needed` / `approved` / `published` 状态转换和转草稿由前端与 Studio API 同时守门。

## 离线兼容工具

`npm.cmd run ai-daily:draft` 仍保留，适合把人工整理好的 source JSON 转成 review 草稿，或者在 Studio 不可用时做离线兼容。

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

来源 JSON 必须是公开可审查信息：

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

离线工具不会抓取网页、不会调用模型、不会发布公开内容。

## 模型边界

默认模式是 `Codex-only scaffold/review`，草稿或 issue 转换应记录：

```text
model channel: none
```

如果后续需要模型辅助摘要、初稿或润色，必须先有一次明确的内容任务批准。不要为了“测活”调用模型，也不要运行 provider ping。

私有模型配置仍使用博客模型向导：

```powershell
npm.cmd run blog:model -- setup
npm.cmd run blog:model -- status --all --format markdown
npm.cmd run blog:model -- doctor --all --format markdown
```

默认 `doctor` 是离线配置检查，不发送模型请求，也不应明文回显 API key。只有在用户明确批准具体内容任务时，才可以运行 `doctor --live`、`blog:draft -- --generate`，或未来的 AI Daily 模型摘要命令。

## 发布导出

审核通过后，在 Studio 创建 Publish Export，然后在本地或 CI 执行：

```powershell
$env:STUDIO_EXPORT_API_BASE="https://<studio-service>.onrender.com"
$env:STUDIO_ADMIN_TOKEN="<owner token>"
npm.cmd run studio:export -- --draft <draft-id-or-slug> --publish-export-id <export-id> --run-checks
```

导出器会写入公开博客数据文件，并可回写导出文件列表和检查结果。默认拒绝覆盖已有 slug；确认重写时需要显式 `--force`。

## 发布前检查

- 每条事实都能追溯到来源链接。
- 摘要是转述，不包含大段复制。
- 没有私有链接、密钥、账号、后台路径或未公开部署细节。
- 没有把样例草稿包装成真实自动日报。
- 没有夸大来源原文，例如“首个”“最强”“彻底替代”。
- AI 辅助方式被标记为 `none`、`summary-assisted`、`draft-assisted` 或 `polish-assisted`。
- 通过 `blog:audit`、`blog:check`、`lint`、`build`，必要时通过 `studio:export -- --sample --dry-run`。

推荐检查命令：

```powershell
npm.cmd run studio:ai-daily-brief-check
npm.cmd run studio:smoke
npm.cmd run studio:export -- --sample --dry-run
npm.cmd run blog:audit
npm.cmd run blog:check
npm.cmd run lint
npm.cmd run build
```

`studio:ai-daily-brief-check` 会验证 issue brief 的默认模板、完整样例、错误 JSON、不完整对象和格式化行为。`studio:smoke` 是默认的无 live 检查入口：它会把 AI Daily 样例草稿写入系统临时目录并自动清理，不会在 `content-drafts/` 留下 smoke 副本，也不会调用模型或抓取网页。

是否每日自动抓取来源、是否自动创建 issue、是否接入真实模型生成，都属于后续单独任务和人工 gate。
