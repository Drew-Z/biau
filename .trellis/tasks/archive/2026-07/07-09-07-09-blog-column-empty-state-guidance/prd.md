# Blog column empty-state guidance

## Goal

让 `/blog` 的空栏目不再只显示通用“整理中”文案，而是给出按栏目定制的公开、安全、可行动说明。尤其是 `AI 日报` 和 `资源分享` 当前没有公开文章时，访客应能理解内容处于审核/首发准备或人工精选阶段，而不是误以为页面坏了、数据丢了或功能未接入。

## Requirements

- `BlogColumn` 的空状态说明应来自共享数据/辅助函数，避免在页面组件里散落 ad hoc 文案。
- 搜索或筛选无结果时，仍应保留面向当前查询的“没有匹配结果”语义，不要把它误说成栏目尚未首发。
- `AI 日报` 空状态应说明：已有 Studio-first 生产链路，公开展示需要人工审核、Publish Export 和 Git diff 审查。
- `资源分享` 空状态应说明：该栏目用于人工精选资源，不自动填充链接列表，首发需要真实使用判断和公开安全检查。
- `项目总结` 空状态应避免和项目详情页重复，说明它适合沉淀跨项目复盘、版本演进和公开可读的技术案例补充。
- 文案不能包含真实 token、数据库 URL、模型中转地址、后台密码、未公开草稿正文或敏感平台信息。
- UI 检查应覆盖空栏目的可见性和栏目定制说明，防止后续又退回通用空状态。

## Acceptance Criteria

- [ ] `/blog` 全部公共栏目保持可见，空栏目显示栏目定制空状态。
- [ ] 输入搜索词后没有结果时，显示查询无匹配说明，而不是栏目首发说明。
- [ ] `AI 日报` 和 `资源分享` 的空状态包含明确的下一步边界，但不泄露内部凭据或草稿内容。
- [ ] 相关 Playwright/UI 检查从共享数据或稳定页面标记推导断言，避免硬编码脆弱计数。
- [ ] `npm.cmd run blog:audit`、`npm.cmd run blog:check`、`npm.cmd run lint`、`npm.cmd run build`、`npm.cmd run check:ui` 通过。

## Notes

- 这是父任务 `.trellis/tasks/07-08-production-acceptance-manual-gates-closure` 下的轻量子任务。
- 不改变博客发布状态，不把 hidden/review-needed 内容提升为公开内容。
