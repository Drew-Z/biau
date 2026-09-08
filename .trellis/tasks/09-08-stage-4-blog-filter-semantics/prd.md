# 暴露博客栏目筛选的选中状态

## Goal

Expose existing desktop blog column selection with accessible group and pressed semantics, retaining native buttons, mobile select, URL history and all visible content.

## Requirements

- R1：桌面博客栏目按钮组使用已有“选择知识库栏目”辅助标签；每个原生 button 从 selectedColumn 派生 aria-pressed，始终只有当前栏目为 true。
- R2：保留 Tab、Enter、Space 的原生按钮行为；移动 select、URL、内容、计数、空栏目、排序与样式保持原合同。刷新、复制链接、前进后退和 resize 后状态仍与实际结果一致。
- R3：复用博客专项，为现有矩阵增加语义检查；补充所有栏目与 720/721 边界及键盘断言。使用本地 preview/API fixture，零模型调用。
- Owned：src/components/BlogColumnFilter.tsx、scripts/check-blog-discovery-ui.mjs、相关 component spec、本子任务和父任务资料。
- Forbidden：App/页面/URL 工具、公开数据、public/、server/、CSS、依赖、lockfile、语言翻译、生产请求与发布。

## Acceptance Criteria

- [x] 原 build 的新断言 exit 1，六个按钮的 aria-pressed 均为 null；审计 721/1440 两组 accessible snapshot 也确认无选中状态。
- [x] 当前栏目的语义状态随点击、键盘、历史、刷新、复制地址、空结果和桌面/移动 resize 正确更新，移动原生选择仍有效。
- [x] 博客 URL 合同、专项、lint/build、smoke、完整 UI 和性能检查通过；原有验证与新验证明确区分，保存证据。
- [ ] 精确本地提交、归档并实际返回父任务评估。

## Notes

- 这是单一组件语义修复，采用 PRD-only 小任务。父任务已有持续规划/实施/本地提交授权，主会话负责检查。
- 回滚单位为该子任务提交；不 push/deploy/sign，不改保护快照、不发布内容、不启用 Feed/Cron 或消费 usage reset。
