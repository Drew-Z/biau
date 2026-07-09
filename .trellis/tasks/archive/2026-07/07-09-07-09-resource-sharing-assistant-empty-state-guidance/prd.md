# Resource sharing public assistant empty-state guidance

## Goal

让公开助手能够正确回答“资源分享”栏目当前为什么没有公开文章、在哪里查看、是否会自动生成链接清单等问题，并避免被刚新增的 AI 日报空状态知识项误命中。

## Requirements

- 新增或完善资源分享栏目相关的公开知识项，说明：
  - 资源分享是人工精选栏目，不是自动批量生成的链接清单。
  - 当前没有公开文章时，是因为条目需要真实使用判断、适用场景、使用边界、公开安全检查和人工审核。
  - 公开路径应与 Studio 草稿、人工审核、Publish Export、静态导出、Git diff 审查和博客质量检查保持一致。
- 调整 AI 日报知识项的检索加权，只有问题明确提到 AI 日报 / AI Daily / 日报时才强命中，不能吞掉资源分享、知识积累或其他博客栏目问题。
- 前端本地 fallback、Express server、Cloudflare Function 三个公开助手检索面保持同构行为。
- 增加离线评测，覆盖资源分享空状态、栏目位置和“是否自动生成链接清单”的问题；保留现有 AI 日报评测通过。
- 不调用真实模型，不读取或提交任何 token / API key / 数据库 URL。

## Acceptance Criteria

- [x] 资源分享相关问题的检索 citation 包含资源分享知识项，不再首选 `site:ai-daily`。
- [x] AI 日报相关问题仍能命中 `site:ai-daily` 并解释 Studio-first 公开路径。
- [x] `npm.cmd run assistant:index` 通过并刷新公开知识索引。
- [x] `npm.cmd run assistant:eval` 通过且 `modelCalls=0`。
- [x] `npm.cmd run assistant:kg-check`、`npm.cmd run server:build`、`npm.cmd run cf-assistant:smoke`、`npm.cmd run lint`、`npm.cmd run build` 通过。
- [x] 父任务 implement 记录本次低敏进展与后续人工事项。

## Notes

- This is a lightweight child task under `07-08-production-acceptance-manual-gates-closure`.
- Manual gates are unchanged: resource share publication still requires human editorial review and public-safe evidence.
